"use client";

// プロジェクトの画面で共通に使う部品（進みぐあい・1行・タスクの1行）。

import Link from "next/link";
import type { Project, ProjectTask } from "@/lib/guild/types";
import { TODAY, getProfile } from "@/lib/guild/mock-data";
import { dueLabel, isPrivateProject } from "@/lib/guild/projects";
import { toggleTask } from "@/lib/guild/project-store";
import { uiToast } from "@/lib/ui-dialog";
import { cn } from "@/lib/utils";

const GAUGE_CELLS = 10;

/** 10マスのゲージ。タスクが0件なら空のまま */
export function ProjectGauge({ done, total }: { done: number; total: number }) {
  const on = total === 0 ? 0 : Math.round((done / total) * GAUGE_CELLS);
  return (
    <div className="flex items-center gap-2">
      <div className="c-gauge flex-1" aria-hidden>
        {Array.from({ length: GAUGE_CELLS }).map((_, i) => (
          <span key={i} data-on={i < on} />
        ))}
      </div>
      <span className="c-muted shrink-0 text-xs tabular-nums">
        {done}/{total}
        <span className="sr-only">のタスクが おわっています</span>
      </span>
    </div>
  );
}

export function VisibilityChip({ project }: { project: Project }) {
  return (
    <span className="c-chip">
      {isPrivateProject(project) ? "自分だけ" : `パーティ ${project.member_ids.length + 1}人`}
    </span>
  );
}

export function ProjectRow({ project, done, total }: { project: Project; done: number; total: number }) {
  return (
    <Link href={`/guild/projects/${project.id}`} className="rpg-cursor-row flex items-start gap-1.5">
      <span className="rpg-cursor mt-0.5">▶</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] leading-snug break-words">{project.title}</span>
          <VisibilityChip project={project} />
        </span>
        <span className="mt-1.5 block">
          <ProjectGauge done={done} total={total} />
        </span>
      </span>
    </Link>
  );
}

/** タスクの1行。□を押すと おわり／もどす */
export function TaskLine({
  task,
  showAssignee,
  projectTitle,
  trailing,
}: {
  task: ProjectTask;
  showAssignee: boolean;
  /** ホームなど、どのプロジェクトのタスクか分からない場所で出す */
  projectTitle?: { id: string; title: string };
  trailing?: React.ReactNode;
}) {
  const isDone = task.status === "done";
  const due = task.due_date && !isDone ? dueLabel(task.due_date, TODAY) : null;
  const assignee = task.assignee_id ? getProfile(task.assignee_id)?.display_name : null;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={`「${task.title}」を ${isDone ? "まだに もどす" : "おわりにする"}`}
        onClick={() => {
          toggleTask(task.id);
          // ホームでは おわったタスクが一覧から消えるので、押したことを知らせる
          if (!isDone) uiToast(`「${task.title}」を おわりにしました`);
        }}
        // 見た目は24pxの□、押せる範囲は指で押しやすい40px
        className="-m-2 flex h-10 w-10 shrink-0 items-center justify-center"
      >
        <span className="flex h-6 w-6 items-center justify-center border-2 border-[#1b2a41] bg-[#fffdf6] text-sm leading-none">
          {isDone ? "✓" : ""}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] leading-relaxed break-words", isDone && "c-muted line-through")}>{task.title}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          {projectTitle && (
            <Link href={`/guild/projects/${projectTitle.id}`} className="c-muted underline underline-offset-4">
              {projectTitle.title}
            </Link>
          )}
          {due && (
            // 赤は「急ぎ」と入力エラーだけに使うので、すぎたものは濃紺で目立たせる
            <span className={due.overdue ? "c-chip-strong" : "c-muted"}>
              {due.text}
            </span>
          )}
          {showAssignee && <span className="c-muted">たんとう：{assignee ? `${assignee}さん` : "きまっていない"}</span>}
        </p>
      </div>
      {trailing}
    </div>
  );
}
