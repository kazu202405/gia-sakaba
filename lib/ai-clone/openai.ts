import { getOpenAIClient, resolveModel } from "@/lib/openai/client";
import type { CalendarEvent, RelatedDoc, BriefingItem } from "./types";

export interface PastMeeting {
  personName: string;
  title: string;
  date: string;
  nextActions: string;
}

// 1イベントについて「資料が十分か」をAIに判定させる
export async function judgeEventReadiness(
  event: CalendarEvent,
  docs: RelatedDoc[],
  context: string,
  pastMeetings: PastMeeting[] = []
): Promise<Pick<BriefingItem, "status" | "reason" | "recommendedAction">> {
  const client = getOpenAIClient();
  if (!client) {
    // APIキー未設定時は機械判定（資料が0件なら missing、それ以上は ready）
    return docs.length === 0
      ? {
          status: "missing",
          reason: "関連資料が見つかりません（AI未接続のため簡易判定）",
        }
      : { status: "ready" };
  }

  const docsList =
    docs.length > 0
      ? docs.map((d) => `- ${d.name} (${d.url})`).join("\n")
      : "（資料なし）";

  const pastList =
    pastMeetings.length > 0
      ? pastMeetings
          .map(
            (m) =>
              `- ${m.personName} / ${m.date} 「${m.title}」 ネクスト: ${m.nextActions || "—"}`
          )
          .join("\n")
      : "（過去履歴なし）";

  const prompt = `# 経営コンテキスト
${context}

# 今日の予定（1件）
タイトル: ${event.summary}
時間: ${event.start} 〜 ${event.end}
場所: ${event.location || "—"}
参加者: ${(event.attendees || []).map((a) => a.displayName || a.email).join(", ") || "—"}
詳細: ${event.description || "—"}

# 検出された関連資料
${docsList}

# 参加者の過去打合せ履歴（Notionから自動取得）
${pastList}

# あなたへの問い
この打合せに必要な資料・情報が揃っていますか？
以下のいずれかで answer してください：
- "ready": 資料が十分、追加準備不要
- "missing": 重要資料が見つからない、担当者に資料準備を依頼すべき
- "warning": 一部足りない、または要確認

過去履歴がある場合、reason に「前回 ○○ と話した文脈で…」と前回の続きを意識した助言を入れてください。
reason は60字以内、recommendedAction は80字以内（必要なときのみ）。

JSONで返してください：
{ "status": "ready" | "missing" | "warning", "reason": "...", "recommendedAction": "..." }`;

  try {
    const res = await client.chat.completions.create({
      model: resolveModel(),
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const content = res.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      status:
        parsed.status === "ready" ||
        parsed.status === "missing" ||
        parsed.status === "warning"
          ? parsed.status
          : "warning",
      reason: parsed.reason || undefined,
      recommendedAction: parsed.recommendedAction || undefined,
    };
  } catch (err) {
    console.error("[ai-clone] AI判定失敗:", err);
    return { status: "warning", reason: "AI判定エラー" };
  }
}

// 全予定の俯瞰サマリーをAIに作らせる
export async function summarizeBriefing(
  items: BriefingItem[],
  context: string
): Promise<string> {
  const client = getOpenAIClient();
  if (!client || items.length === 0) {
    return items.length === 0
      ? "今日は予定がありません。"
      : `今日は ${items.length} 件の予定。準備不足: ${items.filter((i) => i.status === "missing").length} 件。`;
  }

  const eventsList = items
    .map(
      (i, idx) =>
        `${idx + 1}. [${i.status}] ${i.event.summary} (${i.event.start})${i.reason ? ` — ${i.reason}` : ""}`
    )
    .join("\n");

  const prompt = `# 経営コンテキスト
${context}

# 今日の予定一覧
${eventsList}

# あなたへの問い
CEO向けに「今日のポイント」を3〜4文で書いてください。
- 重要な打合せの前提・準備不足の指摘
- 「今日のCEOの本来集中すべきこと」を一言

口調は端的・落ち着いた専門家。絵文字は使わない。`;

  try {
    const res = await client.chat.completions.create({
      model: resolveModel(),
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
    });
    return res.choices[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("[ai-clone] サマリー生成失敗:", err);
    return `今日は ${items.length} 件の予定があります。`;
  }
}
