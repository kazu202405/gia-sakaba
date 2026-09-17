"use client";

// ホームの「すすめている プロジェクト」と「しめきりが近い タスク」。自分の仕事の入口。

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ME_ID, TODAY } from "@/lib/guild/mock-data";
import { getInitialProjectState, getProjectState, subscribeProjects } from "@/lib/guild/project-store";
import { projectProgress, upcomingTasks, visibleProjects } from "@/lib/guild/projects";
import { MoreLink, Window } from "./cards";
import { ProjectRow, TaskLine } from "./project-parts";

const UPCOMING_DAYS = 7;

export function HomeProjects() {
  const { projects, tasks } = useSyncExternalStore(subscribeProjects, getProjectState, getInitialProjectState);
  const active = visibleProjects(projects, ME_ID).filter((p) => p.status === "active");
  const upcoming = upcomingTasks(projects, tasks, ME_ID, TODAY, UPCOMING_DAYS);

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
          <ul className="space-y-5">
            {active.map((p) => {
              const { done, total } = projectProgress(tasks, p.id);
              return (
                <li key={p.id}>
                  <ProjectRow project={p} done={done} total={total} />
                </li>
              );
            })}
          </ul>
        )}
      </Window>

      <Window title="しめきりが近い タスク">
        {upcoming.length === 0 ? (
          <p className="c-muted text-sm">{UPCOMING_DAYS}日いないに しめきりの タスクは ありません。</p>
        ) : (
          <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
            {upcoming.map(({ task, project }) => (
              <li key={task.id}>
                <TaskLine task={task} showAssignee={false} projectTitle={{ id: project.id, title: project.title }} />
              </li>
            ))}
          </ul>
        )}
      </Window>
    </div>
  );
}
