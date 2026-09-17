"use client";

// クエスト けいじばんの 一覧。しぼりこみ（じょうたい・しゅるい）と「くわしく／かんたん」で、
// 数が増えても 1画面に入る数を増やす。

import { useState } from "react";
import type { QuestCategory } from "@/lib/guild/types";
import { filterQuests, questFilterLabel, type QuestFilter } from "@/lib/guild/filters";
import { questCategoryLabel } from "@/lib/guild/labels";
import { ME_ID, questApplications, quests } from "@/lib/guild/mock-data";
import { QuestCard, questCategoryMark } from "./cards";
import { FilterRow, ViewModeSwitch, useViewMode } from "./list-controls";

const FILTERS = Object.keys(questFilterLabel) as QuestFilter[];
const CATEGORIES = Object.keys(questCategoryLabel) as QuestCategory[];

export function QuestBoard() {
  const [filter, setFilter] = useState<QuestFilter>("open");
  const [category, setCategory] = useState<QuestCategory | "">("");
  const [mode, setMode] = useViewMode();

  const list = filterQuests(quests, questApplications, ME_ID, filter, category);

  return (
    <div className="space-y-5">
      <FilterRow
        label="じょうたい"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({
          value: f,
          label: questFilterLabel[f],
          count: filterQuests(quests, questApplications, ME_ID, f, category).length,
        }))}
      />
      <FilterRow
        label="しゅるい"
        value={category}
        onChange={setCategory}
        options={[
          { value: "" as const, label: "すべて" },
          ...CATEGORIES.map((c) => ({ value: c, label: `${questCategoryMark[c]} ${questCategoryLabel[c]}` })),
        ]}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm tabular-nums">{list.length}件</p>
        <ViewModeSwitch value={mode} onChange={setMode} />
      </div>

      {list.length === 0 ? (
        <p className="c-card border-dashed px-4 py-10 text-center text-sm">この じょうけんの クエストは ありません。</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {list.map((q) => (
            <QuestCard key={q.id} quest={q} compact={mode === "compact"} />
          ))}
        </div>
      )}
    </div>
  );
}
