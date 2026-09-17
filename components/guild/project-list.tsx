"use client";

// プロジェクトの一覧。すすめている／おわった に分ける。

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/guild/labels";
import { ME_ID } from "@/lib/guild/mock-data";
import { getInitialProjectState, getProjectState, subscribeProjects } from "@/lib/guild/project-store";
import { visibleProjects } from "@/lib/guild/projects";
import { Window } from "./cards";
import { ProjectRow } from "./project-parts";

export function ProjectList() {
  const state = useSyncExternalStore(subscribeProjects, getProjectState, getInitialProjectState);
  const mine = visibleProjects(state.projects, ME_ID);
  const active = mine.filter((p) => p.status === "active");
  const done = mine.filter((p) => p.status === "done");

  return (
    <div className="space-y-11">
      <div>
        <Link href="/guild/projects/new" className="rpg-button h-12 w-full text-base sm:w-auto">
          ▶ プロジェクトを つくる
        </Link>
      </div>

      <Window title="すすめている">
        {active.length === 0 ? (
          <p className="c-muted text-sm">すすめている プロジェクトは ありません。</p>
        ) : (
          <ul className="space-y-7">
            {active.map((p) => (
              <li key={p.id}>
                <ProjectRow project={p} state={state} />
              </li>
            ))}
          </ul>
        )}
        <p className="c-muted c-dashed-top mt-6 pt-3 text-[11px] leading-relaxed">
          バーの塗り＝おわった タスクの割合／金の線＝きょう。塗りが 線より手前なら、よていより 遅れています。
        </p>
      </Window>

      {done.length > 0 && (
        <Window title="おわった">
          <ul className="space-y-7">
            {done.map((p) => (
              <li key={p.id} className="opacity-75">
                <ProjectRow project={p} state={state} />
                {p.done_at && <p className="c-muted mt-1 pl-5 text-xs">{formatDate(p.done_at)}に おわりました</p>}
              </li>
            ))}
          </ul>
        </Window>
      )}
    </div>
  );
}
