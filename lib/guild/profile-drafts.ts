// ステータスの下書き（0130）。オーナー・マスターが本人の代わりに中身を下書きし、本人が承認して初めて載る。
// 画面にもDBにも依存しない関数だけを置き、テスト（profile-drafts.test.ts）で見張る。
//
// - 下書きできる項目はここ1か所で決める（画面の入力欄・本人に見せる画面・DBへの渡し方が同じ一覧を読む）
// - 名前・会社・役職は招待状の下書き（prepared-invites）にあるので、ここには入れない
// - 本人がすでに書いている項目は上書きしない（mergeDraftIntoProfile。DBの sakaba_decide_my_profile_draft も同じ決まり）

import type { Profile } from "./types";
import { makeWording, type Wording } from "./store-words";
import { GIA_WORDS } from "./words/gia";

export const DRAFT_FIELDS = ["headline", "industry", "region", "job", "bio", "values_text", "looking_for"] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];
export type ProfileDraftFields = Record<DraftField, string>;

/** 入力画面（ステータスをなおす）と同じ項目名・同じ上限 */
export function draftFieldLabelFor(w: Wording): Record<DraftField, string> {
  return {
    headline: "ひとこと",
    industry: "業種",
    region: "地域",
    job: "職業",
    bio: "仕事内容・できること",
    values_text: w("group.values.title"),
    looking_for: w("member.connectLabel"),
  };
}
/** GIAの酒場の言葉（項目の一覧を数えるのに使う）。店の画面は draftFieldLabelFor(store.w) */
export const draftFieldLabel: Record<DraftField, string> = draftFieldLabelFor(makeWording(GIA_WORDS));

export const draftFieldMax: Record<DraftField, number> = {
  headline: 40,
  industry: 40,
  region: 40,
  job: 40,
  bio: 1200,
  values_text: 1200,
  looking_for: 1200,
};

/** 長い文章の項目は複数行の欄にする */
export const draftFieldIsLong: Record<DraftField, boolean> = {
  headline: false,
  industry: false,
  region: false,
  job: false,
  bio: true,
  values_text: true,
  looking_for: true,
};

export const emptyDraftFields: ProfileDraftFields = {
  headline: "", industry: "", region: "", job: "", bio: "", values_text: "", looking_for: "",
};

export type DraftState = "waiting" | "applied" | "declined";

/** 本人に届いた下書き（sakaba_get_my_profile_draft） */
export type MyProfileDraft = {
  id: string;
  created_at: string;
  drafted_by_name: string;
  fields: ProfileDraftFields;
  /** 本人がすでに書いている項目（下書きは入らない） */
  filled: DraftField[];
};

/** 書いた人が見る、その人あての下書き（sakaba_get_member_profile_draft）。返事が済んだものは中身が無い */
export type MemberProfileDraft = {
  id: string;
  state: DraftState;
  decided_at: string | null;
  fields: ProfileDraftFields | null;
};

/** 招待状にひもづく入会前の下書き（sakaba_list_invite_profile_drafts） */
export type InviteProfileDraft = ProfileDraftFields & { invite_id: string };

export function pickDraftFields(source: ProfileDraftFields): ProfileDraftFields {
  const picked = { ...emptyDraftFields };
  for (const key of DRAFT_FIELDS) picked[key] = source[key];
  return picked;
}

export function draftHasContent(fields: ProfileDraftFields): boolean {
  return DRAFT_FIELDS.some((key) => fields[key].trim() !== "");
}

export function countDraftFields(fields: ProfileDraftFields): number {
  return DRAFT_FIELDS.filter((key) => fields[key].trim() !== "").length;
}

export function validateProfileDraft(fields: ProfileDraftFields, w: Wording): string | null {
  for (const key of DRAFT_FIELDS) {
    if (fields[key].trim().length > draftFieldMax[key]) return `「${draftFieldLabelFor(w)[key]}」は${draftFieldMax[key]}文字以内で入力してください。`;
  }
  return null;
}

/** RPC に渡す引数。p_ を付けた項目名を、DRAFT_FIELDS からそのまま作る（1か所を変えれば全部変わる） */
export function draftRpcArgs(fields: ProfileDraftFields): Record<`p_${DraftField}`, string> {
  const args = {} as Record<`p_${DraftField}`, string>;
  for (const key of DRAFT_FIELDS) args[`p_${key}`] = fields[key].trim();
  return args;
}

function toFields(raw: unknown): ProfileDraftFields | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const fields = { ...emptyDraftFields };
  for (const key of DRAFT_FIELDS) {
    const value = record[key];
    if (value !== undefined && value !== null && typeof value !== "string") return null;
    fields[key] = typeof value === "string" ? value : "";
  }
  return fields;
}

/** anonymousName＝書いた人の名前が空だったときに出す呼び名（店の言葉。「管理者」など） */
export function parseMyProfileDraft(data: unknown, anonymousName: string): MyProfileDraft | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const fields = toFields(row.fields);
  if (typeof row.id !== "string" || !fields) return null;
  const filled = Array.isArray(row.filled) ? row.filled.filter((key): key is DraftField => (DRAFT_FIELDS as readonly unknown[]).includes(key)) : [];
  return {
    id: row.id,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    drafted_by_name: typeof row.drafted_by_name === "string" && row.drafted_by_name ? row.drafted_by_name : anonymousName,
    fields,
    filled,
  };
}

export function parseMemberProfileDraft(data: unknown): MemberProfileDraft | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (typeof row.id !== "string" || (row.state !== "waiting" && row.state !== "applied" && row.state !== "declined")) return null;
  return {
    id: row.id,
    state: row.state,
    decided_at: typeof row.decided_at === "string" ? row.decided_at : null,
    fields: toFields(row.fields),
  };
}

export function parseInviteProfileDrafts(data: unknown): InviteProfileDraft[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const fields = toFields(item);
    const inviteId = item && typeof item === "object" ? (item as Record<string, unknown>).invite_id : null;
    return fields && typeof inviteId === "string" ? [{ ...fields, invite_id: inviteId }] : [];
  });
}

/** いまのプロフィールで、その項目がすでに書かれているか（業種は profile.industry） */
function isFilled(profile: Pick<Profile, DraftField>, key: DraftField): boolean {
  return profile[key].trim() !== "";
}

/**
 * 下書きをプロフィールに重ねる。すでに書いてある項目は変えない（applied＝入る項目、skipped＝書いてあるので入らない項目）。
 * 下書きが空の項目は、どちらにも入れない。DB の sakaba_decide_my_profile_draft と同じ決まり。
 */
export function mergeDraftIntoProfile<T extends Pick<Profile, DraftField>>(
  profile: T,
  fields: ProfileDraftFields,
): { merged: T; applied: DraftField[]; skipped: DraftField[] } {
  const merged = { ...profile };
  const applied: DraftField[] = [];
  const skipped: DraftField[] = [];
  for (const key of DRAFT_FIELDS) {
    const text = fields[key].trim();
    if (!text) continue;
    if (isFilled(profile, key)) skipped.push(key);
    else { merged[key] = text as T[DraftField]; applied.push(key); }
  }
  return { merged, applied, skipped };
}
