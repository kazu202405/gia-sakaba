// 会員の段（online / real / invite / premium）の Stripe Checkout 起動コア。
//
// なぜ1本にまとめるか:
//   以前は入口ごとに Checkout 作成処理が別々にあり（サロン用・テラこや用・
//   右腕AI用）、metadata の付け方も webhook の受け方も少しずつ違っていた。
//   「どの入口がいくら課金して、決済後に何が起きるのか」を追うのに
//   4ファイル読む必要があり、価格の取り違えが実際に起きていた。
//   段の定義は lib/stripe/client.ts の MEMBERSHIP_PRICE_ENV 1箇所、
//   決済の作り方はこのファイル1箇所、受け取りは webhook の
//   purpose==='membership' 1分岐、という形にそろえる。
//
// metadata の約束:
//   purpose = 'membership'（webhook の分岐キー）
//   plan    = online | real | invite | premium
//   user_id = auth.users.id（applicants.id と同じ）
//
// tier は触らない。'paid' にすると紹介リンク等のコーチ機能が誤って開くため
// （migration 0076 のコメント参照）。会員の段は plan だけで表す。

import { createClient } from "@/lib/supabase/server";
import {
  getMembershipPriceId,
  getSiteOrigin,
  getStripeClient,
  type MembershipPlan,
} from "./client";

export type MembershipCheckoutResult =
  | { status: "ok"; url: string }
  | { status: "unauthenticated" }
  | { status: "already_active" }
  | { status: "unavailable" };

type Options = {
  /** 決済成功後の戻り先パス。入口ごとに必ず明示する。 */
  successPath: string;
  /** キャンセル時の戻り先パス */
  cancelPath: string;
};

/**
 * 会員の段の Checkout Session を作る。
 *
 * redirect() は呼ばない。呼び出し側が Server Action なら redirect、
 * API Route なら JSON で返す、と使い分けられるようにするため
 * （redirect は NEXT_REDIRECT を throw するので try の中で呼べない）。
 */
export async function createMembershipCheckout(
  plan: MembershipPlan,
  options: Options,
): Promise<MembershipCheckoutResult> {
  // 戻り先に共通の既定値を置かない。Company Note 経由まで GIA の
  // マイページへ戻す事故を防ぐため、各入口が意図した行き先を必ず渡す。
  const { successPath, cancelPath } = options;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  // 既存の customer を再利用する（別 customer を作ると請求先が分かれる）。
  // 取得できなくても決済自体は続行できるので、エラーで止めない。
  const { data: applicant } = await supabase
    .from("applicants")
    .select("id, plan, subscription_status, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  // 二重契約の防止。段の変更（online→real 等）は解約してから入り直す運用にする。
  // ここを外すと同じ人に2本のサブスクが立ち、解約時にどちらが残るか分からなくなる。
  if (applicant?.subscription_status === "active" && applicant?.plan) {
    return { status: "already_active" };
  }

  try {
    const stripe = getStripeClient();
    const priceId = getMembershipPriceId(plan);
    const origin = getSiteOrigin();

    // 連打・リトライで Session が増えないよう決定的なキーにする（日付で区切る）
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `checkout:membership:${plan}:${user.id}:${today}`;

    const metadata = { purpose: "membership", plan, user_id: user.id };

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        ...(applicant?.stripe_customer_id
          ? { customer: applicant.stripe_customer_id }
          : { customer_email: user.email ?? undefined }),
        metadata,
        // subscription 側にも同じ metadata を持たせる。更新・解約の webhook は
        // session ではなく subscription が飛んでくるため、ここが無いと
        // 誰の何の契約か分からなくなる。
        subscription_data: { metadata },
        success_url: `${origin}${successPath}`,
        cancel_url: `${origin}${cancelPath}`,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        locale: "ja",
      },
      { idempotencyKey },
    );

    return session.url
      ? { status: "ok", url: session.url }
      : { status: "unavailable" };
  } catch (err) {
    // env 未投入・Price 無効・通信失敗。生の500を出さず「準備中」に倒す。
    console.error(`[membership] Checkout 作成失敗 [plan=${plan}]:`, err);
    return { status: "unavailable" };
  }
}
