// AI Clone（アシスタント / パートナー）の Stripe Checkout 起動コア。
// Server Action（_actions.ts）と、ログイン後の自動再開ページ（start/[plan]）の両方から使う。
// ※ "use server" は付けない（ここは通常のサーバーモジュール。redirect は next/navigation）。

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AI_CLONE_SALES_ENABLED } from "@/lib/config/membership";
import {
  type AiClonePlan,
  getAiClonePriceId,
  getSiteOrigin,
  getStripeClient,
} from "@/lib/stripe/client";

// returnPath: 決済キャンセル時/準備中時に戻すLPパス（/start or /services/ai）。
export async function aiCloneCheckoutRedirect(
  plan: AiClonePlan,
  returnPath: string,
): Promise<never> {
  const safeReturn =
    returnPath === "/start" || returnPath === "/upgrade"
      ? returnPath
      : "/services/ai";

  // 外販停止中。既存契約は動かすが、新規の購入は受け付けない。
  // 会員として申し込みたい人は会員の段へ案内する。
  if (!AI_CLONE_SALES_ENABLED) {
    redirect("/upgrade");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // ログイン後に「このページ（自動再開）」へ戻し、再クリック不要で決済に進ませる。
    redirect(`/login?next=${encodeURIComponent(`/services/ai/start/${plan}`)}`);
  }

  // 既に owner として active な tenant を持っていれば、そちらへ（重複決済防止）
  const { data: existing } = await supabase
    .from("ai_clone_tenants")
    .select("slug, status")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (existing && existing.status === "active") {
    redirect(`/clone/${existing.slug}`);
  }

  // Stripe 設定が本番未設定だと throw する。生の500を出さず「準備中」案内に倒す。
  // redirect() は NEXT_REDIRECT を throw するため try の外で呼ぶ。
  let checkoutUrl: string | null = null;
  try {
    const stripe = getStripeClient();
    const priceId = getAiClonePriceId(plan);
    const origin = getSiteOrigin();
    const today = new Date().toISOString().slice(0, 10);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email ?? undefined,
        metadata: { purpose: "ai-clone", user_id: user.id, plan },
        subscription_data: {
          metadata: { purpose: "ai-clone", user_id: user.id, plan },
        },
        success_url: `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}&purpose=ai-clone`,
        cancel_url: `${origin}${safeReturn}`,
        allow_promotion_codes: true,
        locale: "ja",
      },
      { idempotencyKey: `checkout:ai-clone:${plan}:${user.id}:${today}` },
    );
    checkoutUrl = session.url ?? null;
  } catch (err) {
    console.error("[ai-clone] Checkout 作成失敗（Stripe設定/通信）:", err);
    redirect(`${safeReturn}?checkout=unavailable`);
  }

  if (!checkoutUrl) {
    redirect(`${safeReturn}?checkout=unavailable`);
  }

  redirect(checkoutUrl);
}
