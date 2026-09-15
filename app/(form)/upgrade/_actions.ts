"use server";

// /upgrade の会員CTA（¥4,980）から呼ぶ Server Action。
//
// 2026-08-10 の変更:
//   以前は「本会員 ＝ 右腕AI(assistant) の購入と一体」で、右腕AIの Checkout
//   コアに委譲し、決済完了時に ai_clone_tenants を自動作成しつつ
//   applicants.plan='pro' を立てていた。
//   右腕AIの外販を停止したため、ここは会員の段 online（¥4,980）を売る。
//   Price ID は従来と同じ（GIA4980）で、購入者から見た金額は変わらない。
//   変わるのは決済後の扱いで、右腕AIのテナントは作られず plan='online' が付く。
//   既存の右腕AI契約は据え置き（webhook の更新・解約処理は残してある）。

import { redirect } from "next/navigation";
import { createMembershipCheckout } from "@/lib/stripe/membership-checkout";
import { NOTE_URL } from "@/lib/company-note";
import { checkoutPaths, upgradeFallbackUrl } from "@/lib/upgrade-return";

/**
 * 本会員（¥4,980）の決済を始める。
 *
 * ⚠️ **どこから来たかを最後まで持ち回る。** Company Note の会員限定ゲートから
 *    来た人を GIA のマイページに着地させると、買ったはずの機能に戻る道が
 *    示されない。successPath が固定だったため、同じ迷子が起きていた。
 *
 *    2026-09-07: /upgrade/[plan]（¥11,000）は「対策済み」と書いていたが、
 *    未ログイン分岐だけ from が落ちていた（＝招待された人の経路だけ壊れて
 *    いた）。同じ規則を3箇所に手書きしていたのが原因なので、
 *    lib/upgrade-return.ts に1本化した。
 *
 * `origin` は呼び出し側で bind する。任意文字列は通さない（既知の値だけ）。
 */
export async function startProMembership(
  origin: "note" | null,
): Promise<never> {
  const entryPath = "/upgrade";
  const result = await createMembershipCheckout(
    "online",
    checkoutPaths(entryPath, origin),
  );

  // redirect() は NEXT_REDIRECT を throw するため、分岐の外側で呼ぶ。
  if (result.status === "ok") {
    redirect(result.url);
  }
  redirect(
    upgradeFallbackUrl(result.status, { entryPath, origin, noteUrl: NOTE_URL }),
  );
}
