"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { GuildProject, GuildProjectPipeline } from "@/lib/guild/server-data";
import type { Profile } from "@/lib/guild/types";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { LiveProjectPeople } from "./live-project-people";

export function LiveProjectDetail({ project, pipeline, members, canEdit }: { project: GuildProject; pipeline: GuildProjectPipeline; members: Profile[]; canEdit: boolean }) {
  const router = useRouter();
  const [taskTitle, setTaskTitle] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [isPending, startTransition] = useTransition();
  const projectActionLock = useRef(false);
  const busy = !!pendingAction || isPending;
  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState("");
  // チェックは押した瞬間に見た目を切り替え、保存は裏で行う（失敗したら元に戻して知らせる）
  const [statusOverride, setStatusOverride] = useState<Record<string, "todo" | "done">>({});
  const [savingTasks, setSavingTasks] = useState<string[]>([]);
  const tasks = project.tasks.map((task) => (statusOverride[task.id] ? { ...task, status: statusOverride[task.id] } : task));
  const openTasks = tasks.filter((task) => task.status !== "done");
  const doneTasks = tasks.filter((task) => task.status === "done");
  const done = doneTasks.length;

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (busy || projectActionLock.current || !taskTitle.trim()) return;
    setPendingAction("task-add"); setError("");
    const { error: rpcError } = await createClient().rpc("sakaba_add_project_task", { p_project_id: project.id, p_title: taskTitle.trim() });
    if (rpcError) setError("タスクを追加できませんでした。");
    else { setTaskTitle(""); startTransition(() => router.refresh()); }
    setPendingAction("");
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

  function taskRow(task: GuildProject["tasks"][number]) {
    const isDone = task.status === "done";
    return <li key={task.id} className="c-card flex items-center gap-3 p-3">
      {canEdit && project.status === "active" ? <input type="checkbox" checked={isDone} disabled={projectActionLock.current || savingTasks.includes(task.id)} onChange={() => void setTaskStatus(task.id, isDone ? "todo" : "done")} aria-label={`${task.title}を${isDone ? "未完了" : "完了"}にする`} /> : <span>{isDone ? "✓" : "□"}</span>}
      <span className={`break-words text-sm ${isDone ? "c-muted line-through" : ""}`}>{task.title}</span>
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
      {canEdit && project.status === "active" && <form onSubmit={addTask} className="mt-5 flex gap-2">
        <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={100} placeholder="次にやること" aria-label="新しいタスク" className="c-input h-11 min-w-0 flex-1" />
        <button type="submit" disabled={busy || !taskTitle.trim()} aria-busy={pendingAction === "task-add"} className="rpg-button shrink-0 px-4 disabled:opacity-50">{pendingAction === "task-add" ? "追加中…" : "追加"}</button>
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
