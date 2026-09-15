// ログイン後に決済を自動再開する中継ページ。
// 「このプランで始める」未ログイン→/login?next=/services/ai/start/<plan> でここに戻り、
// 再クリック不要でそのまま Stripe Checkout へ進む（無ければ /services/ai?checkout=unavailable）。

import { redirect } from "next/navigation";
import { aiCloneCheckoutRedirect } from "../../checkout-core";

export default async function ResumeCheckoutPage({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  const { plan } = await params;
  if (plan === "assistant" || plan === "partner") {
    // ログイン済みなら Stripe へ、未ログインなら再度 /login へ（core 内で判定）
    await aiCloneCheckoutRedirect(plan, "/services/ai");
  }
  redirect("/services/ai");
}
