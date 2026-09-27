export type MealAvailability = {
  id: string;
  guild_id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  note: string;
  created_at: string;
};

export const MEAL_AVAILABILITY_LIMIT = 20;
export const MEAL_AVAILABILITY_NOTE_LIMIT = 120;

export function validateMealAvailability(value: unknown, now = Date.now()):
  | { starts_at: string; ends_at: string; note: string }
  | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.starts_at !== "string" || typeof input.ends_at !== "string" || typeof input.note !== "string") return null;
  const start = new Date(input.starts_at);
  const end = new Date(input.ends_at);
  const duration = end.getTime() - start.getTime();
  const note = input.note.trim();
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
    start.getTime() <= now || start.getTime() > now + 180 * 86400000 ||
    duration < 30 * 60000 || duration > 8 * 3600000 || note.length > MEAL_AVAILABILITY_NOTE_LIMIT) return null;
  return { starts_at: start.toISOString(), ends_at: end.toISOString(), note };
}
