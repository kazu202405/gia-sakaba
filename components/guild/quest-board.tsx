"use client";

// クエスト けいじばんの 一覧。しぼりこみ（じょうたい・しゅるい）と「くわしく／かんたん」で、
// 数が増えても 1画面に入る数を増やす。

import { useState } from "react";
import Link from "next/link";
import type { Profile, QuestApplication, QuestCategory } from "@/lib/guild/types";
import type { GuildQuest } from "@/lib/guild/server-data";
import { filterQuests, questFilterLabel, type QuestFilter } from "@/lib/guild/filters";
import { formatDate, questCategoryLabel, questStatusLabel } from "@/lib/guild/labels";
import { questCategoryMark } from "./cards";
import { FilterRow, ViewModeSwitch, useViewMode } from "./list-controls";
import { cn } from "@/lib/utils";

const FILTERS = Object.keys(questFilterLabel) as QuestFilter[];
const CATEGORIES = Object.keys(questCategoryLabel) as QuestCategory[];

export function QuestBoard({
  quests,
  members,
  currentUserId,
}: {
  quests: GuildQuest[];
  members: Profile[];
  currentUserId: string;
}) {
  const [filter, setFilter] = useState<QuestFilter>("open");
  const [category, setCategory] = useState<QuestCategory | "">("");
  const [mode, setMode] = useViewMode();

  const applications = quests.flatMap((quest) =>
    quest.my_application ? [quest.my_application] : [],
  ) as QuestApplication[];
  const memberNames = new Map(members.map((member) => [member.id, member.display_name]));
  const list = filterQuests(quests, applications, currentUserId, filter, category) as GuildQuest[];

  return (
    <div className="space-y-5">
      <FilterRow
        label="じょうたい"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({
          value: f,
          label: questFilterLabel[f],
          count: filterQuests(quests, applications, currentUserId, f, category).length,
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
            <LiveQuestCard
              key={q.id}
              quest={q}
              creatorName={memberNames.get(q.creator_id)}
              compact={mode === "compact"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LiveQuestCard({
  quest,
  creatorName,
  compact,
}: {
  quest: GuildQuest;
  creatorName?: string;
  compact: boolean;
}) {
  const done = quest.status === "completed";

  return (
    <Link
      href={`/guild/quests/${quest.id}`}
      className={cn("c-card rpg-cursor-row block p-3 sm:p-4", done && "opacity-75")}
    >
      <div className="flex items-start gap-1.5">
        <span className="rpg-cursor mt-1">▶</span>
        <div className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="c-label">
              {questCategoryMark[quest.category]} {questCategoryLabel[quest.category]}
            </span>
            {quest.is_urgent && !done && quest.status !== "withdrawn" && (
              <span className="c-tag-urgent">急ぎ</span>
            )}
            {quest.members_only && <span className="c-chip">有料会員限定</span>}
            {quest.status !== "open" && <span className="c-chip">{questStatusLabel[quest.status]}</span>}
          </span>
          <p className="mt-1 text-[15px] leading-snug break-words">{quest.title}</p>
          {!compact && (
            <>
              {quest.summary && <p className="c-muted mt-1 text-sm break-words">{quest.summary}</p>}
              <p className="c-muted mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                {creatorName && <span>{creatorName}</span>}
                {quest.region && <span>ばしょ：{quest.region}</span>}
                {quest.deadline && <span>しめきり：{formatDate(quest.deadline)}</span>}
                <span>参加したい {quest.applicant_count}人</span>
              </p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
