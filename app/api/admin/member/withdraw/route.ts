// 管理者専用：会員の退会 / 再入会（ステータス変更）。
//
// 動作:
//   1. 認証 + is_admin チェック
//   2. withdraw=true  → applicants.withdrawn_at=now + Stripe サブスク解約（あれば）
//      withdraw=false → applicants.withdrawn_at=null（再入会）
//   3. activity_log に withdraw / rejoin を記録（→「退会→再入会」が履歴で追える）
//
// 設計メモ:
//   - 退会は「削除」ではない。レコードは保持し、再入会で戻せる。
//   - tier / member_no は退会では触らない（保持）。実アクセスは Stripe 解約→webhook 連動に任せる。
//   - Stripe 解約が失敗しても退会状態は確定させ、warning を返す（手動フォロー）。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: adminCheck, error: adminErr } = await supabase.rpc("is_admin");
  if (adminErr || adminCheck !== true) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { applicantId?: string; withdraw?: boolean }
    | null;
  const applicantId = body?.applicantId;
  const withdraw = body?.withdraw;

  if (!applicantId || typeof withdraw !== "boolean") {
    return NextResponse.json(
      { error: "applicantId と withdraw(boolean) が必要です" },
      { status: 400 },
    );
  }

  const { data: current, error: cErr } = await supabase
    .from("applicants")
    .select("stripe_subscription_id, withdrawn_at")
    .eq("id", applicantId)
    .single();

  if (cErr || !current) {
    return NextResponse.json(
      { error: "該当する会員が見つかりません" },
      { status: 404 },
    );
  }

  const newWithdrawnAt = withdraw ? new Date().toISOString() : null;
  let stripeWarning: string | null = null;
  let stripeCanceled = false;

  // 退会時：Stripe サブスクを解約（あれば）。失敗しても退会は続行し warning を返す。
  if (withdraw && current.stripe_subscription_id) {
    try {
      const stripe = getStripeClient();
      await stripe.subscriptions.cancel(current.stripe_subscription_id);
      stripeCanceled = true;
    } catch (e) {
      stripeWarning = `Stripe の解約に失敗しました（${
        e instanceof Error ? e.message : "unknown"
      }）。Stripe ダッシュボードで手動確認してください。`;
    }
  }

  const { error: uErr } = await supabase
    .from("applicants")
    .update({ withdrawn_at: newWithdrawnAt })
    .eq("id", applicantId);

  if (uErr) {
    return NextResponse.json(
      { error: `更新に失敗：${uErr.message}` },
      { status: 500 },
    );
  }

  // activity_log に記録（失敗しても本処理は維持）
  const { error: lErr } = await supabase.from("activity_log").insert({
    actor_id: user.id,
    subject_type: "applicant",
    subject_id: applicantId,
    action: withdraw ? "withdraw" : "rejoin",
    details: { stripe_canceled: stripeCanceled },
  });
  if (lErr) {
    console.warn("[admin/member/withdraw] activity_log 失敗:", lErr.message);
  }

  return NextResponse.json({
    ok: true,
    withdrawn_at: newWithdrawnAt,
    warning: stripeWarning,
  });
}
