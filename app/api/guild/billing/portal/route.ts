import { NextRequest, NextResponse } from "next/server";
import { getMyGuildBilling } from "@/lib/guild/server-data";
import { resolveSakabaPlan } from "@/lib/guild/billing-plans";
import { createClient } from "@/lib/supabase/server";
import { getConfiguredSakabaPrices, getSakabaStripeClient, getSakabaStripeMode } from "@/lib/stripe/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  try {
    const billing = await getMyGuildBilling();
    if (!billing.stripe_customer_id) {
      return NextResponse.json({ error: "管理できる契約がありません。" }, { status: 404 });
    }
    const switching = request.nextUrl.searchParams.get("switch") === "1";
    if (switching && billing.company_note_benefit) {
      return NextResponse.json({ error: "Company Note会員特典を利用中です。酒場の別契約は支払い管理から確認・解約できます。" }, { status: 409 });
    }
    const configName = getSakabaStripeMode() === "live" ? "STRIPE_PORTAL_SAKABA_CONFIG_LIVE" : "STRIPE_PORTAL_SAKABA_CONFIG_TEST";
    const configuration = process.env[configName];
    if (switching && (process.env.SAKABA_880_ENABLED !== "true" || !configuration)) {
      return NextResponse.json({ error: "プラン変更は準備中です。" }, { status: 503 });
    }
    if (switching && (!["standard", "dining"].includes(resolveSakabaPlan(billing, getConfiguredSakabaPrices())) || !billing.stripe_subscription_id)) {
      return NextResponse.json({ error: "変更できる契約がありません。" }, { status: 409 });
    }
    const returnPath = request.nextUrl.searchParams.get("from") === "me" ? "/guild/me" : "/guild/plan";
    const session = await getSakabaStripeClient().billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      ...(switching && configuration ? { configuration } : {}),
      ...(switching && billing.stripe_subscription_id ? {
        flow_data: { type: "subscription_update" as const, subscription_update: { subscription: billing.stripe_subscription_id } },
      } : {}),
      return_url: `${request.nextUrl.origin}${returnPath}`,
      locale: "ja",
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[sakaba.billing] Portal作成失敗", error);
    return NextResponse.json({ error: "支払い管理を開けませんでした。" }, { status: 503 });
  }
}
