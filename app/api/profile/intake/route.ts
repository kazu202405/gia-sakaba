// 本人専用：数問の会話的な回答から、相互開示プロフィール23項目の「下書き」を
// AI が一気に生成して返す（保存はしない＝クライアントが空欄に反映 → 既存の
// /api/profile/save で保存する）。0 から 23 個の空欄を埋めさせる負担を、
// 「4問に答える → AI が下書き → 添削」に置き換えるためのエンドポイント。
//
// 入力: { answers: { work, story, connect, personality } }（各フリーテキスト）
// 出力: { ok: true, draft: { <fieldKey>: string, ... } }
//   draft には「重い自由文」項目だけを入れる（基本情報・連絡先は手入力のまま）。
//
// 方針: 回答に書かれていないことは創作しない（空文字）。一人称・自然な日本語。

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

// AI が下書きを入れてよい項目（save 側の whitelist のサブセット）。
const DRAFTABLE_FIELDS = [
  "role_title",
  "job_title",
  "headline",
  "services_summary",
  "genre",
  "location",
  "story_origin",
  "story_turning_point",
  "story_now",
  "story_future",
  "want_to_connect_with",
  "status_message",
  "favorites",
  "current_hobby",
  "school_days_self",
  "personal_values",
] as const;
type DraftField = (typeof DRAFTABLE_FIELDS)[number];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI下書きは現在利用できません（設定不足）" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    answers?: {
      work?: string;
      story?: string;
      connect?: string;
      personality?: string;
    };
  } | null;
  const a = body?.answers ?? {};
  const work = (a.work ?? "").trim();
  const story = (a.story ?? "").trim();
  const connect = (a.connect ?? "").trim();
  const personality = (a.personality ?? "").trim();
  if (!work && !story && !connect && !personality) {
    return NextResponse.json(
      { error: "回答が空です。1つ以上答えてください。" },
      { status: 400 },
    );
  }

  const prompt = `あなたは、本人へのインタビュー回答から「相互開示プロフィール」の下書きを作るアシスタントです。
本人になりきり、自然な一人称の日本語で各項目を書きます。
【厳守】回答に書かれていない事実は創作しない。情報が無い項目は空文字 "" にする。誇張・盛りは禁止。

本人の回答:
- 仕事について: """${work || "（未回答）"}"""
- 経緯・転機・これから: """${story || "（未回答）"}"""
- つながりたい人: """${connect || "（未回答）"}"""
- 人柄（好き・趣味・価値観・学生時代など）: """${personality || "（未回答）"}"""

次の各項目の下書きを JSON で返す（値は文字列。該当情報が無ければ ""）:
{
  "role_title": "肩書（短く。例: 補助金コンサルタント）",
  "job_title": "職種・職業（短く）",
  "headline": "ヘッドライン＝誰に何を提供するかの一文（30〜50字目安）",
  "services_summary": "提供サービスの概要（2〜3文）",
  "genre": "ジャンル（短く。例: 士業 / 飲食 / IT）",
  "location": "活動地域（書かれていれば。例: 大阪）",
  "story_origin": "ストーリー：原点・きっかけ（2〜4文）",
  "story_turning_point": "ストーリー：転機（2〜4文）",
  "story_now": "ストーリー：今やっていること（2〜4文）",
  "story_future": "ストーリー：これから・目指す未来（2〜4文）",
  "want_to_connect_with": "つながりたい人（具体的に。2〜3文）",
  "status_message": "一言ステータス（短く。人柄が出る一言）",
  "favorites": "好きなもの",
  "current_hobby": "最近の趣味",
  "school_days_self": "学生時代の自分",
  "personal_values": "大事にしている価値観（2〜3文）"
}`;

  let raw: string | null = null;
  try {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 1200,
    });
    raw = res.choices[0]?.message?.content ?? null;
  } catch (e) {
    console.error("[profile/intake] AI失敗:", e);
    return NextResponse.json(
      { error: "AI下書きの生成に失敗しました。少し待って再度お試しください。" },
      { status: 502 },
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch {
    return NextResponse.json(
      { error: "AI下書きの解析に失敗しました。" },
      { status: 502 },
    );
  }

  // whitelist でフィルタ＋trim。空文字は落とす（空欄を上書きしないため）。
  const draft: Partial<Record<DraftField, string>> = {};
  for (const field of DRAFTABLE_FIELDS) {
    const v = parsed[field];
    if (typeof v === "string" && v.trim().length > 0) {
      draft[field] = v.trim();
    }
  }

  return NextResponse.json({ ok: true, draft });
}
