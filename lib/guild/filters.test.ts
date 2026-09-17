import { describe, expect, it } from "vitest";
import type { Project, Quest, QuestApplication } from "./types";
import { filterProjects, filterQuests, projectFilterLabel, questFilterLabel } from "./filters";

const q = (id: string, patch: Partial<Quest> = {}): Quest => ({
  id,
  creator_id: "other",
  title: id,
  category: "work",
  summary: "",
  body: "",
  region: "東京",
  deadline: null,
  member_limit: null,
  is_urgent: false,
  members_only: false,
  boss_id: null,
  status: "open",
  created_at: "2026-09-10",
  ...patch,
});

const app = (quest_id: string, user_id: string, status: QuestApplication["status"] = "applied"): QuestApplication => ({
  quest_id,
  user_id,
  message: "",
  status,
  approved_at: null,
  created_at: "2026-09-10",
});

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

const list = [
  q("open-new", { created_at: "2026-09-12" }),
  q("open-old", { created_at: "2026-09-01" }),
  q("urgent", { is_urgent: true, created_at: "2026-09-02" }),
  q("running", { status: "in_progress" }),
  q("cleared", { status: "completed" }),
  q("mine", { creator_id: "me" }),
  q("mine-gone", { creator_id: "me", status: "withdrawn" }),
  q("others-gone", { status: "withdrawn" }),
  q("joined", { id: "joined" }),
  q("consult", { category: "consult" }),
];
const apps = [app("joined", "me"), app("cleared", "me", "withdrawn")];

describe("クエストのしぼりこみ", () => {
  it("ぼしゅう中は 募集中と進行中。急ぎが先、次に新しい順", () => {
    const ids = filterQuests(list, apps, "me", "open", "").map((x) => x.id);
    expect(ids[0]).toBe("urgent");
    expect(ids[1]).toBe("open-new");
    expect(ids).toContain("running");
    expect(ids.indexOf("open-new")).toBeLessThan(ids.indexOf("open-old"));
    expect(ids).not.toContain("cleared");
  });

  it("自分が出したものには 取り下げも出す。ほかの人の取り下げは どこにも出さない", () => {
    expect(
      filterQuests(list, apps, "me", "mine", "")
        .map((x) => x.id)
        .sort(),
    ).toEqual(["mine", "mine-gone"]);
    for (const f of ["open", "joined", "done", "all"] as const) {
      expect(filterQuests(list, apps, "me", f, "").map((x) => x.id)).not.toContain("others-gone");
    }
  });

  it("参加したいは 取り消していないものだけ。クリアは 完了だけ", () => {
    expect(filterQuests(list, apps, "me", "joined", "").map((x) => x.id)).toEqual(["joined"]);
    expect(filterQuests(list, apps, "me", "done", "").map((x) => x.id)).toEqual(["cleared"]);
  });

  it("しゅるいでも しぼれる（しぼりこみと 組み合わせて効く）", () => {
    expect(filterQuests(list, apps, "me", "open", "consult").map((x) => x.id)).toEqual(["consult"]);
    expect(filterQuests(list, apps, "me", "mine", "consult")).toEqual([]);
  });

  it("しぼりこみの名前は 5つ", () => {
    expect(Object.keys(questFilterLabel)).toHaveLength(5);
  });
});

describe("プロジェクトのしぼりこみ", () => {
  const items = [
    project("a"),
    project("b", { status: "done" }),
    project("party", { member_ids: ["x"] }),
    project("party-done", { member_ids: ["x"], status: "done" }),
  ];

  it("すすめている・おわった・自分だけ・パーティ・すべて", () => {
    expect(filterProjects(items, "active").map((p) => p.id)).toEqual(["a", "party"]);
    expect(filterProjects(items, "done").map((p) => p.id)).toEqual(["b", "party-done"]);
    expect(filterProjects(items, "private").map((p) => p.id)).toEqual(["a", "b"]);
    expect(filterProjects(items, "party").map((p) => p.id)).toEqual(["party", "party-done"]);
    expect(filterProjects(items, "all")).toHaveLength(4);
    expect(Object.keys(projectFilterLabel)).toHaveLength(5);
  });
});
