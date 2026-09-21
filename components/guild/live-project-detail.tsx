"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuildProject, GuildProjectPipeline } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/client";
import { LiveProjectPeople } from "./live-project-people";

export function LiveProjectDetail({ project, pipeline, canEdit }: { project: GuildProject; pipeline: GuildProjectPipeline; canEdit: boolean }) {
  const router = useRouter();
  const [taskTitle, setTaskTitle] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [isPending, startTransition] = useTransition();
  const busy = !!pendingAction || isPending;
  const [error, setError] = useState("");
  const done = project.tasks.filter((task) => task.status === "done").length;

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !taskTitle.trim()) return;
    setPendingAction("task-add"); setError("");
    const { error: rpcError } = await createClient().rpc("sakaba_add_project_task", { p_project_id: project.id, p_title: taskTitle.trim() });
    if (rpcError) setError("タスクを追加できませんでした。");
    else { setTaskTitle(""); startTransition(() => router.refresh()); }
    setPendingAction("");
  }

  async function setTaskStatus(id: string, status: "todo" | "done") {
    if (busy) return;
    setPendingAction("task-status"); setError("");
    const { error: rpcError } = await createClient().rpc("sakaba_set_project_task_status", { p_task_id: id, p_status: status });
    if (rpcError) setError("タスクを更新できませんでした。");
    else startTransition(() => router.refresh());
    setPendingAction("");
  }

  async function setProjectStatus(status: "active" | "done") {
    if (busy) return;
    setPendingAction("project-status"); setError("");
    const { error: rpcError } = await createClient().rpc("sakaba_set_project_status", { p_project_id: project.id, p_status: status });
    if (rpcError) setError("プロジェクトを更新できませんでした。");
    else startTransition(() => router.refresh());
    setPendingAction("");
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
        <button type="button" disabled={busy} onClick={() => setProjectStatus(project.status === "done" ? "active" : "done")} className="c-button-sub px-4 py-2">
          {pendingAction === "project-status" ? "更新中…" : project.status === "done" ? "進行中に戻す" : "プロジェクトを完了する"}
        </button>
      </div>}
    </section>
    <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
      <span className="c-window-title">タスク</span>
      {project.tasks.length === 0 ? <p className="c-muted text-sm">まだタスクはありません。</p> :
        <ul className="space-y-2">{project.tasks.map((task) => <li key={task.id} className="c-card flex items-center gap-3 p-3">
          {canEdit && project.status === "active" ? <input type="checkbox" checked={task.status === "done"} disabled={busy} onChange={() => setTaskStatus(task.id, task.status === "done" ? "todo" : "done")} aria-label={`${task.title}を${task.status === "done" ? "未完了" : "完了"}にする`} className="h-5 w-5 shrink-0" /> : <span>{task.status === "done" ? "✓" : "□"}</span>}
          <span className={`break-words text-sm ${task.status === "done" ? "c-muted line-through" : ""}`}>{task.title}</span>
        </li>)}</ul>}
      {canEdit && project.status === "active" && <form onSubmit={addTask} className="mt-5 flex gap-2">
        <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={100} placeholder="次にやること" aria-label="新しいタスク" className="c-input h-11 min-w-0 flex-1" />
        <button type="submit" disabled={busy || !taskTitle.trim()} aria-busy={pendingAction === "task-add"} className="rpg-button shrink-0 px-4 disabled:opacity-50">{pendingAction === "task-add" ? "追加中…" : "追加"}</button>
      </form>}
      <p role="status" aria-live="polite" className="c-muted mt-2 min-h-4 text-xs">{isPending ? "読み込み中…" : pendingAction === "task-status" ? "タスクを更新中…" : ""}</p>
      {error && <p role="alert" className="mt-3 text-sm text-[#c62828]">{error}</p>}
    </section>
    <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
      <span className="c-window-title">あいてごとの じょうきょう</span>
      <LiveProjectPeople projectId={project.id} pipeline={pipeline} editable={canEdit && project.status === "active"} />
    </section>
  </div>;
}
