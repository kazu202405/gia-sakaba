"use server";

// 会員の段を変更する Server Action（オンライン → リアル）。
//
// 解約させずに Stripe のサブスクリプションの price を差し替える。
// 差額は Stripe が日割りで精算し、次回請求に反映される。
// 実体は lib/stripe/membership-change.ts。

import { redirect } from "next/navigation";
import { changeMembershipPlan } from "@/lib/stripe/membership-change";

export async function upgradeToReal(): Promise<never> {
  const result = await changeMembershipPlan("real");

  // redirect() は NEXT_REDIRECT を throw するため、分岐の外側で呼ぶ。
  switch (result.status) {
    case "ok":
      // webhook が applicants.plan を書き換えるまで数秒かかる。
      // 完了画面側で「反映まで数十秒」と伝える。
      redirect("/upgrade/changed");
    case "unauthenticated":
      redirect(`/login?next=${encodeURIComponent("/upgrade")}`);
    case "same_plan":
      redirect("/members/app/mypage");
    case "no_subscription":
      // 手動付与の無料枠など、Stripeの契約が無い会員。
      // 勝手に課金を始めず、運営に連絡してもらう。
      redirect("/upgrade?change=contact");
    case "unavailable":
      redirect("/upgrade?change=unavailable");
  }
}
