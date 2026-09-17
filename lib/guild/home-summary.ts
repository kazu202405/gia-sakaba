// ホームの「おしらせ」窓に出す数。画面にもDBにも依存しない関数だけを置き、テスト（home-summary.test.ts）で見張る。
//
// - いらい：自分あての知らせ（参加したい・しょうかいの打診）のうち、まだ読んでいないもの。既読・未読は おしらせ と共通
// - あたらしい ギルドメンバー／クエスト：その一覧を最後に開いた時刻より後に 入った・出たもの。
//   全員あての出来事なので1件ずつ既読を持たず、「最後に開いた時刻」を1人2つだけ持つ

import type { GuildNotification, IntroRequest, Profile, Quest } from "./types";

/** 一覧を最後に開いた時刻。まだ一度も開いていなければ null（加入した時刻から数える） */
export type SeenAt = { members_seen_at: string | null; quests_seen_at: string | null };

/** 「いらいが きています」に数える知らせか */
export function isIncomingRequest(n: GuildNotification, intro: (id: string) => IntroRequest | undefined): boolean {
  if (n.kind === "quest_applied") return true;
  if (n.kind === "intro_progress" && n.intro_request_id && n.intro_status === "proposed") {
    // 自分が頼んだしょうかいの進み具合は「きている いらい」ではない
    return intro(n.intro_request_id)?.target_id === n.user_id;
  }
  return false;
}

export function countIncomingRequests(
  items: GuildNotification[],
  intro: (id: string) => IntroRequest | undefined,
): number {
  return items.filter((n) => n.read_at === null && isIncomingRequest(n, intro)).length;
}

/** 開いた時刻が無いときは、自分が加入した時刻から数える（加入前の全員を「新しい」と出さない） */
function since(seenAt: string | null, myJoinedAt: string): string {
  return seenAt ?? myJoinedAt;
}

export function countNewMembers(profiles: Profile[], me: Profile, seen: SeenAt): number {
  const from = since(seen.members_seen_at, me.joined_at);
  return profiles.filter((p) => p.id !== me.id && p.joined_at > from).length;
}

/** 取り下げ・クリア済みは けいじばんに「発生」していないので数えない。自分が出したものも数えない */
export function countNewQuests(quests: Quest[], me: Profile, seen: SeenAt): number {
  const from = since(seen.quests_seen_at, me.joined_at);
  return quests.filter((q) => q.status === "open" && q.creator_id !== me.id && q.created_at > from).length;
}
