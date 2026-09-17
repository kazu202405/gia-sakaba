// プロジェクトとタスクの決まり。画面にもDBにも依存しない関数だけを置き、テスト（projects.test.ts）で見張る。
//
// - 見える人は owner と member_ids だけ。ギルドマスターにも見せない（見えると自分の整理に使われなくなる）
// - 進みぐあいは保存せず、タスクから毎回数える（別に持つと食い違う）

import type { Project, ProjectTask } from "./types";

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

/** しめきりの言い方。すぎたものは急ぎと同じく目立たせたいので、呼ぶ側が overdue を見る */
export function dueLabel(due: string, today: string): { text: string; overdue: boolean } {
  const d = daysBetween(today, due);
  if (d < 0) return { text: `${-d}日 すぎています`, overdue: true };
  if (d === 0) return { text: "きょうまで", overdue: false };
  return { text: `あと${d}日`, overdue: false };
}
