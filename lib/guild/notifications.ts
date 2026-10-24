// 酒場の「おしらせ」と、クエストをなおす・取り下げるときの決まり。
// 画面にもDBにも依存しない関数だけを置き、テスト（notifications.test.ts）で見張る。
//
// - 知らせは酒場の中だけ。メール・LINEにはまだ送らない（GIAのSupabaseに独自SMTPが無いため）
// - だれに何を知らせるかは、ここ1か所で決める（画面ごとに書くと食い違う）

import type { GuildNotification, IntroRequest, IntroStatus, Quest, QuestApplication, QuestField } from "./types";
import { introStatusLabel } from "./labels";
import { makeWording, type Wording } from "./store-words";
import { GIA_WORDS } from "./words/gia";

export type QuestFields = Pick<Quest, QuestField>;

/** 並びは入力画面の順。「変わるところ」もこの順で出す */
export function questFieldLabelFor(w: Wording): Record<QuestField, string> {
  return {
    category: w("form.fieldKind"),
    title: "タイトル",
    summary: "ひとことで",
    body: w("form.fieldBody"),
    region: w("form.fieldPlace"),
    deadline: w("form.fieldDeadline"),
    member_limit: w("form.fieldHeadcount"),
    is_urgent: "急ぎ",
  };
}
/** GIAの酒場の言葉。店の画面は questFieldLabelFor(store.w) を使う */
export const questFieldLabel: Record<QuestField, string> = questFieldLabelFor(makeWording(GIA_WORDS));

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
  /** 店の中の道を作る（store.path）。行き先は今の店の道にする */
  path: (rest: string) => string;
  /** 店の言葉（store.w）。知らせの文面は店ごとの言葉の表から作る */
  w: Wording;
};

/** 知らせの文面と、押したときの行き先 */
export function notificationText(n: GuildNotification, ctx: NotificationContext): { text: string; href: string } {
  const w = ctx.w;
  const title = n.quest_id ? ctx.questTitle(n.quest_id) : w("notif.questFallback");
  switch (n.kind) {
    case "quest_applied":
      return {
        text: w("notif.questApplied", { name: n.actor_id ? ctx.name(n.actor_id) : "だれか", title }),
        href: ctx.path(`/quests/${n.quest_id}/applicants`),
      };
    case "quest_updated": {
      // 保存された順に関係なく、入力画面の順で並べる
      const fields = QUEST_FIELDS.filter((f) => n.changed_fields.includes(f))
        .map((f) => questFieldLabelFor(w)[f])
        .join("・");
      return {
        text: w("notif.questUpdated", { title, fields: fields ? `（${fields}）` : "" }),
        href: ctx.path(`/quests/${n.quest_id}`),
      };
    }
    case "quest_withdrawn":
      return { text: w("notif.questWithdrawn", { title }), href: ctx.path(`/quests/${n.quest_id}`) };
    case "gathering_approved":
      return { text: w("notif.gatheringApproved", { title }), href: ctx.path(`/quests/${n.quest_id}`) };
    case "gathering_declined":
      return { text: w("notif.gatheringDeclined", { title }), href: ctx.path(`/quests/${n.quest_id}`) };
    case "schedule_decided":
      return { text: w("notif.scheduleDecided", { title }), href: ctx.path(`/quests/${n.quest_id}`) };
    case "consult_request":
      return { text: w("notif.consult", { by: n.actor_id ? w("notif.by", { name: ctx.name(n.actor_id) }) : "" }), href: ctx.path("/master#master-consults-title") };
    case "feedback_report":
      return { text: w("notif.feedback", { by: n.actor_id ? w("notif.by", { name: ctx.name(n.actor_id) }) : "" }), href: ctx.path("/master#master-feedback-title") };
    case "member_joined":
      return { text: w("notif.memberJoined", { name: n.actor_id ? ctx.name(n.actor_id) : "新しいメンバー" }), href: n.actor_id ? ctx.path(`/members/${n.actor_id}`) : ctx.path("/members") };
    case "member_pending":
      return { text: w("notif.memberPending"), href: ctx.path("/master#master-pending-members-title") };
    case "profile_draft_waiting":
      return {
        text: w("notif.draftWaiting", { byGa: n.actor_id ? w("notif.byGa", { name: ctx.name(n.actor_id) }) : "" }),
        href: ctx.path("/me/status/draft"),
      };
    case "profile_draft_applied":
      return { text: w("notif.draftApplied", { name: n.actor_id ? ctx.name(n.actor_id) : "メンバー" }), href: n.actor_id ? ctx.path(`/members/${n.actor_id}`) : ctx.path("/members") };
    case "profile_draft_declined":
      return { text: w("notif.draftDeclined", { name: n.actor_id ? ctx.name(n.actor_id) : "メンバー" }), href: n.actor_id ? ctx.path(`/members/${n.actor_id}`) : ctx.path("/members") };
    case "intro_progress": {
      const r = n.intro_request_id ? ctx.intro(n.intro_request_id) : undefined;
      if (!r || !n.intro_status) return { text: w("notif.introFallback"), href: ctx.path("/requests") };
      if (n.user_id === r.target_id) {
        return { text: w("notif.introAsked", { name: ctx.name(r.requester_id) }), href: ctx.path("/requests") };
      }
      return {
        text: w("notif.introProgress", { name: ctx.name(r.target_id), status: introStatusLabel[n.intro_status].requester }),
        href: ctx.path("/requests"),
      };
    }
  }
}

/**
 * 限定の集まりへの申し込みを ギルドマスターが決めたときに、申し込んだ本人へ送る知らせ。
 * 見送りも必ず知らせる（知らせないと、承認待ちのまま ずっと待たせてしまう）。
 */
export function gatheringDecisionNotification(
  app: { quest_id: string; user_id: string },
  approve: boolean,
  masterId: string,
  today: string,
  id: string,
): GuildNotification {
  return {
    id,
    user_id: app.user_id,
    kind: approve ? "gathering_approved" : "gathering_declined",
    actor_id: masterId,
    quest_id: app.quest_id,
    intro_request_id: null,
    intro_status: null,
    changed_fields: [],
    read_at: null,
    created_at: today,
  };
}
