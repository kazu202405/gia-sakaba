// プロジェクトとタスクの決まり。画面にもDBにも依存しない関数だけを置き、テスト（projects.test.ts）で見張る。
//
// - 見える人は owner と member_ids だけ。ギルドマスターにも見せない（見えると自分の整理に使われなくなる）
// - 進みぐあいは保存せず、タスクから毎回数える（別に持つと食い違う）

import type { Project, ProjectContact, ProjectStep, ProjectTask, StepRecord } from "./types";

export function canSeeProject(p: Project, userId: string): boolean {
  return p.owner_id === userId || p.member_ids.includes(userId);
}

export function visibleProjects(items: Project[], userId: string): Project[] {
  return items.filter((p) => canSeeProject(p, userId));
}

/** 本人だけか、パーティで進めるか。member_ids から決める（別の列に持たない） */
export function isPrivateProject(p: Project): boolean {
  return p.member_ids.length === 0;
}

export function projectProgress(tasks: ProjectTask[], projectId: string): { done: number; total: number } {
  const mine = tasks.filter((t) => t.project_id === projectId);
  return { done: mine.filter((t) => t.status === "done").length, total: mine.length };
}

export function tasksOf(tasks: ProjectTask[], projectId: string): ProjectTask[] {
  return tasks.filter((t) => t.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order);
}

