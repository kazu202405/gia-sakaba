// プロジェクト・タスク・人ごとの すすみ の変更を、ホーム・一覧・くわしい画面で共有する（見本用）。
// 本番では sakaba.projects / project_tasks / project_steps / project_contacts / step_records をRPCで更新し、
// ここはその読み込みに差し替える。

import type { Project, ProjectContact, ProjectStep, ProjectTask, StepRecord } from "./types";
import {
  ME_ID,
  SALES_STEP_NAMES,
  TODAY,
  projectContacts,
  projectSteps,
  projectTasks,
  projects,
  stepRecords,
} from "./mock-data";

export type ProjectState = {
  projects: Project[];
  tasks: ProjectTask[];
  steps: ProjectStep[];
  contacts: ProjectContact[];
  records: StepRecord[];
};

const initial: ProjectState = {
  projects,
  tasks: projectTasks,
  steps: projectSteps,
  contacts: projectContacts,
  records: stepRecords,
};
let state: ProjectState = initial;
const listeners = new Set<() => void>();
let seq = 0;
const newId = (prefix: string) => `${prefix}-new-${++seq}`;

function set(patch: Partial<ProjectState>) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

export function subscribeProjects(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProjectState(): ProjectState {
  return state;
}

/** サーバー側の描画とはじめの描画は、変更を持たない同じ値にそろえる */
export function getInitialProjectState(): ProjectState {
  return initial;
}

const nextOrder = (items: { sort_order: number }[]) => Math.max(0, ...items.map((i) => i.sort_order)) + 1;

// ---------- プロジェクト ----------

export type ProjectInput = {
  title: string;
  goal: string;
  memo: string;
  start_date: string;
  due_date: string | null;
};

export function createProject(input: ProjectInput & { withSteps: boolean }): string {
  const { withSteps, ...fields } = input;
  const id = newId("pj");
  const project: Project = {
    id,
    owner_id: ME_ID,
    ...fields,
    source_quest_id: null,
    member_ids: [],
    status: "active",
    created_at: TODAY,
    done_at: null,
  };
  set({ projects: [project, ...state.projects] });
  if (withSteps) startSteps(id);
  return id;
}

export function updateProject(projectId: string, input: ProjectInput): void {
  set({ projects: state.projects.map((p) => (p.id === projectId ? { ...p, ...input } : p)) });
}

export function setProjectStatus(projectId: string, status: Project["status"]): void {
  set({
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, status, done_at: status === "done" ? TODAY : null } : p,
    ),
  });
}

// ---------- タスク ----------

export function addTask(
  projectId: string,
  input: { title: string; start_date: string | null; due_date: string | null; assignee_id: string | null },
): void {
  const task: ProjectTask = {
    id: newId("t"),
    project_id: projectId,
    ...input,
    status: "todo",
    sort_order: nextOrder(state.tasks.filter((t) => t.project_id === projectId)),
    done_at: null,
  };
  set({ tasks: [...state.tasks, task] });
}

export function toggleTask(taskId: string): void {
  set({
    tasks: state.tasks.map((t) =>
      t.id === taskId
        ? { ...t, status: t.status === "done" ? "todo" : "done", done_at: t.status === "done" ? null : TODAY }
        : t,
    ),
  });
}

export function removeTask(taskId: string): void {
  set({ tasks: state.tasks.filter((t) => t.id !== taskId) });
}

// ---------- 人ごとの すすみ ----------

/** 営業の型（初回アポ／興味付け／提案／契約）で はじめる */
export function startSteps(projectId: string): void {
  if (state.steps.some((s) => s.project_id === projectId)) return;
  const steps = SALES_STEP_NAMES.map((name, i) => ({ id: newId("st"), project_id: projectId, name, sort_order: i + 1 }));
  set({ steps: [...state.steps, ...steps] });
}

export function addStep(projectId: string, name: string): void {
  const step: ProjectStep = {
    id: newId("st"),
    project_id: projectId,
    name,
    sort_order: nextOrder(state.steps.filter((s) => s.project_id === projectId)),
  };
  set({ steps: [...state.steps, step] });
}

export function renameStep(stepId: string, name: string): void {
  set({ steps: state.steps.map((s) => (s.id === stepId ? { ...s, name } : s)) });
}

/** ステップを消すと、その列の日付も消える */
export function removeStep(stepId: string): void {
  set({
    steps: state.steps.filter((s) => s.id !== stepId),
    records: state.records.filter((r) => r.step_id !== stepId),
  });
}

export function addContact(projectId: string, label: string): void {
  const contact: ProjectContact = {
    id: newId("c"),
    project_id: projectId,
    label,
    memo: "",
    sort_order: nextOrder(state.contacts.filter((c) => c.project_id === projectId)),
  };
  set({ contacts: [...state.contacts, contact] });
}

export function updateContact(contactId: string, input: { label: string; memo: string }): void {
  set({ contacts: state.contacts.map((c) => (c.id === contactId ? { ...c, ...input } : c)) });
}

/** 相手を消すと、その行の日付も消える */
export function removeContact(contactId: string): void {
  set({
    contacts: state.contacts.filter((c) => c.id !== contactId),
    records: state.records.filter((r) => r.contact_id !== contactId),
  });
}

/** ます目の日付を入れる。両方空なら ます目ごと消す */
export function setRecord(contactId: string, stepId: string, dates: { planned_on: string | null; done_on: string | null }): void {
  const rest = state.records.filter((r) => !(r.contact_id === contactId && r.step_id === stepId));
  if (!dates.planned_on && !dates.done_on) {
    set({ records: rest });
    return;
  }
  set({ records: [...rest, { contact_id: contactId, step_id: stepId, ...dates }] });
}
