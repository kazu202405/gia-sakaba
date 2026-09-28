"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import type { GuildProject, GuildProjectPipeline } from "@/lib/guild/server-data";
import type { Profile } from "@/lib/guild/types";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { dueLabel } from "@/lib/guild/projects";
import { DateInput } from "./form-parts";
import { LiveProjectPeople } from "./live-project-people";

export function LiveProjectDetail({ project, pipeline, members, canEdit, today }: { project: GuildProject; pipeline: GuildProjectPipeline; members: Profile[]; canEdit: boolean; today: string }) {
  const router = useGuildRouter();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  // 追加は、押した瞬間に錠をかける（state の反映を待つと、すばやい2度押しで2件できる）
  const addLock = useRef(false);
  const [pendingAction, setPendingAction] = useState("");
  const [isPending, startTransition] = useTransition();
  const projectActionLock = useRef(false);
  const busy = !!pendingAction || isPending;
  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState("");
  // チェックは押した瞬間に見た目を切り替え、保存は裏で行う（失敗したら元に戻して知らせる）
  const [statusOverride, setStatusOverride] = useState<Record<string, "todo" | "done">>({});
  const [savingTasks, setSavingTasks] = useState<string[]>([]);
  // なおした名前・消したタスクも、保存を待たずに画面へ反映する
  const [titleOverride, setTitleOverride] = useState<Record<string, string>>({});
  const [removedTasks, setRemovedTasks] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<{ id: string; title: string; due: string; error: string } | null>(null);
  const [dueOverride, setDueOverride] = useState<Record<string, string | null>>({});
  const tasks = project.tasks
    .filter((task) => !removedTasks.includes(task.id))
    .map((task) => ({
      ...task,
      ...(statusOverride[task.id] ? { status: statusOverride[task.id] } : {}),
      ...(titleOverride[task.id] !== undefined ? { title: titleOverride[task.id] } : {}),
      ...(dueOverride[task.id] !== undefined ? { due_date: dueOverride[task.id] } : {}),
    }));
  // のこっているタスクは しめきりが近い順（しめきり無しは あとに、入れた順のまま）
  const openTasks = tasks.filter((task) => task.status !== "done")
    .sort((a, b) => a.due_date && b.due_date ? a.due_date.localeCompare(b.due_date) : a.due_date ? -1 : b.due_date ? 1 : 0);
  const doneTasks = tasks.filter((task) => task.status === "done");
  const done = doneTasks.length;

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (addLock.current || busy || projectActionLock.current || !taskTitle.trim()) return;
    addLock.current = true;
    setPendingAction("task-add"); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_add_project_task", { p_project_id: project.id, p_title: taskTitle.trim(), p_due_date: taskDue || null });
      if (rpcError) { setError("タスクを追加できませんでした。"); return; }
      // 入れた欄は すぐ空にして、一覧に出るまで（読み込み中）は ボタンを押せないままにする
      setTaskTitle(""); setTaskDue("");
      uiToast("タスクを追加しました");
      startTransition(() => router.refresh());
    } catch {
      setError("通信に失敗しました。接続を確認してください。");
    } finally {
      setPendingAction("");
      addLock.current = false;
    }
  }

  async function setTaskStatus(id: string, status: "todo" | "done") {
    if (projectActionLock.current || savingTasks.includes(id)) return;
    setError("");
    setStatusOverride((current) => ({ ...current, [id]: status }));
    setSavingTasks((current) => [...current, id]);
    const { error: rpcError } = await createClient().rpc("sakaba_set_project_task_status", { p_task_id: id, p_status: status });
    if (rpcError) {
      setStatusOverride((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setError("タスクを更新できませんでした。");
    } else {
      startTransition(() => router.refresh());
    }
    setSavingTasks((current) => current.filter((taskId) => taskId !== id));
  }

  async function saveTaskTitle() {
    if (!editingTask || savingTasks.includes(editingTask.id)) return;
    const title = editingTask.title.trim();
    // 空や長すぎるときは閉じずに、理由を赤字で出す
    if (!title) { setEditingTask({ ...editingTask, error: "タスクの名前を入力してください。" }); return; }
    if (title.length > 100) { setEditingTask({ ...editingTask, error: "100文字以内で入力してください。" }); return; }
    const { id } = editingTask;
    const due = editingTask.due || null;
    const shown = tasks.find((task) => task.id === id);
    if (shown && title === shown.title && due === shown.due_date) { setEditingTask(null); return; }
    if (due && shown?.start_date && due < shown.start_date) { setEditingTask({ ...editingTask, error: `しめきりは、はじめる日（${shown.start_date}）より後にしてください。` }); return; }
    setError("");
    setTitleOverride((current) => ({ ...current, [id]: title }));
    setDueOverride((current) => ({ ...current, [id]: due }));
    setEditingTask(null);
    setSavingTasks((current) => [...current, id]);
    const { error: rpcError } = await createClient().rpc("sakaba_update_project_task", { p_task_id: id, p_title: title, p_due_date: due });
    if (rpcError) {
      setTitleOverride((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setDueOverride((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setError("タスクをなおせませんでした。");
    } else {
      startTransition(() => router.refresh());
    }
    setSavingTasks((current) => current.filter((taskId) => taskId !== id));
  }

  async function deleteTask(task: GuildProject["tasks"][number]) {
    if (savingTasks.includes(task.id)) return;
    const confirmed = await uiConfirm({
      title: "タスクを削除します",
      message: `「${task.title}」を削除します。元に戻せません。`,
      okLabel: "削除する",
      danger: true,
    });
    if (!confirmed) return;
    setError("");
    setRemovedTasks((current) => [...current, task.id]);
    setSavingTasks((current) => [...current, task.id]);
    const { error: rpcError } = await createClient().rpc("sakaba_delete_project_task", { p_task_id: task.id });
    if (rpcError) {
      setRemovedTasks((current) => current.filter((taskId) => taskId !== task.id));
      setError("タスクを削除できませんでした。");
    } else {
      uiToast("タスクを削除しました");
      startTransition(() => router.refresh());
    }
    setSavingTasks((current) => current.filter((taskId) => taskId !== task.id));
  }

  function taskRow(task: GuildProject["tasks"][number]) {
    const isDone = task.status === "done";
    const editable = canEdit && project.status === "active";
    const saving = savingTasks.includes(task.id);
    if (editable && editingTask?.id === task.id) {
      return <li key={task.id} className="c-card p-3">
        <label className="block">
          <span className="sr-only">タスクの名前</span>
          <input
            autoFocus
            value={editingTask.title}
            maxLength={100}
            onChange={(event) => setEditingTask({ ...editingTask, title: event.target.value, error: "" })}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); void saveTaskTitle(); }
              if (event.key === "Escape") setEditingTask(null);
            }}
            className="c-input h-11"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="c-muted text-xs">しめきり（空でも可）</span>
          <div className="w-44"><DateInput value={editingTask.due} onChange={(due) => setEditingTask({ ...editingTask, due, error: "" })} label="しめきり" /></div>
          {editingTask.due && <button type="button" onClick={() => setEditingTask({ ...editingTask, due: "", error: "" })} className="c-muted h-9 px-1 text-xs underline underline-offset-4">しめきりを消す</button>}
        </div>
        {editingTask.error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{editingTask.error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setEditingTask(null)} className="c-button-sub h-9 px-3 text-xs">やめる</button>
          <button type="button" onClick={() => void saveTaskTitle()} className="rpg-button h-9 px-4 text-xs">▶ 保存する</button>
        </div>
      </li>;
    }
    return <li key={task.id} className="c-card flex items-center gap-3 p-3">
      {editable ? <input type="checkbox" checked={isDone} disabled={projectActionLock.current || saving} onChange={() => void setTaskStatus(task.id, isDone ? "todo" : "done")} aria-label={`${task.title}を${isDone ? "未完了" : "完了"}にする`} /> : <span>{isDone ? "✓" : "□"}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block break-words text-sm ${isDone ? "c-muted line-through" : ""}`}>{task.title}</span>
        {task.due_date && !isDone && <DueText due={task.due_date} today={today} />}
      </span>
      {editable && <span className="flex shrink-0 gap-1.5">
        {/* 文字だと行が詰まるのでアイコンにする。読み上げ用の名前と、マウスを乗せたときの説明は残す */}
        <button type="button" disabled={saving} onClick={() => setEditingTask({ id: task.id, title: task.title, due: task.due_date ?? "", error: "" })} aria-label={`${task.title}をなおす`} title="名前・しめきりをなおす" className="c-button-sub h-9 w-9 !px-0 disabled:opacity-50"><Pencil size={15} aria-hidden="true" /></button>
        <button type="button" disabled={saving} onClick={() => void deleteTask(task)} aria-label={`${task.title}を削除する`} title="削除する" className="c-button-danger h-9 w-9 disabled:opacity-50"><Trash2 size={15} aria-hidden="true" /></button>
      </span>}
    </li>;
  }

  async function setProjectStatus(status: "active" | "done") {
    if (busy || projectActionLock.current) return;
    projectActionLock.current = true;
    setPendingAction("project-status"); setProjectError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_set_project_status", { p_project_id: project.id, p_status: status });
      if (rpcError) throw rpcError;
      // 新しい status の props で component が再作成されるまでロックを保つ。
      startTransition(() => router.refresh());
    } catch {
      setProjectError("プロジェクトを更新できませんでした。");
      setPendingAction("");
      projectActionLock.current = false;
    }
  }

  async function deleteProject() {
    if (busy || projectActionLock.current) return;
    projectActionLock.current = true;
    setPendingAction("project-delete-confirm");
    try {
      const confirmed = await uiConfirm({
        title: "プロジェクトを削除します",
        message: `「${project.title}」と、その中のタスク・相手・進捗記録をすべて削除します。元に戻せません。`,
        okLabel: "削除する",
        danger: true,
      });
      if (!confirmed) {
        setPendingAction("");
        projectActionLock.current = false;
        return;
      }
      setPendingAction("project-delete"); setProjectError("");
      const { error: rpcError } = await createClient().rpc("sakaba_delete_project", { p_project_id: project.id });
      if (rpcError) throw rpcError;
      uiToast("プロジェクトを削除しました");
      router.replace("/guild/projects");
    } catch {
      setProjectError("プロジェクトを削除できませんでした。画面を読み直して再度お試しください。");
      setPendingAction("");
      projectActionLock.current = false;
    }
  }

  return <div className="space-y-6">
    <Link href="/guild/projects" className="c-muted inline-block text-sm">◀ プロジェクト一覧</Link>
    <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
      <span className="c-window-title">{project.status === "done" ? "完了" : "進行中"}</span>
      <h1 className="break-words text-2xl">{project.title}</h1>
      {project.goal && <p className="mt-4 whitespace-pre-line break-words text-sm">ゴール：{project.goal}</p>}
      {project.memo && <p className="c-muted mt-3 whitespace-pre-line break-words text-sm">メモ：{project.memo}</p>}
      <p className="c-muted mt-4 text-xs">開始 {project.start_date}{project.due_date ? ` · 期限 ${project.due_date}` : ""} · タスク {done}/{project.tasks.length} 完了</p>
      {canEdit && <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/guild/projects/${project.id}/edit`} className="c-button-sub px-4 py-2">内容をなおす</Link>
        <button type="button" disabled={busy} aria-busy={pendingAction === "project-status"} onClick={() => void setProjectStatus(project.status === "done" ? "active" : "done")} className="c-button-sub px-4 py-2 disabled:opacity-50">
          {pendingAction === "project-status" ? "更新中…" : project.status === "done" ? "進行中に戻す" : "プロジェクトを完了する"}
        </button>
      </div>}
      {canEdit && <div className="c-dashed-top mt-5 flex justify-end pt-4">
        <button type="button" disabled={busy} aria-busy={pendingAction.startsWith("project-delete")} onClick={() => void deleteProject()} className="c-button-danger h-11 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50">
          <Trash2 size={17} aria-hidden="true" />
          <span>{pendingAction === "project-delete-confirm" ? "確認中…" : pendingAction === "project-delete" ? "削除中…" : "このプロジェクトを削除"}</span>
        </button>
      </div>}
      {projectError && <p role="alert" className="mt-3 text-sm text-[#c62828]">{projectError}</p>}
    </section>
    <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
      <span className="c-window-title">タスク</span>
      {tasks.length === 0 ? <p className="c-muted text-sm">まだタスクはありません。</p> : <>
        {openTasks.length === 0 ? <p className="c-muted text-sm">のこっているタスクはありません。</p> : <ul className="space-y-2">{openTasks.map(taskRow)}</ul>}
        {/* 完了したタスクは下にまとめて、たたんでおく（押すと開く） */}
        {doneTasks.length > 0 && <details className="c-dashed-top mt-5 pt-4">
          <summary className="c-muted cursor-pointer text-sm">おわったタスク（{doneTasks.length}件）</summary>
          <ul className="mt-3 space-y-2">{doneTasks.map(taskRow)}</ul>
        </details>}
      </>}
      {canEdit && project.status === "active" && <form onSubmit={addTask} className="mt-5 space-y-2">
        <div className="flex gap-2">
          <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={100} placeholder="次にやること" aria-label="新しいタスク" readOnly={pendingAction === "task-add"} className="c-input h-11 min-w-0 flex-1" />
          <button type="submit" disabled={busy || !taskTitle.trim()} aria-busy={pendingAction === "task-add"} className="rpg-button shrink-0 px-4">{pendingAction === "task-add" ? "追加中…" : "追加"}</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="c-muted text-xs">しめきり（空でも可）</span>
          <div className="w-44"><DateInput value={taskDue} onChange={setTaskDue} label="新しいタスクのしめきり" /></div>
          {taskDue && <button type="button" onClick={() => setTaskDue("")} className="c-muted h-9 px-1 text-xs underline underline-offset-4">消す</button>}
        </div>
      </form>}
      <p role="status" aria-live="polite" className="c-muted mt-2 min-h-4 text-xs">{savingTasks.length > 0 ? "保存中…" : isPending ? "読み込み中…" : ""}</p>
      {error && <p role="alert" className="mt-3 text-sm text-[#c62828]">{error}</p>}
    </section>
    <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
      <span className="c-window-title">あいてごとの じょうきょうを きろくする</span>
      <LiveProjectPeople projectId={project.id} pipeline={pipeline} members={members} editable={canEdit && project.status === "active"} />
    </section>
  </div>;
}

/** タスクの行に出す しめきり。すぎたものだけ赤（赤は「急ぎ・エラー」だけに使う決まり） */
function DueText({ due, today }: { due: string; today: string }) {
  const label = dueLabel(due, today);
  const [, m, d] = due.split("-");
  return <span className={`mt-0.5 block text-xs ${label.overdue ? "text-[#c62828]" : "c-muted"}`}>しめきり {Number(m)}/{Number(d)}・{label.text}</span>;
}
