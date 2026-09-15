// 会員の段の変更（online → real など）。
//
// なぜ「解約して入り直す」ではないのか:
//   解約させると、その瞬間 plan が外れて会員機能が使えなくなり、
//   決済し直すまでの間だけ非会員になる。日割りも自分で計算することになる。
//   Stripe はサブスクリプションの price を差し替えられるので、契約は
//   1本のまま段だけ移す。差額は Stripe が日割りで精算する。
//
// metadata.plan も新しい段に書き換える。webhook の
// customer.subscription.updated がこれを読んで applicants.plan を追従させる
// （書き換えないと Stripe 上はリアル会員なのにDBはオンライン会員のまま残る）。

import { createClient } from "@/lib/supabase/server";
import {
  getMembershipPriceId,
  getStripeClient,
  type MembershipPlan,
} from "./client";

export type MembershipChangeResult =
  | { status: "ok"; plan: MembershipPlan }
  | { status: "unauthenticated" }
  | { status: "no_subscription" }
  | { status: "same_plan" }
  | { status: "unavailable" };

/**
 * 現在の契約の段を差し替える。
 *
 * no_subscription は「会員だが Stripe の契約が無い」ケース。
 * 手動で付与した無料枠がこれにあたる。金額のやりとりが無いので、
 * ここでは扱わず運営側で対応する（勝手に課金を始めない）。
 */
export async function changeMembershipPlan(
  next: MembershipPlan,
): Promise<MembershipChangeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  const { data: applicant } = await supabase
    .from("applicants")
    .select("id, plan, stripe_subscription_id, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (applicant?.plan === next) return { status: "same_plan" };
  if (!applicant?.stripe_subscription_id) return { status: "no_subscription" };

  try {
    const stripe = getStripeClient();
    const priceId = getMembershipPriceId(next);

    const sub = await stripe.subscriptions.retrieve(
      applicant.stripe_subscription_id,
    );
    const item = sub.items?.data?.[0];
    if (!item) return { status: "no_subscription" };

    await stripe.subscriptions.update(applicant.stripe_subscription_id, {
      items: [{ id: item.id, price: priceId }],
      // 差額を日割りで精算する。次回請求に反映される。
      proration_behavior: "create_prorations",
      // webhook がこれを読んで applicants.plan を追従させる
      metadata: { ...sub.metadata, purpose: "membership", plan: next },
    });

    return { status: "ok", plan: next };
  } catch (err) {
    console.error(`[membership] 段の変更に失敗 [${applicant.plan}→${next}]:`, err);
    return { status: "unavailable" };
  }
}
