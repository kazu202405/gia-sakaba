import { describe, expect, it } from "vitest";
import type {
  IntroRequest,
  Project,
  ProjectContact,
  ProjectStep,
  ProjectTask,
  Quest,
  QuestApplication,
  StepRecord,
} from "./types";
import {
  addDays,
  canMakeProject,
  canSeeProject,
  connectedPeople,
  partyCandidates,
  projectOfQuest,
  datePct,
  daysBetween,
  dueLabel,
  ganttRange,
  isPrivateProject,
  projectProgress,
  projectSchedule,
  reachedLastStep,
  taskBar,
  upcomingItems,
  upcomingTasks,
  visibleProjects,
} from "./projects";
import { MASTER_ID, ME_ID, projects } from "./mock-data";

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

const task = (id: string, project_id: string, patch: Partial<ProjectTask> = {}): ProjectTask => ({
  id,
  project_id,
  title: id,
  status: "todo",
  assignee_id: null,
  start_date: null,
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

describe("projectSchedule", () => {
  const p = project("a", { start_date: "2026-09-01", due_date: "2026-09-11" });

  it("しめきりが無ければ バーを出さない", () => {
    expect(projectSchedule(project("b"), { done: 0, total: 1 }, "2026-09-05")).toBeNull();
  });

  it("経った日数とタスクの割合を出し、差が大きいときだけ おくれぎみ", () => {
    expect(projectSchedule(p, { done: 1, total: 4 }, "2026-09-06")).toEqual({ elapsedPct: 50, donePct: 25, behind: true });
    expect(projectSchedule(p, { done: 2, total: 4 }, "2026-09-06")?.behind).toBe(false);
  });

  it("タスク0件・おわったプロジェクトは おくれぎみにしない。期間の外は端に寄せる", () => {
    expect(projectSchedule(p, { done: 0, total: 0 }, "2026-09-10")?.behind).toBe(false);
    expect(projectSchedule({ ...p, status: "done" }, { done: 0, total: 3 }, "2026-09-20")).toMatchObject({
      elapsedPct: 100,
      behind: false,
    });
    expect(projectSchedule(p, { done: 0, total: 3 }, "2026-08-20")?.elapsedPct).toBe(0);
  });
});

describe("工程表", () => {
  it("横軸は プロジェクトの期間を基本に、はみ出すタスクで広げる", () => {
    const p = project("a", { start_date: "2026-09-05", due_date: "2026-09-20" });
    expect(ganttRange(p, [task("1", "a", { start_date: "2026-09-03", due_date: "2026-09-25" })])).toEqual({
      from: "2026-09-03",
      to: "2026-09-25",
    });
  });

  it("しめきりもタスクの日付も無ければ 工程表を出さない", () => {
    expect(ganttRange(project("a"), [task("1", "a", { due_date: null })])).toBeNull();
  });

  it("1日だけの範囲でも 幅が0にならない", () => {
    const r = ganttRange(project("a", { start_date: "2026-09-05" }), [task("1", "a", { due_date: "2026-09-05" })]);
    expect(r).toEqual({ from: "2026-09-05", to: "2026-09-06" });
  });

  it("バーの位置と幅。開始日が無いタスクは バーにしない", () => {
    const range = { from: "2026-09-01", to: "2026-09-11" };
    expect(taskBar(range, task("1", "a", { start_date: "2026-09-03", due_date: "2026-09-06" }))).toEqual({ left: 20, width: 30 });
    expect(taskBar(range, task("2", "a", { start_date: null }))).toBeNull();
    expect(datePct(range, "2026-12-01")).toBe(100);
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });
});

describe("あいてごとの じょうきょう", () => {
  const steps: ProjectStep[] = [
    { id: "s2", project_id: "a", name: "契約", sort_order: 2 },
    { id: "s1", project_id: "a", name: "初回アポ", sort_order: 1 },
  ];
  const contacts: ProjectContact[] = [
    { id: "c1", project_id: "a", label: "Aさん", memo: "", sort_order: 1 },
    { id: "c2", project_id: "a", label: "Bさん", memo: "", sort_order: 2 },
  ];
  const records: StepRecord[] = [
    { contact_id: "c1", step_id: "s2", planned_on: null, done_on: "2026-09-10" },
    { contact_id: "c2", step_id: "s2", planned_on: "2026-09-18", done_on: null },
    { contact_id: "c2", step_id: "s1", planned_on: "2026-09-16", done_on: null },
  ];

  it("最後のステップを並び順で決めて、終わった人を数える（途中を飛ばしてもよい）", () => {
    expect(reachedLastStep(steps, contacts, records, "a")).toEqual({ reached: 1, total: 2, stepName: "契約" });
    expect(reachedLastStep(steps, contacts, records, "none")).toBeNull();
  });

  it("ホームの しめきりが近い に、持ち主の まだ終わっていない予定だけが タスクと日付順に並ぶ", () => {
    const items = upcomingItems(
      {
        projects: [project("a"), project("b", { owner_id: "leader", member_ids: ["me"] })],
        tasks: [task("t", "a", { due_date: "2026-09-17" })],
        steps: [...steps, { id: "sb", project_id: "b", name: "契約", sort_order: 1 }],
        contacts: [...contacts, { id: "cb", project_id: "b", label: "Zさん", memo: "", sort_order: 1 }],
        records: [...records, { contact_id: "cb", step_id: "sb", planned_on: "2026-09-16", done_on: null }],
      },
      "me",
      "2026-09-15",
    );
    const labels = items.map((i) => (i.kind === "task" ? i.task.id : i.contact.label + ":" + i.step.name));
    expect(labels).toEqual(["Bさん:初回アポ", "t", "Bさん:契約"]);
  });
});

describe("クエストから プロジェクトにする", () => {
  const quest = { id: "q1", creator_id: "me", status: "open" } as Quest;
  const app = (user_id: string, status: QuestApplication["status"] = "applied"): QuestApplication => ({
    quest_id: "q1",
    user_id,
    message: "",
    status,
    approved_at: null,
    created_at: "2026-09-10",
  });
  const intro = (target_id: string, status: IntroRequest["status"], patch: Partial<IntroRequest> = {}): IntroRequest => ({
    id: `r-${target_id}`,
    requester_id: "me",
    target_id,
    quest_id: "q1",
    purpose: "work",
    message: "",
    status,
    outcome: null,
    created_at: "2026-09-10",
    updated_at: "2026-09-10",
    ...patch,
  });

  it("パーティに入れられるのは、紹介が承諾された・紹介済みの人だけ", () => {
    const apps = [app("accepted"), app("introduced"), app("reviewing"), app("none"), app("gone", "withdrawn")];
    const intros = [
      intro("accepted", "accepted"),
      intro("introduced", "introduced"),
      intro("reviewing", "reviewing"),
      // ほかのクエストの紹介や、ほかの人が出した紹介では入れない
      intro("none", "accepted", { quest_id: "q2" }),
      intro("none", "accepted", { requester_id: "someone" }),
    ];
    expect(partyCandidates(quest, apps, intros)).toEqual([
      { user_id: "accepted", canJoin: true },
      { user_id: "introduced", canJoin: true },
      { user_id: "reviewing", canJoin: false },
      { user_id: "none", canJoin: false },
    ]);
  });

  it("作れるのは出した人だけ・募集中か進行中だけ", () => {
    expect(canMakeProject(quest, "me")).toBe(true);
    expect(canMakeProject(quest, "other")).toBe(false);
    expect(canMakeProject({ ...quest, status: "in_progress" }, "me")).toBe(true);
    expect(canMakeProject({ ...quest, status: "withdrawn" }, "me")).toBe(false);
    expect(canMakeProject({ ...quest, status: "completed" }, "me")).toBe(false);
  });

  it("あとから足せるのは、どちら向きでも紹介が承諾・紹介済みでつながっている人だけ（重複なし）", () => {
    const intros = [
      intro("a", "accepted"),
      intro("b", "introduced", { quest_id: null }),
      intro("c", "reviewing"),
      intro("d", "cancelled"),
      intro("me", "accepted", { id: "r-x", requester_id: "e" }),
      intro("a", "introduced", { id: "r-dup" }),
      intro("z", "accepted", { requester_id: "stranger" }),
    ];
    expect(connectedPeople("me", intros)).toEqual(["a", "b", "e"]);
  });

  it("1クエストにつき1つ。作ってあれば それを返す", () => {
    const items = [project("a"), project("b", { source_quest_id: "q1" })];
    expect(projectOfQuest(items, "q1")?.id).toBe("b");
    expect(projectOfQuest(items, "q9")).toBeUndefined();
  });
});
