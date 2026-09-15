// ProfilePreview 用の型とデータ整形関数。
// Server Component / Client Component の両方から import される共通モジュール。
// "use client" は付けない（Server Component から関数として呼べる必要がある）。

export interface ProfilePreviewData {
  photo_url: string;
  name: string;
  name_furigana: string;
  nickname: string;
  role_title: string;
  job_title: string;
  headline: string;
  services_summary: string;
  story_origin: string;
  story_turning_point: string;
  story_now: string;
  story_future: string;
  want_to_connect_with: string;
  status_message: string;
  favorites: string;
  current_hobby: string;
  school_days_self: string;
  personal_values: string;
  contact_line: string;
  contact_instagram: string;
  contact_website: string;
}

export const PROFILE_PREVIEW_KEYS = [
  "name",
  "name_furigana",
  "nickname",
  "role_title",
  "job_title",
  "headline",
  "services_summary",
  "story_origin",
  "story_turning_point",
  "story_now",
  "story_future",
  "want_to_connect_with",
  "status_message",
  "favorites",
  "current_hobby",
  "school_days_self",
  "personal_values",
  "contact_line",
  "contact_instagram",
  "contact_website",
] as const satisfies readonly (keyof ProfilePreviewData)[];

/**
 * Supabase から取得した applicants 行を ProfilePreviewData に整形する。
 * null や undefined は空文字に正規化する。
 */
export function buildProfilePreviewData(
  row: Record<string, unknown> | null | undefined,
): ProfilePreviewData {
  const out: Partial<Record<keyof ProfilePreviewData, string>> = {};
  for (const k of PROFILE_PREVIEW_KEYS) {
    const v = row?.[k];
    out[k] = typeof v === "string" ? v : "";
  }
  // photo_url は PROFILE_PREVIEW_KEYS（テキストの入力有無判定に使う）には含めず別で持たせる。
  out.photo_url = typeof row?.photo_url === "string" ? row.photo_url : "";
  return out as ProfilePreviewData;
}
