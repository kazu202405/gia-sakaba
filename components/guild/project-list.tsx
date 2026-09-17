"use client";

// プロジェクトの一覧。しぼりこみ（すすめている／おわった／自分だけ／パーティ／すべて）と
// 「くわしく／かんたん」で、数が増えても 1画面に入る数を増やす。

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { filterProjects, projectFilterLabel, type ProjectFilter } from "@/lib/guild/filters";
import { formatDate } from "@/lib/guild/labels";
import { FREE_ACTIVE_PROJECT_LIMIT, activeOwnedProjectCount } from "@/lib/guild/membership";
import { ME_ID } from "@/lib/guild/mock-data";
import { getInitialProjectState, getProjectState, subscribeProjects } from "@/lib/guild/project-store";
import { visibleProjects } from "@/lib/guild/projects";
import { Window } from "./cards";
import { FilterRow, ViewModeSwitch, useViewMode } from "./list-controls";
import { useMembership } from "./membership-parts";
import { ProjectRow } from "./project-parts";

const FILTERS = Object.keys(projectFilterLabel) as ProjectFilter[];

export function ProjectList() {
  const state = useSyncExternalStore(subscribeProjects, getProjectState, getInitialProjectState);
  const { isPaid } = useMembership();
  const [filter, setFilter] = useState<ProjectFilter>("active");
  const [mode, setMode] = useViewMode();

  const mine = visibleProjects(state.projects, ME_ID);
  const list = filterProjects(mine, filter);

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <Link href="/guild/projects/new" className="rpg-button h-12 w-full text-base sm:w-auto">
          ▶ プロジェクトを つくる
        </Link>
        <p className="c-muted text-xs tabular-nums">
          {isPaid
            ? "有料会員：いくつでも すすめられます"
            : `あなたが すすめている数 ${activeOwnedProjectCount(state.projects, ME_ID)} / ${FREE_ACTIVE_PROJECT_LIMIT}（無料）`}
        </p>
      </div>

      <FilterRow
        label="しぼりこみ"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({
          value: f,
          label: projectFilterLabel[f],
          count: filterProjects(mine, f).length,
        }))}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm tabular-nums">{list.length}件</p>
        <ViewModeSwitch value={mode} onChange={setMode} />
      </div>

      <Window title={projectFilterLabel[filter]}>
        {list.length === 0 ? (
          <p className="c-muted text-sm">この じょうけんの プロジェクトは ありません。</p>
        ) : (
          <ul className={mode === "compact" ? "space-y-3" : "space-y-7"}>
            {list.map((p) => (
              <li key={p.id} className={p.status === "done" ? "opacity-75" : undefined}>
                <ProjectRow project={p} state={state} compact={mode === "compact"} />
                {mode === "full" && p.done_at && (
                  <p className="c-muted mt-1 pl-5 text-xs">{formatDate(p.done_at)}に おわりました</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {mode === "full" && (
          <p className="c-muted c-dashed-top mt-6 pt-3 text-[11px] leading-relaxed">
            バーの塗り＝おわった タスクの割合／金の線＝きょう。塗りが 線より手前なら、よていより 遅れています。
          </p>
        )}
      </Window>
    </div>
  );
}
