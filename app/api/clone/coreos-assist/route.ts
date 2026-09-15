// Core OS「AIと対話して下書き」の生成 API。
// 会員の数問の回答を受け取り、そのセクションのフォーム欄の下書き（JSON）を生成して返す。
// 書き込みはしない（クライアントがフォームに入れて、本人が確認して保存ボタンで確定する）。

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { getAssistConfig } from "@/lib/ai-clone/coreOsAssist";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let body: { slug?: string; section?: string; answers?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim();
  const section = (body.section ?? "").trim();
  const answers = body.answers ?? {};

  const config = getAssistConfig(section);
  if (!slug || !config) {
    return NextResponse.json({ error: "対象が不正です" }, { status: 400 });
  }

  // member 認可
  const { data: tenant } = await supabase
    .from("ai_clone_tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) {
    return NextResponse.json({ error: "テナントが見つかりません" }, { status: 404 });
  }
  const { data: member } = await supabase
    .from("ai_clone_tenant_members")
    .select("user_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AIが未設定です" }, { status: 503 });
  }

  const answerBlock = config.questions
    .map((q) => `- ${q.label}\n  → ${(answers[q.key] ?? "").trim() || "（未回答）"}`)
    .join("\n");
  const fieldsSpec = config.fields
    .map((f) => `  "${f.key}": "${f.desc}"`)
    .join(",\n");

  try {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: `あなたは経営者の右腕として、本人の回答をもとに Core OS の下書きを作ります。
- 本人の回答（言葉・温度感）を尊重し、自然な日本語で簡潔に。盛らない・きれいごとにしない。
- 回答に書かれていない事実は創作しない。情報が薄い項目は無理に埋めず空文字 "" にする。
- 各項目は1〜2文。カンマ区切り指定の項目は「A, B, C」の形で。
- 出力は次のキーだけを持つ JSON オブジェクト：
{
${fieldsSpec}
}`,
        },
        {
          role: "user",
          content: `# 本人の回答\n${answerBlock}\n\n上記をもとに、指定キーの JSON で下書きを作ってください。`,
        },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "下書きの生成に失敗しました" }, { status: 500 });
    }

    // 許可キーだけ・文字列だけに整形
    const draft: Record<string, string> = {};
    for (const f of config.fields) {
      const v = parsed[f.key];
      if (typeof v === "string" && v.trim().length > 0) {
        draft[f.key] = v.trim();
      }
    }
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("[coreos-assist] 生成失敗:", err);
    return NextResponse.json({ error: "下書きの生成に失敗しました" }, { status: 500 });
  }
}
