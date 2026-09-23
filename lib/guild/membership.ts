// 有料会員で変わること・実績の数え方。画面にもDBにも依存しない関数だけを置き、テスト（membership.test.ts）で見張る。
//
// - 交流（名鑑・クエスト・紹介）は無料。有料は道具（プロジェクト3つ目から）と、ギルドマスターの限定の集まり
// - 有料の判定は GIA の会員の段に乗せる（本番は applicants.plan をサーバー側で見る。画面で隠すだけにしない）
// - 実績は「集めるもの」。人に段（ランク・スター）は付けない

import type { IntroRequest, Party, Profile, Project, Quest, QuestApplication } from "./types";

/** 無料で 持っておける、自分でつくったプロジェクトの数（おわったものも 数える。消すと空く） */
export const FREE_ACTIVE_PROJECT_LIMIT = 2;

/** 入口の段。金額は予定（Stripe商品は見本を触って確定してから作る） */
export const ENTRY_PLAN_PRICE_LABEL = "月480円（税込）";

/** 有料会員になるときに 必須の「あなたの つよみ」（ステータスの つよみと 同じ欄。別の列に 持たない） */
export const STRENGTH_MIN = 20;
export const STRENGTH_MAX = 200;

/** つよみの確かめ。空・短すぎ・長すぎを 分けて知らせる */
export function strengthError(text: string): string | null {
  const t = text.trim();
  if (t === "") return "あなたの つよみを 書くと、有料会員に なれます";
  if (t.length < STRENGTH_MIN) return `もう少し くわしく 書いてください（${STRENGTH_MIN}字以上。いま ${t.length}字）`;
  if (t.length > STRENGTH_MAX) return `${STRENGTH_MAX}字までに してください`;
  return null;
}

/**
 * 無料の数に入るプロジェクトか。持ち主が自分なら、つくり方は問わない。
 * - クエストから作ったものも 数える。作れるのは クエストを出した本人だけなので、
 *   持ち主＝仕事を お願いする側。仕事を受ける側は パーティ参加なので ここに入らない
 * - おわったものも 数える。空けたいときは 消してもらう（使わない記録を 置き続けない）
 */
export function countsTowardFreeLimit(p: Project, userId: string): boolean {
  return p.owner_id === userId;
}

/** 数に入る分だけ数える（パーティで参加しているだけのものは数えない） */
export function activeOwnedProjectCount(items: Project[], userId: string): number {
  return items.filter((p) => countsTowardFreeLimit(p, userId)).length;
}

/**
 * 新しく つくれるか。有料が切れても、今あるものは消さない・見られる。
 * おわりにしても 数は減らない（減らすのは 消したときだけ）ので、「もどす」は ここを通さない。
 */
export function canActivateProject(items: Project[], userId: string, isPaid: boolean): boolean {
  return isPaid || activeOwnedProjectCount(items, userId) < FREE_ACTIVE_PROJECT_LIMIT;
}

/** 限定の集まりの くわしい内容と参加は、有料会員だけ。出したギルドマスター本人は見られる */
export function canOpenQuest(quest: Quest, viewerId: string, isPaid: boolean): boolean {
  return !quest.members_only || isPaid || quest.creator_id === viewerId;
}

/** 限定の集まりを出せるのは ギルドマスター（owner/master）だけ */
export function canPostMembersOnly(role: Profile["role"]): boolean {
  return role === "owner" || role === "master";
}

// ---------- 実績 ----------

export type AchievementData = {
  profile: Profile;
  quests: Quest[];
  applications: QuestApplication[];
  intros: IntroRequest[];
  parties: Party[];
};

export type AchievementCounts = {
  /** 出した人か参加した人として関わり、クリアになったクエスト */
  questClear: number;
  party: number;
  /** しょうかいで つながった（承諾・紹介済み。どちら側でも） */
  connected: number;
  /** ギルドマスターとして しょうかいした（紹介済みまで進んだもの） */
  introduced: number;
};

const STATUS_FIELDS = [
  "bio",
  "can_help_with",
  "strengths",
  "values_text",
  "vision",
  "looking_for",
  "want_to_meet",
] as const;

export function achievementCounts(d: AchievementData): AchievementCounts {
  const id = d.profile.id;
  const applied = (questId: string) =>
    d.applications.some((a) => a.quest_id === questId && a.user_id === id && a.status === "applied");
  const isMaster = canPostMembersOnly(d.profile.role);
  return {
    questClear: d.quests.filter((q) => q.status === "completed" && (q.creator_id === id || applied(q.id))).length,
    party: d.parties.filter((p) => p.member_ids.includes(id)).length,
    connected: d.intros.filter(
      (r) => (r.status === "accepted" || r.status === "introduced") && (r.requester_id === id || r.target_id === id),
    ).length,
    introduced: isMaster ? d.intros.filter((r) => r.status === "introduced").length : 0,
  };
}

export type Badge = { key: string; label: string; howTo: string; earned: boolean };

/** 集めるバッジ。上下は付けない（どれが偉いという順ではなく、やったことの記録） */
export function badges(d: AchievementData): Badge[] {
  const c = achievementCounts(d);
  const id = d.profile.id;
  const statusDone = STATUS_FIELDS.every((f) => d.profile[f].trim() !== "");
  const postedQuest = d.quests.some((q) => q.creator_id === id && q.status !== "withdrawn");
  const workedOut = d.intros.some((r) => r.outcome === "working" && (r.requester_id === id || r.target_id === id));
  const list: Badge[] = [
    { key: "status", label: "ステータス かんせい", howTo: "ステータスを ぜんぶ 書く", earned: statusDone },
    { key: "first-quest", label: "はじめての クエスト", howTo: "クエストを 出す", earned: postedQuest },
    { key: "first-clear", label: "はじめての クリア", howTo: "クエストを 1つ クリアする", earned: c.questClear >= 1 },
    {
      key: "connected",
      label: "つながりの はじまり",
      howTo: "しょうかいで だれかと つながる",
      earned: c.connected >= 1,
    },
    { key: "worked", label: "しごとに なった", howTo: "しょうかいが しごとに つながる", earned: workedOut },
    { key: "party-3", label: "なじみの パーティ", howTo: "パーティで 3回 動く", earned: c.party >= 3 },
  ];
  if (canPostMembersOnly(d.profile.role)) {
    list.push({
      key: "introducer",
      label: "つなぐ人",
      howTo: "ギルドマスターとして 5回 しょうかいする",
      earned: c.introduced >= 5,
    });
  }
  return list;
}
