// プロジェクトとタスクの変更を、ホーム・一覧・くわしい画面で共有する（見本用）。
// 本番では sakaba.projects / sakaba.project_tasks をRPCで更新し、ここはその読み込みに差し替える。

import type { Project, ProjectTask } from "./types";
import { ME_ID, TODAY, projectTasks, projects } from "./mock-data";

type State = { projects: Project[]; tasks: ProjectTask[] };

const initial: State = { projects, tasks: projectTasks };
let state: State = initial;
const listeners = new Set<() => void>();
let seq = 0;

function set(next: State) {
  state = next;
  listeners.forEach((fn) => fn());
}

export function subscribeProjects(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProjectState(): State {
  return state;
}

/** サーバー側の描画とはじめの描画は、変更を持たない同じ値にそろえる */
export function getInitialProjectState(): State {
  return initial;
}

export function createProject(input: { title: string; goal: string; due_date: string | null }): string {
  const id = `pj-new-${++seq}`;
  const project: Project = {
    id,
    owner_id: ME_ID,
    title: input.title,
    goal: input.goal,
    source_quest_id: null,
    member_ids: [],
    status: "active",
    due_date: input.due_date,
    created_at: TODAY,
    done_at: null,
  };
  set({ ...state, projects: [project, ...state.projects] });
  return id;
}

export function setProjectStatus(projectId: string, status: Project["status"]): void {
  set({
    ...state,
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, status, done_at: status === "done" ? TODAY : null } : p,
    ),
  });
}

export function addTask(projectId: string, input: { title: string; due_date: string | null; assignee_id: string | null }): void {
  const last = Math.max(0, ...state.tasks.filter((t) => t.project_id === projectId).map((t) => t.sort_order));
  const task: ProjectTask = {
    id: `t-new-${++seq}`,
    project_id: projectId,
    title: input.title,
    status: "todo",
    assignee_id: input.assignee_id,
    due_date: input.due_date,
    sort_order: last + 1,
    done_at: null,
  };
  set({ ...state, tasks: [...state.tasks, task] });
}

export function toggleTask(taskId: string): void {
  set({
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId
        ? { ...t, status: t.status === "done" ? "todo" : "done", done_at: t.status === "done" ? null : TODAY }
        : t,
    ),
  });
}

export function removeTask(taskId: string): void {
  set({ ...state, tasks: state.tasks.filter((t) => t.id !== taskId) });
}
