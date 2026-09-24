import { NextRequest, NextResponse } from "next/server";
import { getMyGuildBilling } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/server";
import { getSakabaPriceId, getStripeClient } from "@/lib/stripe/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  try {
    const billing = await getMyGuildBilling();
    if (billing.role !== "member" || billing.billing_status === "exempt") {
      return NextResponse.json({ error: "管理者は申し込み不要です。" }, { status: 409 });
    }
    if (["active", "trialing", "past_due"].includes(billing.billing_status)) {
      return NextResponse.json({ error: "すでに契約があります。支払い管理を開いてください。" }, { status: 409 });
    }

    const stripe = getStripeClient();
    const priceId = getSakabaPriceId();
    const metadata = {
      purpose: "sakaba",
      guild_id: billing.guild_id,
      user_id: user.id,
    };
    const origin = request.nextUrl.origin;
    const returnPath = request.nextUrl.searchParams.get("from") === "projects" ? "/guild/projects" : "/guild/plan";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(billing.stripe_customer_id
        ? { customer: billing.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}${returnPath}?checkout=success`,
      cancel_url: `${origin}${returnPath}?checkout=canceled`,
      billing_address_collection: "auto",
      locale: "ja",
    });

    if (!session.url) throw new Error("Checkout URL was not returned");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[sakaba.billing] Checkout作成失敗", error);
    return NextResponse.json({ error: "決済画面を開けませんでした。設定を確認してください。" }, { status: 503 });
  }
}
