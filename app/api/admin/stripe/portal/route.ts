// 管理者専用：任意の applicant に対する Stripe Customer Portal リンクを発行する。
//
// /api/stripe/portal は自分自身のサブスク管理用（user.id === applicant.id 前提）だが、
// 管理画面からは「この会員のportal URL を発行して LINE で送る」用途があるため別エンドポイント。
//
// 動作:
//   1. 認証 + is_admin チェック
//   2. body から applicantId 受け取り
//   3. その applicant の stripe_customer_id から portal session 作成
//   4. URL を返す（管理者がコピーして本人に送る想定）

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin, getStripeClient } from "@/lib/stripe/client";

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

  // 管理者判定（applicants の自分行が引ける = ログイン済 +
  // RLS で is_admin() を通る場合のみ他人の行も引けるので、
  // 「他人の applicant が SELECT できるか」で判定する代わりに、
  // ここでは Supabase の is_admin() を明示的に呼ぶ）。
  const { data: adminCheck, error: adminErr } = await supabase.rpc("is_admin");
  if (adminErr || adminCheck !== true) {
    return NextResponse.json(
      { error: "管理者権限が必要です" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { applicantId?: string }
    | null;
  const applicantId = body?.applicantId;
  if (!applicantId) {
    return NextResponse.json(
      { error: "applicantId が必要です" },
      { status: 400 },
    );
  }

  const { data: applicant, error: aErr } = await supabase
    .from("applicants")
    .select("stripe_customer_id")
    .eq("id", applicantId)
    .single();

  if (aErr || !applicant) {
    return NextResponse.json(
      { error: "該当する会員が見つかりません" },
      { status: 404 },
    );
  }

  if (!applicant.stripe_customer_id) {
    return NextResponse.json(
      { error: "この会員は Stripe Customer がありません（未課金）" },
      { status: 404 },
    );
  }

  const stripe = getStripeClient();
  const origin = getSiteOrigin();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: applicant.stripe_customer_id,
    return_url: `${origin}/admin`,
    locale: "ja",
  });

  return NextResponse.json({ url: portalSession.url });
}
