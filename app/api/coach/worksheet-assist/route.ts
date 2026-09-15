// 紹介設計ワークシート「コーチと磨く」の生成 API。
// 1項目の現状記入を受け取り、紹介コーチとして「深掘りの問い2つ＋改善した記入案1つ」を返す。
// 書き込みはしない（クライアントが採用してフォームに入れ、既存の自動保存で確定する）。

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { WORKSHEETS } from "@/lib/coach/worksheet-schema";

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

  let body: { fieldId?: string; currentValue?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const fieldId = (body.fieldId ?? "").trim();
  const currentValue = (body.currentValue ?? "").trim();

  // 対象フィールド＋所属シートを worksheet-schema から特定
  let field: { label: string; hint: string; example: string } | null = null;
  let sheetTitle = "";
  for (const ws of WORKSHEETS) {
    const f = ws.fields.find((x) => x.id === fieldId);
    if (f) {
      field = { label: f.label, hint: f.hint, example: f.example };
      sheetTitle = ws.title;
      break;
    }
  }
  if (!field) {
    return NextResponse.json({ error: "対象が不正です" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AIが未設定です" }, { status: 503 });
  }

  try {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: `あなたは紹介設計のプロのコーチです。経営者が「人から紹介されやすくなる」ためのワークシートを一緒に磨きます。
対象項目：「${field.label}」（シート：${sheetTitle}）
この項目のねらい：${field.hint}
良い記入例：${field.example}

やること：本人の現状の記入を読み、
(1) もう一段 具体化・差別化するための「深掘りの問い」を2つ、
(2) 本人の言葉を尊重した「改善した記入案」を1つ 作る。
- 改善案は1〜3文。盛らない・きれいごとにしない。本人が書いていない事実は創作しない。
- 現状が空なら、ねらいと例を踏まえた「書き出しの叩き台」を改善案にし、問いは書き始めを助けるものにする。
- 出力は次のキーだけの JSON：{"questions": ["問い1", "問い2"], "draft": "改善した記入案"}`,
        },
        {
          role: "user",
          content: `# 現状の記入\n${currentValue || "（未記入）"}\n\n上記を踏まえ、JSON で深掘りの問い2つと改善案を返してください。`,
        },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    let parsed: { questions?: unknown; draft?: unknown } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "生成に失敗しました" }, { status: 500 });
    }
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .slice(0, 3)
      : [];
    const draft = typeof parsed.draft === "string" ? parsed.draft.trim() : "";
    return NextResponse.json({ questions, draft });
  } catch (err) {
    console.error("[worksheet-assist] 生成失敗:", err);
    return NextResponse.json({ error: "生成に失敗しました" }, { status: 500 });
  }
}
