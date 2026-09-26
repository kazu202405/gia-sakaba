import { NextRequest, NextResponse } from "next/server";
import { getMyGuildBilling } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/server";
import { getSakabaStripeClient } from "@/lib/stripe/client";

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
    const returnPath = request.nextUrl.searchParams.get("from") === "me" ? "/guild/me" : "/guild/plan";
    const session = await getSakabaStripeClient().billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${request.nextUrl.origin}${returnPath}`,
      locale: "ja",
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[sakaba.billing] Portal作成失敗", error);
    return NextResponse.json({ error: "支払い管理を開けませんでした。" }, { status: 503 });
  }
}
