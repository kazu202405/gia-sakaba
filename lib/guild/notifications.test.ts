import { describe, expect, it } from "vitest";
import type { GuildNotification, IntroRequest, Quest, QuestApplication } from "./types";
import {
  diffQuestFields,
  introsToCancelOnWithdraw,
  notificationText,
  pickQuestFields,
  recipientsOnQuestChange,
  shouldNotifyIntro,
  unreadCount,
} from "./notifications";

const quest: Quest = {
  id: "q1",
  creator_id: "owner",
  title: "LPの文章",
  category: "work",
  summary: "文章を書いてほしい",
  body: "くわしく",
  region: "東京（オンライン可）",
  deadline: null,
  member_limit: 2,
  is_urgent: false,
  members_only: false,
  status: "open",
  created_at: "2026-09-13",
};

const intro = (id: string, status: IntroRequest["status"], questId: string | null = "q1"): IntroRequest => ({
  id,
  requester_id: "owner",
  target_id: "a",
  quest_id: questId,
  purpose: "work",
  message: "",
  status,
  outcome: null,
  created_at: "2026-09-14",
  updated_at: "2026-09-14",
});

const note = (patch: Partial<GuildNotification>): GuildNotification => ({
  id: "n",
  user_id: "owner",
  kind: "quest_applied",
  actor_id: null,
  quest_id: "q1",
  intro_request_id: null,
  intro_status: null,
  changed_fields: [],
  read_at: null,
  created_at: "2026-09-15",
  ...patch,
});

describe("diffQuestFields", () => {
  it("何も変えなければ空", () => {
    expect(diffQuestFields(pickQuestFields(quest), pickQuestFields(quest))).toEqual([]);
  });

  it("変わった項目を入力画面の順で返す（null→日付も変更として数える）", () => {
    const after = { ...pickQuestFields(quest), is_urgent: true, deadline: "2026-09-20", title: "LPの文章（急ぎ）" };
    expect(diffQuestFields(pickQuestFields(quest), after)).toEqual(["title", "deadline", "is_urgent"]);
  });

  it("にんずうを『きめない』に戻すのも変更", () => {
    expect(diffQuestFields(pickQuestFields(quest), { ...pickQuestFields(quest), member_limit: null })).toEqual([
      "member_limit",
    ]);
  });
});

describe("introsToCancelOnWithdraw", () => {
  it("承諾前（届いた・確認中・打診中）だけを一緒に取り下げる", () => {
    const intros = [
      intro("r1", "requested"),
      intro("r2", "reviewing"),
      intro("r3", "proposed"),
      intro("r4", "accepted"),
      intro("r5", "introduced"),
      intro("r6", "declined_by_target"),
      intro("r7", "reviewing", "other-quest"),
      intro("r8", "reviewing", null),
    ];
    expect(introsToCancelOnWithdraw("q1", intros).map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
  });
});

describe("recipientsOnQuestChange", () => {
  it("取り消した人・出した本人・ほかのクエストの人には送らない。同じ人は1回", () => {
    const apps: QuestApplication[] = [
      { quest_id: "q1", user_id: "a", message: "", status: "applied", created_at: "2026-09-14" },
      { quest_id: "q1", user_id: "a", message: "", status: "applied", created_at: "2026-09-15" },
      { quest_id: "q1", user_id: "b", message: "", status: "withdrawn", created_at: "2026-09-14" },
      { quest_id: "q1", user_id: "owner", message: "", status: "applied", created_at: "2026-09-14" },
      { quest_id: "q2", user_id: "c", message: "", status: "applied", created_at: "2026-09-14" },
    ];
    expect(recipientsOnQuestChange(quest, apps)).toEqual(["a"]);
  });
});

describe("shouldNotifyIntro", () => {
  it("依頼した人：確認中は知らせず、打診・承諾・辞退などは知らせる", () => {
    expect(shouldNotifyIntro("reviewing", "requester")).toBe(false);
    expect(shouldNotifyIntro("proposed", "requester")).toBe(true);
    expect(shouldNotifyIntro("accepted", "requester")).toBe(true);
    expect(shouldNotifyIntro("declined_by_target", "requester")).toBe(true);
    expect(shouldNotifyIntro("cancelled", "requester")).toBe(false);
  });

  it("打診された人：打診が来たときだけ（期限切れ・取り下げは見せない）", () => {
    expect(shouldNotifyIntro("proposed", "target")).toBe(true);
    for (const s of ["requested", "reviewing", "accepted", "expired", "cancelled", "declined_by_master"] as const) {
      expect(shouldNotifyIntro(s, "target")).toBe(false);
    }
  });
});

describe("notificationText", () => {
  const ctx = {
    name: (id: string) => ({ a: "小松 由佳", owner: "森田 陽介" })[id] ?? "?",
    questTitle: (id: string) => (id === "q1" ? "LPの文章" : "?"),
    intro: (id: string) => (id === "r1" ? intro("r1", "proposed") : undefined),
  };

  it("参加の希望は、参加したい人の一覧へ", () => {
    expect(notificationText(note({ actor_id: "a" }), ctx)).toEqual({
      text: "小松 由佳さんが「LPの文章」に 参加したいと伝えました",
      href: "/guild/quests/q1/applicants",
    });
  });

  it("なおされた知らせには、変わった項目が入力画面の順で付く（保存された順に左右されない）", () => {
    const t = notificationText(note({ kind: "quest_updated", changed_fields: ["deadline", "body"] }), ctx);
    expect(t.text).toBe("「LPの文章」の内容が なおされました（くわしく・しめきり）");
    expect(t.href).toBe("/guild/quests/q1");
  });

  it("変わった項目が無ければ、かっこを付けない", () => {
    expect(notificationText(note({ kind: "quest_updated" }), ctx).text).toBe("「LPの文章」の内容が なおされました");
  });

  it("紹介の進みは、打診された人と依頼した人で文面が違う", () => {
    const toTarget = notificationText(
      note({ kind: "intro_progress", user_id: "a", quest_id: null, intro_request_id: "r1", intro_status: "proposed" }),
      ctx,
    );
    expect(toTarget.text).toBe("森田 陽介さんとの しょうかいの打診が 届きました");
    const toRequester = notificationText(
      note({ kind: "intro_progress", user_id: "owner", quest_id: null, intro_request_id: "r1", intro_status: "proposed" }),
      ctx,
    );
    expect(toRequester.text).toBe("小松 由佳さんへの しょうかい：相手に打診中");
  });

  it("依頼が見つからなくても落ちない", () => {
    const t = notificationText(note({ kind: "intro_progress", intro_request_id: "none", intro_status: "accepted" }), ctx);
    expect(t.href).toBe("/guild/requests");
  });
});

describe("unreadCount", () => {
  it("読んでいないものだけ数える", () => {
    expect(unreadCount([note({ id: "1" }), note({ id: "2", read_at: "2026-09-15" }), note({ id: "3" })])).toBe(2);
  });
});
