// プロフィール完成度の判定ロジック。
//
// 対象は /members/app/mypage/edit に入力UIがある applicants の23項目
// （2026-05-11: migration 0017 で photo_url / genre / location を追加し
//  20項目 → 23項目に拡張）。
//
// 用途:
//   1. 全会員管理画面で完成度 % を表示
//   2. マイページ／編集画面のプログレスバー（書き進み具合）の視覚表示
// ※ かつて存在した「全項目埋め → registered 自動昇格」判定は廃止した
//   （合格ラインを設けず、相互開示ゲートを動機装置とする方針に変更）。

// 完成度判定に使う applicants の必須カラム（mypage/edit の入力UI 23項目）
export const PROFILE_REQUIRED_FIELDS = [
  // 基本
  "name",
  "name_furigana",
  "nickname",
  "status_message",
  "photo_url",
  // 仕事
  "role_title",
  "job_title",
  "headline",
  "services_summary",
  "genre",
  "location",
  // ストーリー
  "story_origin",
  "story_turning_point",
  "story_now",
  "story_future",
  // つながり
  "want_to_connect_with",
  // 人柄
  "favorites",
  "current_hobby",
  "school_days_self",
  "personal_values",
  // 連絡先
  "contact_line",
  "contact_instagram",
  "contact_website",
] as const;

export type ProfileRequiredField = (typeof PROFILE_REQUIRED_FIELDS)[number];

// applicants の部分行から完成度（0-100の整数 %）を算出する。
// 該当カラムが渡されていないと未入力扱い。
export function computeProfileCompleteness(
  applicant: Partial<Record<ProfileRequiredField, string | null | undefined>>,
): number {
  const total = PROFILE_REQUIRED_FIELDS.length;
  let filled = 0;
  for (const field of PROFILE_REQUIRED_FIELDS) {
    const value = applicant[field];
    if (typeof value === "string" && value.trim().length > 0) {
      filled += 1;
    }
  }
  return Math.round((filled / total) * 100);
}

// 完成度に応じた表示色のヒント（Tailwind class）。
export function completenessColorClass(percent: number): {
  text: string;
  bar: string;
  bg: string;
} {
  if (percent >= 100) {
    return {
      text: "text-[#3d6651]",
      bar: "bg-[#3d6651]",
      bg: "bg-[#e9efe9]",
    };
  }
  if (percent >= 60) {
    return {
      text: "text-[#8a5a1c]",
      bar: "bg-[#c08a3e]",
      bg: "bg-[#fbf3e3]",
    };
  }
  return {
    text: "text-gray-500",
    bar: "bg-gray-400",
    bg: "bg-gray-100",
  };
}
