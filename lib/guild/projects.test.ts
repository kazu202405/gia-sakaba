import { describe, expect, it } from "vitest";
import type { Project, ProjectTask } from "./types";
import {
  canSeeProject,
  daysBetween,
  dueLabel,
  isPrivateProject,
  projectProgress,
  upcomingTasks,
  visibleProjects,
} from "./projects";
import { MASTER_ID, ME_ID, projects } from "./mock-data";

const project = (id: string, patch: Partial<Project> = {}): Project => ({
  id,
  owner_id: "me",
  title: id,
  goal: "",
  source_quest_id: null,
  member_ids: [],
  status: "active",
  due_date: null,
  created_at: "2026-09-01",
  done_at: null,
  ...patch,
});

const task = (id: string, project_id: string, patch: Partial<ProjectTask> = {}): ProjectTask => ({
  id,
  project_id,
  title: id,
  status: "todo",
  assignee_id: null,
  due_date: "2026-09-16",
  sort_order: 1,
  done_at: null,
  ...patch,
});

describe("見える範囲", () => {
  it("本人だけのプロジェクトは 本人にしか見えない", () => {
    const p = project("a");
    expect(canSeeProject(p, "me")).toBe(true);
    expect(canSeeProject(p, "other")).toBe(false);
    expect(isPrivateProject(p)).toBe(true);
  });

  it("パーティのプロジェクトは メンバーに見え、ほかの人には見えない", () => {
    const p = project("a", { member_ids: ["friend"] });
    expect(canSeeProject(p, "friend")).toBe(true);
    expect(canSeeProject(p, "other")).toBe(false);
    expect(isPrivateProject(p)).toBe(false);
  });

  it("見本データ：ギルドマスターにも ほかの人の本人だけのプロジェクトは見えない", () => {
    const seenByMaster = visibleProjects(projects, MASTER_ID).map((p) => p.id);
    expect(seenByMaster).not.toContain("pj-hp");
    expect(visibleProjects(projects, ME_ID).map((p) => p.id)).not.toContain("pj-private-other");
  });
});

describe("projectProgress", () => {
  it("そのプロジェクトのタスクだけ数える", () => {
    const tasks = [task("1", "a", { status: "done" }), task("2", "a"), task("3", "b", { status: "done" })];
    expect(projectProgress(tasks, "a")).toEqual({ done: 1, total: 2 });
    expect(projectProgress(tasks, "none")).toEqual({ done: 0, total: 0 });
  });
});

describe("upcomingTasks", () => {
  const today = "2026-09-15";
  const items = [
    project("mine"),
    project("party", { owner_id: "leader", member_ids: ["me"] }),
    project("hidden", { owner_id: "other" }),
    project("finished", { status: "done" }),
  ];

  it("自分がやる・未完了・7日以内（すぎたものも）を しめきり順に", () => {
    const tasks = [
      task("later", "mine", { due_date: "2026-09-22" }),
      task("overdue", "mine", { due_date: "2026-09-13" }),
      task("too-far", "mine", { due_date: "2026-09-23" }),
      task("no-due", "mine", { due_date: null }),
      task("done", "mine", { status: "done" }),
      task("assigned-me", "party", { assignee_id: "me", due_date: "2026-09-16" }),
      task("assigned-other", "party", { assignee_id: "leader" }),
      task("unassigned-party", "party"),
      task("hidden", "hidden"),
      task("finished-project", "finished"),
    ];
    expect(upcomingTasks(items, tasks, "me", today).map((r) => r.task.id)).toEqual(["overdue", "assigned-me", "later"]);
  });
});

describe("しめきりの日数", () => {
  it("月をまたいでも 数えられる", () => {
    expect(daysBetween("2026-09-29", "2026-10-02")).toBe(3);
  });

  it("すぎた・きょう・あと何日", () => {
    expect(dueLabel("2026-09-13", "2026-09-15")).toEqual({ text: "2日 すぎています", overdue: true });
    expect(dueLabel("2026-09-15", "2026-09-15")).toEqual({ text: "きょうまで", overdue: false });
    expect(dueLabel("2026-09-18", "2026-09-15")).toEqual({ text: "あと3日", overdue: false });
  });
});
