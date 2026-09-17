// ギルドの ボス（みんなで挑む課題）と、ギルドの約束。画面にもDBにも依存しない関数だけを置き、テスト（boss.test.ts）で見張る。
//
// - ボスは ギルドマスターが掲げる。ふだんのクエストに「このボスに挑む」を任意で付けられる
// - 敵にするのは 課題だけ。人・会社・業界を 敵にしない（悪口や対立の場にしない）
// - 「儲かるなら何でもいい、ではない」は クエストの種類ではなく、入会で同意する「ギルドの約束」にする

import type { Boss, Quest, QuestApplication } from "./types";

/** 入会のときに 同意してもらう ギルドの約束（ビジネスの約束） */
export const GUILD_PROMISES = [
  "ネットワークビジネス・情報商材などの 勧誘を しない",
  "紹介料だけが 目的の 紹介を しない",
  "紹介してくれた人と、紹介された相手の 信頼を 裏切らない",
] as const;

/**
 * 話すときの約束（グランドルール）。集まり・紹介で会うときの 場の決まり。
 * 「否定しない」は 反対意見を言うなという意味ではないので、「まず受け止める」を先に書く
 */
export const GROUND_RULES = [
  "相手の話を さえぎらない",
  "相手の意見を まず受け止める（頭から 否定しない）",
  "自分ばかり 話さない",
] as const;

/** 約束に反するクエストは ギルドマスターが取り下げる（出すときの注意にも使う） */
export const PROMISE_NOTE = "ギルドの約束に 反する クエストは、ギルドマスターが 取り下げることが あります。";

/** けいじばんに出る状態の クエストで、そのボスに挑んでいるもの（取り下げは除く・新しい順） */
export function questsForBoss(quests: Quest[], bossId: string): Quest[] {
  return quests
    .filter((q) => q.boss_id === bossId && q.status !== "withdrawn")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** そのボスに 挑んでいる人（クエストを出した人と、参加したいと伝えた人。重なりは1人） */
export function challengerIds(quests: Quest[], applications: QuestApplication[], bossId: string): string[] {
  const related = questsForBoss(quests, bossId);
  const ids = new Set<string>();
  for (const q of related) {
    ids.add(q.creator_id);
    for (const a of applications) {
      if (a.quest_id === q.id && a.status === "applied") ids.add(a.user_id);
    }
  }
  return [...ids];
}

/** クエストに付けられるボス（いま挑んでいるものだけ） */
export function activeBosses(bosses: Boss[]): Boss[] {
  return bosses.filter((b) => b.status === "active");
}
