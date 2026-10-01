// ホームの「共有URLを作りましょう」を「あとで」で隠す期間の決まり。永久には隠さない（3日たてばまた出る）。

export const SHARE_NUDGE_STORAGE_KEY = "sakaba.shareNudgeSnoozeUntil";
export const SHARE_NUDGE_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/** 「あとで」を押したとき、この時刻まで隠す */
export function snoozeUntil(now: number): number {
  return now + SHARE_NUDGE_SNOOZE_MS;
}

/** 保存されていた値で、いま隠してよいか。壊れた値・過去の時刻・遠すぎる未来は「隠さない」（永久に隠れる事故を防ぐ） */
export function isSnoozed(raw: string | null, now: number): boolean {
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return until > now && until <= now + SHARE_NUDGE_SNOOZE_MS;
}
