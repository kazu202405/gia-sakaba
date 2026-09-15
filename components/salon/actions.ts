// 寺子屋 法人プラン（¥9,980/月）の Stripe Checkout 起動 Server Action。
// salon-lp.tsx の法人カードから <form action={...}> で呼ぶ。
//
// 設計メモ:
//   - purpose: "terakoya-corp" を metadata に入れる。webhook は "ai-clone" 以外を
//     右腕AIテナント作成に回さないため、ここでは決済のみが記録される（付与＝勉強会/懇親会の
//     3名紐付け・右腕AI社長アカウントは運営が手動で行う前提）。
//   - ログイン不要。会社名を custom_fields で収集し、手動付与時の名寄せに使う。
//   - 価格未設定（env 未投入）の場合は getTerakoyaCorpPriceId が throw → /members?checkout=unavailable へ。

"use server";

import { redirect } from "next/navigation";
import {
  getSiteOrigin,
  getStripeClient,
  getTerakoyaCorpPriceId,
} from "@/lib/stripe/client";
import { terakoyaCheckoutRedirect } from "./checkout-core";

// テラこや 個人会員（¥11,000/月・税込）の Stripe Checkout 起動 Server Action。
// salon-lp.tsx の参加カードから <form action={...}> で呼ぶ。
// 実体は checkout-core.ts に集約（ログイン後の自動再開ページ terakoya/start と共有）。
// 「決済前に会員登録」: 未ログインなら core 側で /login?next=/members/app/terakoya/start へ。
export async function startTerakoyaCheckout(): Promise<never> {
  return terakoyaCheckoutRedirect();
}

export async function startTerakoyaCorpCheckout(): Promise<never> {
  // Stripe 未設定でも生の500を出さず「準備中」案内に倒す。
  // redirect() は NEXT_REDIRECT を throw するため try の外で呼ぶ。
  let checkoutUrl: string | null = null;
  try {
    const stripe = getStripeClient();
    const priceId = getTerakoyaCorpPriceId();
    const origin = getSiteOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { purpose: "terakoya-corp" },
      subscription_data: { metadata: { purpose: "terakoya-corp" } },
      custom_fields: [
        {
          key: "company",
          label: { type: "custom", custom: "会社名" },
          type: "text",
        },
      ],
      success_url: `${origin}/members?checkout=corp-success`,
      cancel_url: `${origin}/members`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "ja",
    });
    checkoutUrl = session.url ?? null;
  } catch (err) {
    console.error("[terakoya-corp] Checkout 作成失敗（Stripe設定/通信）:", err);
    redirect("/members?checkout=unavailable");
  }

  if (!checkoutUrl) {
    redirect("/members?checkout=unavailable");
  }

  redirect(checkoutUrl);
}
