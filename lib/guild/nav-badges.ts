// メニューの数字（赤い丸）。画面にもDBにも依存しない関数だけを置き、テスト（nav-badges.test.ts）で見張る。
//
// 数えるのは「自分あての未読のおしらせ」だけ。他人の入会・他人のクエストなど、自分に関係ない出来事では増やさない。
// 管理者あての種類（相談・ご意見・参加の申請）は管理者にしか届かないので、ふつうの会員に管理者の数字は出ない。
// 数字は、おしらせを既読にすると消える（既読の仕組みは「おしらせ」と共通）。

import type { GuildNotification, NotificationKind } from "./types";

/** 数字を出すメニュー */
export type NavBadgeKey = "guild" | "quests" | "master";

export type NavBadges = Record<NavBadgeKey, number> & { total: number };

/**
 * おしらせの種類 → 数字を出すメニュー（開いた先がそのメニューの下にあるもの）。
 * Record にしてあるので、種類を足して振り分けを忘れると型エラーになる。null はメニューには出さない（おしらせにだけ数える）。
 */
const BADGE_OF_KIND: Record<NotificationKind, NavBadgeKey | null> = {
  quest_applied: "quests",
  quest_updated: "quests",
  quest_withdrawn: "quests",
  gathering_approved: "quests",
  gathering_declined: "quests",
  schedule_decided: "quests",
  intro_progress: "guild",
  member_joined: "guild",
  consult_request: "master",
  feedback_report: "master",
  member_pending: "master",
};

export function countNavBadges(items: GuildNotification[]): NavBadges {
  const badges: NavBadges = { guild: 0, quests: 0, master: 0, total: 0 };
  for (const n of items) {
    if (n.read_at !== null) continue;
    badges.total += 1;
    const key = BADGE_OF_KIND[n.kind];
    if (key) badges[key] += 1;
  }
  return badges;
}

/** 0 のときは出さない（null）。多いときは 99+ にして、開かないまま増え続けても丸が崩れないようにする */
export function formatBadge(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? "99+" : String(Math.floor(count));
}
