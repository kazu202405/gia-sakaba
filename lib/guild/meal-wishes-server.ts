import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { MealWish } from "./meal-wishes";

export async function getMealWish(guildId: string, userId: string): Promise<MealWish | null> {
  const { data, error } = await createAdminClient().from("sakaba_meal_wishes")
    .select("guild_id,user_id,wish_text,created_at,updated_at")
    .eq("guild_id", guildId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`会食の希望を読み込めませんでした: ${error.message}`);
  return data as MealWish | null;
}

export async function listMealWishes(guildId: string): Promise<MealWish[]> {
  const { data, error } = await createAdminClient().from("sakaba_meal_wishes")
    .select("guild_id,user_id,wish_text,created_at,updated_at")
    .eq("guild_id", guildId).order("updated_at", { ascending: false });
  if (error) throw new Error(`会食の希望を読み込めませんでした: ${error.message}`);
  return (data ?? []) as MealWish[];
}
