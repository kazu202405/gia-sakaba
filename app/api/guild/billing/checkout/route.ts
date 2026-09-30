import { NextRequest, NextResponse } from "next/server";
import { getMyGuildBilling } from "@/lib/guild/server-data";
import { isPaidSakabaPlan } from "@/lib/guild/billing-plans";
import { createClient } from "@/lib/supabase/server";
import { getSakabaPriceId, getSakabaStripeClient } from "@/lib/stripe/client";

export const runtime = "nodejs";

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({})) as { plan?: unknown };
    const plan = body.plan === undefined ? "standard" : body.plan;
    if (!isPaidSakabaPlan(plan)) {
      return NextResponse.json({ error: "プランを選び直してください。" }, { status: 400 });
    }
    if (plan === "dining" && process.env.SAKABA_880_ENABLED !== "true") {
      return NextResponse.json({ error: "ビジネスプラン（880円）は準備中です。" }, { status: 503 });
    }
    const billing = await getMyGuildBilling();
    if (billing.role !== "member" || billing.billing_status === "exempt") {
      return NextResponse.json({ error: "管理者は申し込み不要です。" }, { status: 409 });
    }
    if (billing.company_note_benefit) {
      return NextResponse.json({ error: "Company Note会員特典でビジネスプラン（880円）の機能を利用できます。酒場での追加申込は不要です。" }, { status: 409 });
    }
    if (["active", "trialing", "past_due"].includes(billing.billing_status)) {
      return NextResponse.json({ error: "すでに契約があります。支払い管理を開いてください。" }, { status: 409 });
    }

    const stripe = getSakabaStripeClient();
    const priceId = getSakabaPriceId(plan);
    const metadata = {
      purpose: "sakaba",
      guild_id: billing.guild_id,
      user_id: user.id,
      tier: plan,
    };
    const origin = request.nextUrl.origin;
    const returnPath = request.nextUrl.searchParams.get("from") === "projects" ? "/guild/projects" : "/guild/plan";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(billing.stripe_customer_id
        ? { customer: billing.stripe_customer_id }
        // 形の正しくないメール（テスト用の a@a など）はStripeが拒否するので渡さない。決済画面で本人が入れる
        : { customer_email: user.email && looksLikeEmail(user.email) ? user.email : undefined }),
      client_reference_id: user.id,
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/guild/thanks?session_id={CHECKOUT_SESSION_ID}${returnPath === "/guild/projects" ? "&from=projects" : ""}`,
      cancel_url: `${origin}${returnPath}?checkout=canceled`,
      billing_address_collection: "auto",
      locale: "ja",
    });

    if (!session.url) throw new Error("Checkout URL was not returned");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[sakaba.billing] Checkout作成失敗", error);
    // 原因の違う失敗を1つの文言にしない：メールアドレスをStripeが受け付けない場合は、それと分かるように返す
    if (typeof error === "object" && error !== null && (error as { param?: unknown }).param === "customer_email") {
      return NextResponse.json({ error: "登録されているメールアドレスが、決済で使えない形式です。ログインに使っているメールアドレスを確認してください。" }, { status: 422 });
    }
    return NextResponse.json({ error: "決済画面を開けませんでした。設定を確認してください。" }, { status: 503 });
  }
}
