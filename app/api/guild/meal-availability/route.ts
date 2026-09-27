import { NextResponse } from "next/server";
import { canSendMealWish, resolveSakabaAccessPlan } from "@/lib/guild/billing-plans";
import { MEAL_AVAILABILITY_LIMIT, validateMealAvailability } from "@/lib/guild/meal-availability";
import { getMyGuildBilling } from "@/lib/guild/server-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getConfiguredSakabaPrices } from "@/lib/stripe/client";

export const runtime = "nodejs";

async function authorizedMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "ログインが必要です。" }, { status: 401 }) };
  if (process.env.SAKABA_880_ENABLED !== "true" || process.env.SAKABA_AVAILABILITY_ENABLED !== "true")
    return { error: NextResponse.json({ error: "この機能は準備中です。" }, { status: 503 }) };
  const billing = await getMyGuildBilling();
  if (billing.user_id !== user.id || !canSendMealWish(resolveSakabaAccessPlan(billing, getConfiguredSakabaPrices())))
    return { error: NextResponse.json({ error: "880円会員のみ利用できます。" }, { status: 403 }) };
  return { guildId: billing.guild_id, userId: user.id };
}

export async function POST(request: Request) {
  try {
    const access = await authorizedMember();
    if ("error" in access) return access.error;
    const input = validateMealAvailability(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "今後180日以内の日時を、30分〜8時間の範囲で入力してください。" }, { status: 400 });
    const admin = createAdminClient();
    const { count, error: countError } = await admin.from("sakaba_meal_availability")
      .select("id", { count: "exact", head: true }).eq("guild_id", access.guildId).eq("user_id", access.userId)
      .gte("ends_at", new Date().toISOString());
    if (countError) throw countError;
    if ((count ?? 0) >= MEAL_AVAILABILITY_LIMIT)
      return NextResponse.json({ error: `登録できる日時は${MEAL_AVAILABILITY_LIMIT}件までです。` }, { status: 400 });
    const { data, error } = await admin.from("sakaba_meal_availability")
      .insert({ guild_id: access.guildId, user_id: access.userId, ...input })
      .select("id,guild_id,user_id,starts_at,ends_at,note,created_at").single();
    if (error) throw error;
    return NextResponse.json({ slot: data });
  } catch (error) {
    console.error("[sakaba.meal-availability] save failed", error);
    return NextResponse.json({ error: "日時を保存できませんでした。" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await authorizedMember();
    if ("error" in access) return access.error;
    const body = await request.json().catch(() => null) as { id?: unknown } | null;
    if (typeof body?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))
      return NextResponse.json({ error: "削除する日時が見つかりません。" }, { status: 400 });
    const { data, error } = await createAdminClient().from("sakaba_meal_availability")
      .delete().eq("id", body.id).eq("guild_id", access.guildId).eq("user_id", access.userId)
      .select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "削除する日時が見つかりません。" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[sakaba.meal-availability] delete failed", error);
    return NextResponse.json({ error: "日時を削除できませんでした。" }, { status: 503 });
  }
}
