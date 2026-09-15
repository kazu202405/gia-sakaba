// 紹介コーチ chat の API route（Phase C: 実 OpenAI 接続 + streaming）。
//
// 役割:
//   1. ログインユーザーを認可（applicants にいることを確認）
//   2. ユーザーの紹介設計ワークシート + applicants 抜粋を読む
//   3. system prompt を動的に組み立て（lib/coach/system-prompt.ts）
//   4. OpenAI Chat Completions（stream: true）に投げ、トークンを順次返す
//
// レスポンス形式:
//   text/plain で生のテキストチャンクを順次 enqueue。
//   クライアント側 (CoachChat) は ReadableStream を逐次読み取り、
//   assistant メッセージの content を inkremental に書き換える。
//
// 環境変数:
//   - OPENAI_API_KEY  必須（lib/openai/client.ts で集約）
//   - OPENAI_MODEL    任意（同上、未指定なら gpt-4o-mini）
//
// Runtime:
//   nodejs を明示。Supabase server client + openai SDK の安定実行のため。

import { createClient } from "@/lib/supabase/server";
import { loadWorksheet, updateWorksheetField } from "@/lib/coach/worksheet-storage";
import { WORKSHEETS } from "@/lib/coach/worksheet-schema";
import { buildSystemPrompt } from "@/lib/coach/system-prompt";
import { buildCoachTenantContext } from "@/lib/coach/tenant-context";
import { resolveTenantForOwner } from "@/lib/ai-clone/supabase-db";
import { appendCoachMessages } from "@/lib/coach/coach-history";
import { getOpenAIClient, resolveModel } from "@/lib/openai/client";

