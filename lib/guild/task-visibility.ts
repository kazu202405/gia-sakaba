import type { ProjectTask } from "./types";

export function validShowBeforeDays(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 0 && value <= 365);
}

export function taskVisibleFrom(task: Pick<ProjectTask, "recurrence_kind" | "due_date" | "show_before_days">): string | null {
  if (!task.recurrence_kind || !task.due_date || task.show_before_days == null || !validShowBeforeDays(task.show_before_days)) return null;
  const date = new Date(`${task.due_date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - task.show_before_days);
  return date.toISOString().slice(0, 10);
}

export function isTaskVisible(task: Pick<ProjectTask, "recurrence_kind" | "due_date" | "show_before_days">, today: string): boolean {
  const from = taskVisibleFrom(task);
  return from === null || from <= today;
}
