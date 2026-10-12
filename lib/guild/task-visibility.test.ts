import { describe, expect, it } from "vitest";
import { isTaskVisible, taskVisibleFrom, validShowBeforeDays } from "./task-visibility";
import { upcomingTasks } from "./projects";
import type { Project, ProjectTask } from "./types";

const task: ProjectTask = { id: "t", project_id: "p", title: "月次", status: "todo", assignee_id: null, start_date: null, due_date: "2026-10-28", sort_order: 0, done_at: null, recurrence_kind: "monthly", recurrence_day: 28, show_before_days: 3 };
describe("繰り返しタスクの表示開始", () => {
  it("3日前の境界と期限超過", () => {
    expect(taskVisibleFrom(task)).toBe("2026-10-25");
    expect(isTaskVisible(task, "2026-10-24")).toBe(false);
    expect(isTaskVisible(task, "2026-10-25")).toBe(true);
    expect(isTaskVisible(task, "2026-10-29")).toBe(true);
  });
  it("当日は期限日から表示", () => {
    expect(isTaskVisible({ ...task, show_before_days: 0 }, "2026-10-27")).toBe(false);
    expect(isTaskVisible({ ...task, show_before_days: 0 }, "2026-10-28")).toBe(true);
  });
  it("旧データ・常に表示・通常タスク・期限なしは隠さない", () => {
    for (const variant of [{ ...task, show_before_days: undefined }, { ...task, show_before_days: null }, { ...task, recurrence_kind: null }, { ...task, due_date: null }]) {
      expect(isTaskVisible(variant, "2026-01-01")).toBe(true);
    }
  });
  it("年またぎ・うるう年でも日付で計算", () => {
    expect(taskVisibleFrom({ ...task, due_date: "2027-01-02", show_before_days: 7 })).toBe("2026-12-26");
    expect(taskVisibleFrom({ ...task, due_date: "2028-03-01", show_before_days: 1 })).toBe("2028-02-29");
  });
  it("0〜365の整数のみ", () => {
    for (const value of [null, 0, 1, 365]) expect(validShowBeforeDays(value)).toBe(true);
    for (const value of [-1, 366, 1.5, NaN, Infinity]) expect(validShowBeforeDays(value)).toBe(false);
  });
  it("ホームも表示開始まで隠し、期限超過は残す", () => {
    const project: Project = { id: "p", owner_id: "u", member_ids: [], title: "プロジェクト", goal: "", memo: "", status: "active", source_quest_id: null, start_date: "2026-01-01", due_date: null, created_at: "2026-01-01", done_at: null };
    expect(upcomingTasks([project], [task], "u", "2026-10-24")).toHaveLength(0);
    expect(upcomingTasks([project], [task], "u", "2026-10-25")).toHaveLength(1);
    expect(upcomingTasks([project], [task], "u", "2026-10-30")).toHaveLength(1);
  });
});
