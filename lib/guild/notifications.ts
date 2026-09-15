// 酒場の「おしらせ」と、クエストをなおす・取り下げるときの決まり。
// 画面にもDBにも依存しない関数だけを置き、テスト（notifications.test.ts）で見張る。
//
// - 知らせは酒場の中だけ。メール・LINEにはまだ送らない（GIAのSupabaseに独自SMTPが無いため）
// - だれに何を知らせるかは、ここ1か所で決める（画面ごとに書くと食い違う）

import type {
  GuildNotification,
  IntroRequest,
  IntroStatus,
  Quest,
  QuestApplication,
  QuestField,
} from "./types";
import { introStatusLabel } from "./labels";

export type QuestFields = Pick<Quest, QuestField>;

/** 並びは入力画面の順。「変わるところ」もこの順で出す */
export const questFieldLabel: Record<QuestField, string> = {
  category: "しゅるい",
  title: "タイトル",
  summary: "ひとことで",
  body: "くわしく",
  region: "ばしょ",
  deadline: "しめきり",
  member_limit: "にんずう",
  is_urgent: "急ぎ",
};

const QUEST_FIELDS = Object.keys(questFieldLabel) as QuestField[];

export function pickQuestFields(q: Quest): QuestFields {
  return {
    category: q.category,
    title: q.title,
    summary: q.summary,
    body: q.body,
    region: q.region,
    deadline: q.deadline,
    member_limit: q.member_limit,
    is_urgent: q.is_urgent,
  };
}

/** なおす前と後で変わった項目 */
export function diffQuestFields(before: QuestFields, after: QuestFields): QuestField[] {
  return QUEST_FIELDS.filter((f) => before[f] !== after[f]);
}

/** 承諾前の紹介依頼。クエストを取り下げると一緒に取り下げる（承諾済み・紹介済みは残す） */
export const introStatusesCancelledWithQuest: IntroStatus[] = ["requested", "reviewing", "proposed"];

export function introsToCancelOnWithdraw(questId: string, intros: IntroRequest[]): IntroRequest[] {
  return intros.filter((r) => r.quest_id === questId && introStatusesCancelledWithQuest.includes(r.status));
}

/** クエストをなおした・取り下げたときに知らせる人（参加したいを取り消していない人。出した本人は除く） */
export function recipientsOnQuestChange(quest: Quest, applications: QuestApplication[]): string[] {
  const ids = applications
    .filter((a) => a.quest_id === quest.id && a.status === "applied" && a.user_id !== quest.creator_id)
    .map((a) => a.user_id);
  return [...new Set(ids)];
}

/** 依頼した人に知らせる状態。確認中（reviewing）はマスターが開いただけなので知らせない */
const notifyRequesterOn: IntroStatus[] = [
  "proposed",
  "accepted",
  "introduced",
  "declined_by_master",
  "declined_by_target",
  "expired",
  "redirected",
];

/**
 * 紹介の状態が変わったとき、その人に知らせるか。
 * 打診された側には、打診が来たときだけ（期限切れ・取り下げは相手に見せない。design §3.4 の非対称）。
 */
export function shouldNotifyIntro(status: IntroStatus, role: "requester" | "target"): boolean {
  return role === "requester" ? notifyRequesterOn.includes(status) : status === "proposed";
}

export function unreadCount(items: GuildNotification[]): number {
  return items.filter((n) => n.read_at === null).length;
}

export type NotificationContext = {
  name: (profileId: string) => string;
  questTitle: (questId: string) => string;
  intro: (introRequestId: string) => IntroRequest | undefined;
};

/** 知らせの文面と、押したときの行き先 */
export function notificationText(n: GuildNotification, ctx: NotificationContext): { text: string; href: string } {
  const title = n.quest_id ? ctx.questTitle(n.quest_id) : "クエスト";
  switch (n.kind) {
    case "quest_applied":
      return {
        text: `${n.actor_id ? ctx.name(n.actor_id) : "だれか"}さんが「${title}」に 参加したいと伝えました`,
        href: `/guild/quests/${n.quest_id}/applicants`,
      };
    case "quest_updated": {
      // 保存された順に関係なく、入力画面の順で並べる
      const fields = QUEST_FIELDS.filter((f) => n.changed_fields.includes(f))
        .map((f) => questFieldLabel[f])
        .join("・");
      return {
        text: `「${title}」の内容が なおされました${fields ? `（${fields}）` : ""}`,
        href: `/guild/quests/${n.quest_id}`,
      };
    }
    case "quest_withdrawn":
      return { text: `「${title}」が 取り下げられました`, href: `/guild/quests/${n.quest_id}` };
    case "intro_progress": {
      const r = n.intro_request_id ? ctx.intro(n.intro_request_id) : undefined;
      if (!r || !n.intro_status) return { text: "しょうかいの おしらせが あります", href: "/guild/requests" };
      if (n.user_id === r.target_id) {
        return { text: `${ctx.name(r.requester_id)}さんとの しょうかいの打診が 届きました`, href: "/guild/requests" };
      }
      return {
        text: `${ctx.name(r.target_id)}さんへの しょうかい：${introStatusLabel[n.intro_status].requester}`,
        href: "/guild/requests",
      };
    }
  }
}
