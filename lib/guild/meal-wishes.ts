export const MEAL_WISH_MAX_LENGTH = 500;

export function normalizeMealWish(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= MEAL_WISH_MAX_LENGTH ? text : null;
}

export type MealWish = {
  guild_id: string;
  user_id: string;
  wish_text: string;
  created_at: string;
  updated_at: string;
};
