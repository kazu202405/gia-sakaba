import type { Position } from "./types";

export type PreparedInvite = {
  display_name: string;
  company_name: string;
  position: Position | "";
  introduction: string;
};

export type MasterPreparedInvite = PreparedInvite & {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  used_count: number;
};

export const PREPARED_INTRODUCTION_MAX = 400;

export function validatePreparedInvite(draft: PreparedInvite): string | null {
  if (!draft.display_name.trim() || draft.display_name.trim().length > 30) return "お名前は1〜30文字で入力してください。";
  if (draft.company_name.trim().length > 60) return "会社名は60文字以内で入力してください。";
  if (draft.position && !["ceo", "officer", "decider", "other"].includes(draft.position)) return "役職を選び直してください。";
  if (draft.introduction.trim().length > PREPARED_INTRODUCTION_MAX) return "紹介文は400文字以内で入力してください。";
  return null;
}
