"use client";

// プロジェクトの中の工程表。期間を画面の幅いっぱいに縮めて描く（スマホでも横にスクロールしない）。
// 開始日のあるタスク＝バー、しめきりだけ＝◆、日付なし＝下にまとめる。

import type { Project, ProjectTask } from "@/lib/guild/types";
import { formatDate } from "@/lib/guild/labels";
import { TODAY } from "@/lib/guild/mock-data";
import { datePct, dueLabel, ganttRange, taskBar } from "@/lib/guild/projects";
import { cn } from "@/lib/utils";

export function ProjectGantt({ project, tasks }: { project: Project; tasks: ProjectTask[] }) {
  const range = ganttRange(project, tasks);
  if (!range) {
    return (
      <p className="c-muted text-sm leading-relaxed">
        プロジェクトの しめきりか、タスクの 日付を入れると 工程表が出ます。
      </p>
    );
  }

  const dated = tasks.filter((t) => t.due_date || t.start_date);
  const undated = tasks.filter((t) => !t.due_date && !t.start_date);
  const todayPct = TODAY >= range.from && TODAY <= range.to ? datePct(range, TODAY) : null;

  return (
    <div>
      {/* 横軸：はじめ・おわり。きょうは金の線 */}
      <div className="c-muted flex justify-between text-[11px] tabular-nums">
        <span>{formatDate(range.from)}</span>
        <span>{formatDate(range.to)}</span>
      </div>

      <div className="relative mt-1">
        {todayPct !== null && (
          <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${todayPct}%` }} aria-hidden>
            <div className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-[#b58a2a]" />
            <span
              className={cn(
                "absolute -top-5 bg-[#fffdf6] px-0.5 text-[10px] whitespace-nowrap text-[#8f7337]",
                todayPct > 80 ? "right-1" : "left-1",
              )}
            >
              きょう
            </span>
          </div>
        )}

        {dated.length === 0 ? (
          <p className="c-muted py-4 text-sm">日付の入った タスクは まだ ありません。</p>
        ) : (
          <ul className="space-y-3 border-y-2 border-dashed border-[#1b2a41]/15 py-3">
            {dated.map((t) => (
              <GanttRow key={t.id} task={t} range={range} />
            ))}
          </ul>
        )}
      </div>

      {undated.length > 0 && (
        <p className="c-muted mt-3 text-xs leading-relaxed break-words">
          日付なし：{undated.map((t) => t.title).join("、")}
        </p>
      )}
    </div>
  );
}

function GanttRow({ task, range }: { task: ProjectTask; range: { from: string; to: string } }) {
  const isDone = task.status === "done";
  const bar = taskBar(range, task);
  const due = task.due_date && !isDone ? dueLabel(task.due_date, TODAY) : null;
  const period = [task.start_date, task.due_date]
    .filter((d): d is string => d !== null)
    .map(formatDate)
    .join("〜");

  return (
    <li>
      <p className="flex items-baseline justify-between gap-2 text-sm">
        <span className={cn("min-w-0 truncate", isDone && "c-muted line-through")}>{task.title}</span>
        <span className={cn("shrink-0 text-[11px]", due?.overdue ? "c-chip-strong" : "c-muted")}>
          {isDone ? "おわり" : (due?.text ?? period)}
        </span>
      </p>
      <div className="relative mt-1 h-3 bg-[#1b2a41]/[0.06]">
        {bar ? (
          <span
            className={cn("absolute inset-y-0 border-2 border-[#1b2a41]", isDone ? "bg-[#1b2a41]" : "bg-[#fffdf6]")}
            style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
          />
        ) : (
          <span
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm leading-none",
              isDone && "opacity-50",
            )}
            style={{
              left: `${datePct(range, (task.due_date ?? task.start_date)!)}%`,
            }}
          >
            ◆
          </span>
        )}
      </div>
      <span className="sr-only">{period}</span>
    </li>
  );
}
