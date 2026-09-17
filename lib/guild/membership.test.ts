import { describe, expect, it } from "vitest";
import type { IntroRequest, Profile, Project, Quest } from "./types";
import {
  FREE_ACTIVE_PROJECT_LIMIT,
  achievementCounts,
  activeOwnedProjectCount,
  badges,
  canActivateProject,
  canOpenQuest,
  canPostMembersOnly,
  type AchievementData,
} from "./membership";
import { profiles, quests } from "./mock-data";

const project = (id: string, patch: Partial<Project> = {}): Project => ({
  id,
  owner_id: "me",
  title: id,
  goal: "",
  memo: "",
  source_quest_id: null,
  member_ids: [],
  status: "active",
  start_date: "2026-09-01",
  due_date: null,
  created_at: "2026-09-01",
  done_at: null,
  ...patch,
});

describe("プロジェクトの数（無料は すすめている数で2つまで）", () => {
  const items = [
    project("a"),
    project("b"),
    project("done", { status: "done" }),
    project("joined", { owner_id: "other", member_ids: ["me"] }),
  ];

  it("数えるのは 持ち主として すすめているものだけ", () => {
    expect(FREE_ACTIVE_PROJECT_LIMIT).toBe(2);
    expect(activeOwnedProjectCount(items, "me")).toBe(2);
  });

  it("無料は3つ目を すすめられない。1つ おわらせれば また すすめられる。有料は いくつでも", () => {
    expect(canActivateProject(items, "me", false)).toBe(false);
    expect(canActivateProject(items, "me", true)).toBe(true);
    const oneFinished = items.map((p) => (p.id === "b" ? { ...p, status: "done" as const } : p));
    expect(canActivateProject(oneFinished, "me", false)).toBe(true);
  });

  it("パーティで参加しているだけの人は 上限に数えない", () => {
    expect(canActivateProject(items, "other", false)).toBe(true);
  });
});

describe("限定の集まり", () => {
  const q = { id: "q", creator_id: "master", members_only: true } as Quest;

  it("くわしい内容は 有料会員と 出した本人だけ。限定でなければ だれでも", () => {
    expect(canOpenQuest(q, "free", false)).toBe(false);
    expect(canOpenQuest(q, "paid", true)).toBe(true);
    expect(canOpenQuest(q, "master", false)).toBe(true);
    expect(canOpenQuest({ ...q, members_only: false }, "free", false)).toBe(true);
  });

  it("出せるのは ギルドマスターだけ", () => {
    expect(canPostMembersOnly("owner")).toBe(true);
    expect(canPostMembersOnly("master")).toBe(true);
    expect(canPostMembersOnly("member")).toBe(false);
  });

  it("見本データ：限定の集まりは ギルドマスターが出したものだけ", () => {
    const limited = quests.filter((x) => x.members_only);
    expect(limited.length).toBeGreaterThan(0);
    for (const x of limited) {
      const role = profiles.find((p) => p.id === x.creator_id)?.role;
      expect(canPostMembersOnly(role ?? "member")).toBe(true);
    }
  });
});

describe("実績（集めるもの・段は付けない）", () => {
  const me = { ...profiles[0], id: "me", role: "member" } as Profile;
  const intro = (patch: Partial<IntroRequest>): IntroRequest => ({
    id: "r",
    requester_id: "me",
    target_id: "x",
    quest_id: null,
    purpose: "work",
    message: "",
    status: "accepted",
    outcome: null,
    created_at: "2026-09-10",
    updated_at: "2026-09-10",
    ...patch,
  });
  const data = (patch: Partial<AchievementData> = {}): AchievementData => ({
    profile: me,
    quests: [
      { ...quests[0], id: "c1", creator_id: "me", status: "completed" },
      { ...quests[0], id: "c2", creator_id: "other", status: "completed" },
      { ...quests[0], id: "c3", creator_id: "other", status: "completed" },
    ],
    applications: [
      { quest_id: "c2", user_id: "me", message: "", status: "applied", created_at: "2026-09-01" },
      { quest_id: "c3", user_id: "me", message: "", status: "withdrawn", created_at: "2026-09-01" },
    ],
    intros: [
      intro({ id: "1" }),
      intro({ id: "2", requester_id: "y", target_id: "me", status: "introduced", outcome: "working" }),
      intro({ id: "3", status: "reviewing" }),
      intro({ id: "4", requester_id: "y", target_id: "z", status: "introduced" }),
    ],
    parties: [
      { id: "p1", name: "", quest_id: "c1", member_ids: ["me"], formed_at: "2026-09-01" },
      { id: "p2", name: "", quest_id: "c2", member_ids: ["other"], formed_at: "2026-09-01" },
    ],
    ...patch,
  });

  it("数：クリアは出した・参加した（取り消しは除く）、つながりは どちら側でも承諾・紹介済み", () => {
    expect(achievementCounts(data())).toEqual({ questClear: 2, party: 1, connected: 2, introduced: 0 });
  });

  it("バッジ：取れたものと まだのものが並び、ギルドマスターにだけ「つなぐ人」がある", () => {
    const got = Object.fromEntries(badges(data()).map((b) => [b.key, b.earned]));
    expect(got).toMatchObject({
      "first-quest": true,
      "first-clear": true,
      connected: true,
      worked: true,
      "party-3": false,
    });
    // 取り下げたクエストしか出していなければ「はじめての クエスト」は取れない
    const withdrawnOnly = data({ quests: [{ ...quests[0], id: "w", creator_id: "me", status: "withdrawn" }] });
    expect(badges(withdrawnOnly).find((b) => b.key === "first-quest")?.earned).toBe(false);
    expect(got).not.toHaveProperty("introducer");
    const master = badges(data({ profile: { ...me, role: "owner" } }));
    expect(master.map((b) => b.key)).toContain("introducer");
  });
});
