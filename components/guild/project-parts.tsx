"use client";

// プロジェクトの画面で共通に使う部品（期間のバー・進みぐあい・1行・タスクの1行）。

import Link from "next/link";
import type { Project, ProjectTask } from "@/lib/guild/types";
import { formatDate, questCategoryLabel, questStatusLabel } from "@/lib/guild/labels";
import { TODAY, getProfile, getQuest, guild } from "@/lib/guild/mock-data";
import { dueLabel, isPrivateProject, projectProgress, projectSchedule, reachedLastStep } from "@/lib/guild/projects";
import { reopenTask, toggleTask, type ProjectState } from "@/lib/guild/project-store";
import { uiToast } from "@/lib/ui-dialog";
import { cn } from "@/lib/utils";
import { questCategoryMark } from "./cards";

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

/** クエストから作ったプロジェクトの印。一覧でも「外から来た仕事」だと分かるように */
export function QuestOriginChip({ project }: { project: Project }) {
  if (!project.source_quest_id) return null;
  // 濃紺の札は「おくれぎみ」「すぎています」に使っているので、ここは金の文字で分ける
  // ◆は「協業」と工程表の「しめきり」に使っているので、ここは使わない
  return <span className="c-label text-xs">▷ {guild.terms.quest}から</span>;
}

/** くわしい画面の「はじまりの クエスト」。押すとクエストの画面へ */
export function QuestOriginCard({ project }: { project: Project }) {
  const quest = project.source_quest_id ? getQuest(project.source_quest_id) : undefined;
  if (!quest) return null;
  return (
    <Link href={`/guild/quests/${quest.id}`} className="c-card rpg-cursor-row mt-4 flex items-start gap-1.5 p-3">
      <span className="rpg-cursor mt-0.5">▶</span>
      <span className="min-w-0 flex-1">
        <span className="c-label block text-xs">
          はじまりの {guild.terms.quest}（{questCategoryMark[quest.category]} {questCategoryLabel[quest.category]}・
          {questStatusLabel[quest.status]}）
        </span>
        <span className="mt-0.5 block text-[15px] leading-snug break-words">{quest.title}</span>
      </span>
    </Link>
  );
}

/**
 * 期間のバー。塗り＝終わったタスクの割合、金の縦線＝きょう（日数の上でどこまで来たか）。
 * 塗りが縦線より手前なら遅れている。しめきりが無いプロジェクトは10マスのゲージにする。
 */
export function ProjectProgressView({ project, state }: { project: Project; state: ProjectState }) {
  const progress = projectProgress(state.tasks, project.id);
  const schedule = projectSchedule(project, progress, TODAY);
  const pipeline = reachedLastStep(state.steps, state.contacts, state.records, project.id);
  const due = project.due_date && project.status === "active" ? dueLabel(project.due_date, TODAY) : null;

  return (
    <span className="block">
      {schedule ? (
        <>
          <span className="c-muted flex flex-wrap items-center justify-between gap-x-3 text-xs">
            <span className="tabular-nums">
              {formatDate(project.start_date)} → {formatDate(project.due_date!)}
            </span>
            {due && <span className={due.overdue ? "c-chip-strong" : ""}>{due.text}</span>}
          </span>
          <span className="relative mt-1.5 block h-3.5 border-2 border-[#1b2a41] bg-[#fffdf6]" aria-hidden>
            <span className="absolute inset-y-0 left-0 bg-[#1b2a41]" style={{ width: `${schedule.donePct}%` }} />
            {project.status === "active" && (
              <span
                className="absolute -top-1.5 -bottom-1.5 w-[3px] -translate-x-1/2 bg-[#b58a2a]"
                style={{ left: `${schedule.elapsedPct}%` }}
              />
            )}
          </span>
          <span className="sr-only">
            期間の {Math.round(schedule.elapsedPct)}% が経ち、タスクは {Math.round(schedule.donePct)}% おわっています
          </span>
        </>
      ) : (
        <ProjectGauge done={progress.done} total={progress.total} />
      )}
      <span className="c-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {schedule && (
          <span className="tabular-nums">
            タスク {progress.done}/{progress.total}
          </span>
        )}
        {pipeline && pipeline.total > 0 && (
          <span className="tabular-nums">
            {pipeline.stepName} {pipeline.reached}/{pipeline.total}人
          </span>
        )}
        {/* 赤は「急ぎ」と入力エラーだけに使うので、濃紺の札にする */}
        {schedule?.behind && <span className="c-chip-strong">よていより おくれぎみ</span>}
      </span>
    </span>
  );
}

export function ProjectRow({
  project,
  state,
  compact = false,
}: {
  project: Project;
  state: ProjectState;
  /** かんたん表示：なまえと札だけ（1画面に入る数を増やす） */
  compact?: boolean;
}) {
  return (
    <Link href={`/guild/projects/${project.id}`} className="rpg-cursor-row flex items-start gap-1.5">
      <span className="rpg-cursor mt-0.5">▶</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] leading-snug break-words">{project.title}</span>
          <QuestOriginChip project={project} />
          <VisibilityChip project={project} />
        </span>
        {!compact && (
          <span className="mt-2 block">
            <ProjectProgressView project={project} state={state} />
          </span>
        )}
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
          // ホームでは おわったタスクが一覧から消えるので、押したことを知らせる。
          // 押しまちがいでも すぐ戻せるよう「もどす」を付ける（毎回たずねると 使うたびに手間）
          if (!isDone) {
            uiToast(`「${task.title}」を おわりにしました`, "success", {
              label: "もどす",
              onClick: () => reopenTask(task.id),
            });
          }
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
            <span className={due.overdue ? "c-chip-strong" : "c-muted"}>{due.text}</span>
          )}
          {showAssignee && <span className="c-muted">たんとう：{assignee ? `${assignee}さん` : "きまっていない"}</span>}
        </p>
      </div>
      {trailing}
    </div>
  );
}