/** "YYYY-MM-DD" どうしの日数の差（時差の影響を受けないよう UTC で数える） */
export function daysBetween(from: string, to: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** そのタスクを「自分がやる」か。担当が空なら、プロジェクトの持ち主がやる */
export function isMyTask(t: ProjectTask, project: Project, userId: string): boolean {
  return t.assignee_id === userId || (t.assignee_id === null && project.owner_id === userId);
}

/**
 * ホームに出す「しめきりが近い タスク」。
 * 見えるプロジェクトの、すすめている中の、自分がやる、まだ終わっていない、しめきりが days 日以内（すぎたものも含む）。
 */
export function upcomingTasks(
  items: Project[],
  tasks: ProjectTask[],
  userId: string,
  today: string,
  days = 7,
): { task: ProjectTask; project: Project }[] {
  const byId = new Map(visibleProjects(items, userId).map((p) => [p.id, p]));
  return tasks
    .flatMap((task) => {
      const project = byId.get(task.project_id);
      if (!project || project.status !== "active") return [];
      if (task.status === "done" || task.due_date === null) return [];
      if (!isMyTask(task, project, userId)) return [];
      if (daysBetween(today, task.due_date) > days) return [];
      return [{ task, project }];
    })
    .sort((a, b) => a.task.due_date!.localeCompare(b.task.due_date!));
}

// ---------- 期間（プロジェクト全体の日付） ----------

/** 経った日数の割合より、終わったタスクの割合がこれだけ少なければ「おくれぎみ」 */
export const BEHIND_MARGIN = 20;

const clampPct = (n: number) => Math.min(100, Math.max(0, n));

/**
 * プロジェクトの期間のどこにいるか。しめきりが無ければ null（バーを出さない）。
 * elapsedPct＝経った日数の割合、donePct＝終わったタスクの割合。
 */
export function projectSchedule(
  project: Project,
  progress: { done: number; total: number },
  today: string,
): { elapsedPct: number; donePct: number; behind: boolean } | null {
  if (!project.due_date) return null;
  const span = daysBetween(project.start_date, project.due_date);
  const elapsedPct = span <= 0 ? 100 : clampPct((daysBetween(project.start_date, today) / span) * 100);
  const donePct = progress.total === 0 ? 0 : (progress.done / progress.total) * 100;
  const behind = project.status === "active" && progress.total > 0 && donePct + BEHIND_MARGIN < elapsedPct;
  return { elapsedPct, donePct, behind };
}

// ---------- 工程表（プロジェクトの中の日付） ----------

export type DateRange = { from: string; to: string };

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * 工程表の横軸。プロジェクトの開始日〜しめきりを基本に、はみ出すタスクがあれば広げる。
 * しめきりもタスクの日付も無ければ null（工程表を出さない）。
 */
export function ganttRange(project: Project, tasks: ProjectTask[]): DateRange | null {
  const taskDates = tasks.flatMap((t) => [t.start_date, t.due_date]).filter((d): d is string => d !== null);
  if (project.due_date === null && taskDates.length === 0) return null;
  const sorted = [project.start_date, ...(project.due_date ? [project.due_date] : []), ...taskDates].sort();
  const from = sorted[0];
  const to = sorted[sorted.length - 1];
  // 1日だけの範囲は幅が0になるので、終わりを1日のばす
  return { from, to: from === to ? addDays(to, 1) : to };
}

/** 範囲の中の日付の位置（%）。範囲の外は端に寄せる */
export function datePct(range: DateRange, date: string): number {
  return clampPct((daysBetween(range.from, date) / daysBetween(range.from, range.to)) * 100);
}

/** タスクのバーの位置と幅（%）。開始日かしめきりが無いタスクは null（◆だけ出す） */
export function taskBar(range: DateRange, t: ProjectTask): { left: number; width: number } | null {
  if (!t.start_date || !t.due_date) return null;
  const left = datePct(range, t.start_date);
  return { left, width: Math.max(datePct(range, t.due_date) - left, 1) };
}

// ---------- 人ごとの すすみ ----------

export function stepsOf(steps: ProjectStep[], projectId: string): ProjectStep[] {
  return steps.filter((s) => s.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order);
}

export function contactsOf(contacts: ProjectContact[], projectId: string): ProjectContact[] {
  return contacts.filter((c) => c.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order);
}

export function recordOf(records: StepRecord[], contactId: string, stepId: string): StepRecord | undefined {
  return records.find((r) => r.contact_id === contactId && r.step_id === stepId);
}

/** 最後のステップ（営業なら契約）まで終わった人の数。途中を飛ばしていてもよい */
export function reachedLastStep(
  steps: ProjectStep[],
  contacts: ProjectContact[],
  records: StepRecord[],
  projectId: string,
): { reached: number; total: number; stepName: string } | null {
  const ordered = stepsOf(steps, projectId);
  if (ordered.length === 0) return null;
  const last = ordered[ordered.length - 1];
  const people = contactsOf(contacts, projectId);
  const reached = people.filter((c) => recordOf(records, c.id, last.id)?.done_on).length;
  return { reached, total: people.length, stepName: last.name };
}

export type UpcomingItem =
  | { kind: "task"; date: string; task: ProjectTask; project: Project }
  | { kind: "step"; date: string; contact: ProjectContact; step: ProjectStep; project: Project };

/**
 * ホームの「しめきりが近い」。タスクに加えて、人ごとの すすみの予定日（まだ終わっていないもの）も並べる。
 * 人ごとの すすみの予定は、プロジェクトの持ち主のものとして出す（パーティ全員に出すと同じ予定が重なる）。
 */
export function upcomingItems(
  data: { projects: Project[]; tasks: ProjectTask[]; steps: ProjectStep[]; contacts: ProjectContact[]; records: StepRecord[] },
  userId: string,
  today: string,
  days = 7,
): UpcomingItem[] {
  const fromTasks: UpcomingItem[] = upcomingTasks(data.projects, data.tasks, userId, today, days).map(
    ({ task, project }) => ({ kind: "task", date: task.due_date!, task, project }),
  );
  const mine = new Map(data.projects.filter((p) => p.owner_id === userId && p.status === "active").map((p) => [p.id, p]));
  const fromSteps: UpcomingItem[] = data.records.flatMap((r) => {
    if (!r.planned_on || r.done_on) return [];
    if (daysBetween(today, r.planned_on) > days) return [];
    const contact = data.contacts.find((c) => c.id === r.contact_id);
    const step = data.steps.find((s) => s.id === r.step_id);
    const project = contact ? mine.get(contact.project_id) : undefined;
    if (!contact || !step || !project || step.project_id !== project.id) return [];
    return [{ kind: "step" as const, date: r.planned_on, contact, step, project }];
  });
  return [...fromTasks, ...fromSteps].sort((a, b) => a.date.localeCompare(b.date));
}

/** しめきりの言い方。すぎたものは急ぎと同じく目立たせたいので、呼ぶ側が overdue を見る */
export function dueLabel(due: string, today: string): { text: string; overdue: boolean } {
  const d = daysBetween(today, due);
  if (d < 0) return { text: `${-d}日 すぎています`, overdue: true };
  if (d === 0) return { text: "きょうまで", overdue: false };
  return { text: `あと${d}日`, overdue: false };
}