export const runtime = "nodejs";
// AI 応答は streaming で 30 秒超になり得るため、関数の最大実行時間を伸ばす。
export const maxDuration = 60;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  // 1. 認可
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. リクエストボディ
  let body: { messages?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
  // 念のため: greeting メッセージ（既知の固定文言）が混ざっても system に重複させない。
  // クライアント側で送らない設計だが、防御として弾く。
  const userMessages = incomingMessages.filter(
    (m) =>
      m &&
      typeof m.content === "string" &&
      m.content.trim().length > 0 &&
      (m.role === "user" || m.role === "assistant"),
  );

  if (userMessages.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  // 3. ユーザー文脈の取得（並列）
  const [worksheet, applicantRes] = await Promise.all([
    loadWorksheet(supabase, user.id),
    supabase
      .from("applicants")
      .select("name, nickname, services_summary")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const applicant = applicantRes.data as
    | { name: string | null; nickname: string | null; services_summary: string | null }
    | null;

  const callName =
    applicant?.nickname?.trim() || applicant?.name?.trim() || null;
  const servicesSummary = applicant?.services_summary?.trim() || null;

  // 3b. 右腕AI（22DB）連携：owner テナントを持ち、連携 ON のときだけ
  //     本人の Memory 層（人物・会話ログ・タスク）をコンテキストに読み込む。
  //     990円会員・未課金・連携OFF のときは null のまま（= worksheet のみの素コーチ）。
  // 今回の新しいユーザー発話（履歴保存・人物名抽出の起点）
  const newUserContent =
    [...userMessages].reverse().find((m) => m.role === "user")?.content ?? "";

  // owner テナントがあれば会話履歴を保存する（4,980円＝記憶する右腕）。
  // 連携トグル(coachLinkEnabled)は「22DBを読むか」だけに効き、履歴保存は常に行う。
  let tenantContext: string | null = null;
  let saveTenantId: string | null = null;
  try {
    const tenant = await resolveTenantForOwner(user.id);
    if (tenant) {
      saveTenantId = tenant.id;
      if (tenant.coachLinkEnabled && newUserContent) {
        tenantContext = await buildCoachTenantContext(tenant.id, newUserContent);
      }
    }
  } catch (err) {
    // 連携読み込みの失敗はコーチ本体を止めない（素のコーチにフォールバック）。
    console.error("[coach/chat] tenant context 構築失敗:", err);
  }

  // 4. system prompt 構築
  const systemPrompt = buildSystemPrompt({
    callName,
    servicesSummary,
    worksheet,
    tenantContext,
  });

  // 5. OpenAI streaming
  const openai = getOpenAIClient();
  if (!openai) {
    return new Response(
      "OpenAI が未設定です。OPENAI_API_KEY を環境変数に追加してください。",
      { status: 503 },
    );
  }
  const encoder = new TextEncoder();
  const baseMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...userMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // ワークシート項目を磨いて保存するためのツール。ユーザーがOKした時だけ呼ばれる。
  const tools: any[] = [
    {
      type: "function",
      function: {
        name: "update_worksheet_field",
        description:
          "紹介設計ワークシートの1項目を保存（更新）する。ユーザーが改善案に同意して「保存して」等と言った時だけ呼ぶ。",
        parameters: {
          type: "object",
          properties: {
            field_id: {
              type: "string",
              description:
                "更新する項目ID（ws01_01〜ws03_05）。system の対応表を使う",
            },
            value: { type: "string", description: "保存する新しい本文" },
          },
          required: ["field_id", "value"],
        },
      },
    },
  ];

  let fullAnswer = "";
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messages: any[] = [...baseMessages];
        // 最大2巡：1巡目で tool_call が来たら保存を実行→2巡目で確認文を流す。
        for (let turn = 0; turn < 2; turn++) {
          const stream = await openai.chat.completions.create({
            model: resolveModel(),
            messages,
            tools,
            stream: true,
            temperature: 0.7,
          });
          let content = "";
          const toolAccum: Record<
            number,
            { id: string; name: string; args: string }
          > = {};
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              content += delta.content;
              fullAnswer += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }
            for (const tc of delta?.tool_calls ?? []) {
              const i = tc.index ?? 0;
              if (!toolAccum[i]) toolAccum[i] = { id: "", name: "", args: "" };
              if (tc.id) toolAccum[i].id = tc.id;
              if (tc.function?.name) toolAccum[i].name = tc.function.name;
              if (tc.function?.arguments)
                toolAccum[i].args += tc.function.arguments;
            }
          }
          const calls = Object.values(toolAccum);
          if (calls.length === 0) break; // 通常応答で完了

          messages.push({
            role: "assistant",
            content: content || null,
            tool_calls: calls.map((c) => ({
              id: c.id,
              type: "function",
              function: { name: c.name, arguments: c.args },
            })),
          });
          for (const c of calls) {
            let result = "保存に失敗しました";
            if (c.name === "update_worksheet_field") {
              try {
                const parsed = JSON.parse(c.args || "{}");
                const fieldId =
                  typeof parsed.field_id === "string" ? parsed.field_id : "";
                const value =
                  typeof parsed.value === "string" ? parsed.value : "";
                const valid = WORKSHEETS.some((ws) =>
                  ws.fields.some((f) => f.id === fieldId),
                );
                if (valid && value.trim()) {
                  const r = await updateWorksheetField(
                    supabase,
                    user.id,
                    fieldId,
                    value,
                  );
                  result = r.ok ? "保存しました" : `保存失敗: ${r.error ?? ""}`;
                } else {
                  result = "項目IDか本文が不正です";
                }
              } catch {
                result = "引数の解析に失敗しました";
              }
            }
            messages.push({ role: "tool", tool_call_id: c.id, content: result });
          }
        }
      } catch (err) {
        // streaming 中の失敗はエラーマークを末尾に流して閉じる
        console.error("[coach/chat] stream error:", err);
        controller.enqueue(
          encoder.encode("\n\n[エラー：応答の生成中に問題が発生しました]"),
        );
      } finally {
        controller.close();
        // 4,980円（owner テナント有）なら今回の往復を Supabase に保存（次回・別端末で続く）。
        if (saveTenantId && newUserContent && fullAnswer.trim()) {
          await appendCoachMessages(supabase, saveTenantId, [
            { role: "user", content: newUserContent },
            { role: "assistant", content: fullAnswer },
          ]).catch(() => {});
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
