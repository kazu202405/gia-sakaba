// Stripe Customer Portal を起動するエンドポイント。
// ユーザーが自分でサブスクの解約・カード変更・請求書履歴の確認をできる仕組み。
//
// 動作:
//   1. 認証必須（自分の applicants を引いて customer_id 取得）
//   2. customer_id が無いと 404（=有料会員じゃない）
//   3. billingPortal.sessions.create → URL を返す
//   4. クライアントは window.location.href でリダイレクト
//
// 設定:
//   Stripe Dashboard → Settings → Customer portal で機能（解約・プラン変更など）と
//   ブランディングを設定しておく。test mode と本番で別々。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin, getStripeClient } from "@/lib/stripe/client";

export async function POST() {
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

  const { data: applicant, error: aErr } = await supabase
    .from("applicants")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (aErr || !applicant) {
    return NextResponse.json(
      { error: "ユーザー情報を取得できません" },
      { status: 400 },
    );
  }

  if (!applicant.stripe_customer_id) {
    return NextResponse.json(
      { error: "Stripe 顧客情報がありません（有料会員ではない可能性）" },
      { status: 404 },
    );
  }

  const stripe = getStripeClient();
  const origin = getSiteOrigin();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: applicant.stripe_customer_id,
    return_url: `${origin}/members/app/settings`,
    locale: "ja",
  });

  return NextResponse.json({ url: portalSession.url });
}
