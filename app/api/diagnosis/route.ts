// 売上ボトルネック診断の送信＝保存（即時・AIなし）。
// 採点はサーバ側で再計算して保存値の整合を担保し、行 id を返す。
// AIレポート生成は別エンドポイント（/api/diagnosis/report）が結果表示後のボタンで叩く。

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scoreDiagnosis, type Answers } from "@/lib/diagnosis/score";

export const runtime = "nodejs";

function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[diagnosis] Supabase service role 未設定。保存をスキップします。");
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let body: {
    name?: string;
    email?: string;
    company?: string;
    industry?: string;
    revenue?: string;
    profit?: string;
    budget?: string;
    worry?: string;
    answers?: Answers;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const company = (body.company ?? "").trim();
  const industry = (body.industry ?? "").trim();
  const revenue = (body.revenue ?? "").trim();
  const profit = (body.profit ?? "").trim();
  const budget = (body.budget ?? "").trim();
  const worry = (body.worry ?? "").trim();
  const answers = body.answers;

  if (!name || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "お名前と正しいメールアドレスを入力してください" },
      { status: 400 }
    );
  }
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "回答が不正です" }, { status: 400 });
  }

  const result = scoreDiagnosis(answers);
  let id: string | null = null;

  const admin = adminSupabase();
  if (admin) {
    const scores = Object.fromEntries(
      result.dimensions.map((d) => [d.key, d.score])
    );
    const { data, error } = await admin
      .from("diagnosis_submissions")
      .insert({
        name,
        email,
        company: company || null,
        industry: industry || null,
        revenue_range: revenue || null,
        profit_range: profit || null,
        budget_range: budget || null,
        answers,
        scores,
        total: result.total,
        grade: result.rank,
        bottleneck_key: result.bottleneck.key,
        supply_gate: result.supply.active,
        worry: worry || null,
      })
      .select("id")
      .single();
    if (error) console.error("[diagnosis] 保存失敗:", error.message);
    else id = (data?.id as string) ?? null;
  }

  return NextResponse.json({ id, result });
}
