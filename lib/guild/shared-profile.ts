// 共有URL（会員以外にも見せるステータス）の型と、設定の変え方。仕様：contexts/projects/gia/sakaba_share_url.md
// DB側（0121）の関数が返す形と同じ。出さないと決めた項目はここにも型として存在しない。

import type { JobIconKey, Position } from "./types";

/** URLの文字列は 64桁の16進（推測できない長さ） */
export const SHARE_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/** 公開ページの文字列を、そのままDBに渡してよい形か（形が違えば、DBへ問い合わせずに「見つかりません」にする） */
export function isShareToken(value: string): boolean {
  return SHARE_TOKEN_PATTERN.test(value);
}

export type ShareSettings = {
  token: string;
  enabled: boolean;
  show_profile: boolean;
  show_personal: boolean;
  show_card: boolean;
  show_intros: boolean;
  show_intro_authors: boolean;
};

export type ShareSwitch = Exclude<keyof ShareSettings, "token">;

/**
 * 設定を1つ変えた結果。紹介状がオフなら、書いた人の名前も必ずオフ（DBの関数と同じ決まり）。
 * 画面は、押した瞬間にこの結果を先に見せ、保存に失敗したら元の値に戻す。
 */
export function applyShareChange(current: ShareSettings, change: Partial<Omit<ShareSettings, "token">>): ShareSettings {
  const next = { ...current, ...change };
  next.show_intro_authors = next.show_intros && next.show_intro_authors;
  return next;
}

/** 公開ページが受け取る内容（DBの sakaba_get_shared_profile の返り値） */
export type SharedProfile = {
  display_name: string;
  photo_url: string | null;
  headline: string;
  job: string;
  job_icon: JobIconKey;
  region: string;
  industry: string | null;
  company_name: string | null;
  position: Position | null;
  bio: string | null;
  values_text: string | null;
  looking_for: string | null;
  keywords: string[] | null;
  hobbies: string | null;
  life_story: string | null;
  business_card: { front: string | null; back: string | null } | null;
  introductions: { body: string; created_at: string; author_name: string | null }[] | null;
};

/** 共有URLの全体（ブラウザで開くとき。originは呼び出し側で渡す） */
export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/p/${token}`;
}
