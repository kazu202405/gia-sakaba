import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { MealAvailability } from "./meal-availability";

const columns = "id,guild_id,user_id,starts_at,ends_at,note,created_at";

export async function getMyMealAvailability(guildId: string, userId: string): Promise<MealAvailability[]> {
  const { data, error } = await createAdminClient().from("sakaba_meal_availability")
    .select(columns).eq("guild_id", guildId).eq("user_id", userId)
    .gte("ends_at", new Date().toISOString()).order("starts_at", { ascending: true });
  if (error) throw new Error(`会食の空き日時を読み込めませんでした: ${error.message}`);
  return (data ?? []) as MealAvailability[];
}

export async function listMealAvailability(guildId: string): Promise<MealAvailability[]> {
  const { data, error } = await createAdminClient().from("sakaba_meal_availability")
    .select(columns).eq("guild_id", guildId)
    .gte("ends_at", new Date().toISOString()).order("starts_at", { ascending: true });
  if (error) throw new Error(`会食の空き日時を読み込めませんでした: ${error.message}`);
  return (data ?? []) as MealAvailability[];
}
