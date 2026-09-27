import { NextResponse } from "next/server";
import { canSendMealWish, resolveSakabaAccessPlan } from "@/lib/guild/billing-plans";
import { normalizeMealWish } from "@/lib/guild/meal-wishes";
import { getMyGuildBilling } from "@/lib/guild/server-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getConfiguredSakabaPrices } from "@/lib/stripe/client";

export const runtime = "nodejs";

async function authorizedMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "ログインが必要です。" }, { status: 401 }) };
  if (process.env.SAKABA_880_ENABLED !== "true") return { error: NextResponse.json({ error: "会食の希望は準備中です。" }, { status: 503 }) };
  const billing = await getMyGuildBilling();
  if (billing.user_id !== user.id) return { error: NextResponse.json({ error: "利用できません。" }, { status: 403 }) };
  if (!canSendMealWish(resolveSakabaAccessPlan(billing, getConfiguredSakabaPrices()))) {
    return { error: NextResponse.json({ error: "880円会員のみ利用できます。" }, { status: 403 }) };
  }
  return { guildId: billing.guild_id, userId: user.id };
}

export async function POST(request: Request) {
  try {
    const access = await authorizedMember();
    if ("error" in access) return access.error;
    const body = await request.json().catch(() => ({})) as { wish_text?: unknown };
    const wishText = normalizeMealWish(body.wish_text);
    if (!wishText) return NextResponse.json({ error: "希望は1〜500字で入力してください。" }, { status: 400 });
    const { error } = await createAdminClient().from("sakaba_meal_wishes").upsert({
      guild_id: access.guildId,
      user_id: access.userId,
      wish_text: wishText,
      updated_at: new Date().toISOString(),
    }, { onConflict: "guild_id,user_id" });
    if (error) throw error;
    return NextResponse.json({ wish_text: wishText });
  } catch (error) {
    console.error("[sakaba.meal-wish] save failed", error);
    return NextResponse.json({ error: "希望を保存できませんでした。" }, { status: 503 });
  }
}

export async function DELETE() {
  try {
    const access = await authorizedMember();
    if ("error" in access) return access.error;
    const { error } = await createAdminClient().from("sakaba_meal_wishes").delete()
      .eq("guild_id", access.guildId).eq("user_id", access.userId);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[sakaba.meal-wish] delete failed", error);
    return NextResponse.json({ error: "希望を削除できませんでした。" }, { status: 503 });
  }
}
