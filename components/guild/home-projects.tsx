"use client";

// ホームの「すすめている プロジェクト」と「しめきりが近い」。自分の仕事の入口。

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ME_ID, TODAY } from "@/lib/guild/mock-data";
import { getInitialProjectState, getProjectState, subscribeProjects } from "@/lib/guild/project-store";
import { dueLabel, upcomingItems, visibleProjects, type UpcomingItem } from "@/lib/guild/projects";
import { MoreLink, Window } from "./cards";
import { ProjectRow, TaskLine } from "./project-parts";

const UPCOMING_DAYS = 7;

export function HomeProjects() {
  const state = useSyncExternalStore(subscribeProjects, getProjectState, getInitialProjectState);
  const active = visibleProjects(state.projects, ME_ID).filter((p) => p.status === "active");
  const upcoming = upcomingItems(state, ME_ID, TODAY, UPCOMING_DAYS);

  return (
    <div className="grid gap-11 md:grid-cols-2">
      <Window title="すすめている プロジェクト" action={<MoreLink href="/guild/projects" />}>
        {active.length === 0 ? (
          <p className="c-muted text-sm leading-relaxed">
            すすめている プロジェクトは ありません。
            <Link href="/guild/projects/new" className="ml-1 underline underline-offset-4">
              プロジェクトを つくる
            </Link>
          </p>
        ) : (
          <ul className="space-y-6">
            {active.map((p) => (
              <li key={p.id}>
                <ProjectRow project={p} state={state} />
              </li>
            ))}
          </ul>
        )}
      </Window>

      <Window title="しめきりが近い">
        {upcoming.length === 0 ? (
          <p className="c-muted text-sm">{UPCOMING_DAYS}日いないに しめきりや 予定は ありません。</p>
        ) : (
          <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
            {upcoming.map((item) => (
              <li key={item.kind === "task" ? item.task.id : `${item.contact.id}-${item.step.id}`}>
                {item.kind === "task" ? (
                  <TaskLine
                    task={item.task}
                    showAssignee={false}
                    projectTitle={{
                      id: item.project.id,
                      title: item.project.title,
                    }}
                  />
                ) : (
                  <StepLine item={item} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Window>
    </div>
  );
}

/** 人ごとの すすみの予定。完了は ます目で入れるので、押すとプロジェクトへ移る */
function StepLine({ item }: { item: Extract<UpcomingItem, { kind: "step" }> }) {
  const due = dueLabel(item.date, TODAY);
  return (
    <Link href={`/guild/projects/${item.project.id}#people`} className="rpg-cursor-row flex items-start gap-3 py-2.5">
      {/* タスクの□と頭をそろえる */}
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-sm" aria-hidden>
        ◇
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-relaxed break-words">
          {item.contact.label}：{item.step.name}
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          <span className="c-muted underline underline-offset-4">{item.project.title}</span>
          <span className={due.overdue ? "c-chip-strong" : "c-muted"}>{due.text}</span>
        </span>
      </span>
    </Link>
  );
}
