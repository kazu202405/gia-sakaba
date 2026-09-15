// 管理者専用：会員の tier を手動で上書きする。
//
// 動作:
//   1. 認証 + is_admin チェック
//   2. body から applicantId と新 tier、理由（任意）を受け取り
//   3. applicants.tier を更新
//   4. activity_log に変更を記録（actor / 旧値 / 新値 / 理由）
//
// 想定ユースケース:
//   - テスト用のロール強制（paid を手動で当てる）
//   - 解約済みだが手動で paid に戻す（特例）
//   - 不正な paid を tentative に降格
//
// ⚠️ Stripe サブスク状態とは独立して動くので、整合性に注意。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_TIERS = ["tentative", "registered", "paid"] as const;
type Tier = (typeof VALID_TIERS)[number];

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ログインが必要です" },
      { status: 401 },
    );
  }

  const { data: adminCheck, error: adminErr } = await supabase.rpc("is_admin");
  if (adminErr || adminCheck !== true) {
    return NextResponse.json(
      { error: "管理者権限が必要です" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { applicantId?: string; tier?: string; reason?: string }
    | null;

  const applicantId = body?.applicantId;
  const newTier = body?.tier as Tier | undefined;
  const reason = body?.reason ?? null;

  if (!applicantId || !newTier || !VALID_TIERS.includes(newTier)) {
    return NextResponse.json(
      { error: "applicantId と有効な tier が必要です" },
      { status: 400 },
    );
  }

  // 旧値を取得（ログ用）
  const { data: current, error: cErr } = await supabase
    .from("applicants")
    .select("tier")
    .eq("id", applicantId)
    .single();

  if (cErr || !current) {
    return NextResponse.json(
      { error: "該当する会員が見つかりません" },
      { status: 404 },
    );
  }

  const oldTier = current.tier as Tier;

  if (oldTier === newTier) {
    return NextResponse.json(
      { ok: true, message: "変更なし" },
      { status: 200 },
    );
  }

  // tier 更新
  const { error: uErr } = await supabase
    .from("applicants")
    .update({ tier: newTier })
    .eq("id", applicantId);

  if (uErr) {
    return NextResponse.json(
      { error: `tier 更新に失敗：${uErr.message}` },
      { status: 500 },
    );
  }

  // activity_log に記録（失敗しても tier 変更は維持、ログ欠落を console に残す）
  const { error: lErr } = await supabase.from("activity_log").insert({
    actor_id: user.id,
    subject_type: "applicant",
    subject_id: applicantId,
    action: "tier_change",
    details: {
      old_tier: oldTier,
      new_tier: newTier,
      reason: reason,
    },
  });

  if (lErr) {
    console.warn(
      "[admin/tier] activity_log 書き込み失敗:",
      lErr.message,
      { applicantId, oldTier, newTier },
    );
  }

  return NextResponse.json({
    ok: true,
    oldTier,
    newTier,
  });
}
