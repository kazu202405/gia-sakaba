// 窓・見出し・仲間カード・クエストカード。サーバー側でもブラウザ側でも使える。

import Link from "next/link";
import type { Profile, Quest, QuestCategory } from "@/lib/guild/types";
import { formatDate, questCategoryLabel, questStatusLabel } from "@/lib/guild/labels";
import { applicantCount, getProfile } from "@/lib/guild/mock-data";
import { JobAvatar } from "./job-avatar";
import { cn } from "@/lib/utils";

/** クエストの種類は色ではなく記号の形で見分ける（色が付くのは「急ぎ」だけ） */
export const questCategoryMark: Record<QuestCategory, string> = {
  work: "■",
  consult: "？",
  collab: "◆",
  info: "★",
  gathering: "▲",
};

/** 紺の太枠の窓。左上に名札（title）、右上に小さな操作（action） */
export function Window({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("c-window p-4 sm:p-6", title && "pt-9 sm:pt-10", className)}>
      {title && <h2 className="c-window-title">{title}</h2>}
      {action && <div className="absolute top-2 right-3">{action}</div>}
      {children}
    </section>
  );
}

export function PageTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-9">
      <h1 className="text-2xl tracking-[0.12em]">▶ {title}</h1>
      {lead && <p className="c-muted mt-2 text-sm leading-relaxed">{lead}</p>}
    </div>
  );
}

export function MoreLink({ href, label = "すべて見る" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="c-muted text-xs hover:underline">
      {label} ▶
    </Link>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="c-muted inline-flex items-center gap-1 text-sm hover:underline">
      ◀ {label}
    </Link>
  );
}

/** 名鑑のカード（枠つき） */
export function MemberCard({ profile }: { profile: Profile }) {
  return (
    <Link href={`/guild/members/${profile.id}`} className="c-card rpg-cursor-row flex items-center gap-2 p-3 sm:p-4">
      <span className="rpg-cursor">▶</span>
      <JobAvatar icon={profile.job_icon} photoUrl={profile.photo_url} name={profile.job} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base tracking-wider">{profile.display_name}</span>
          <span className="c-muted text-xs">
            {profile.job}・{profile.region}
          </span>
        </p>
        <p className="mt-0.5 text-sm break-words">{profile.headline}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.keywords.slice(0, 3).map((k) => (
            <span key={k} className="c-chip">
              {k}
            </span>
          ))}
          {!profile.accept_intro && <span className="c-muted text-[11px]">しょうかいは お休み中</span>}
        </div>
      </div>
    </Link>
  );
}

/** 窓の中に並べる1行（枠なし） */
export function MemberRow({ profile }: { profile: Profile }) {
  return (
    <Link href={`/guild/members/${profile.id}`} className="rpg-cursor-row flex items-center gap-2">
      <span className="rpg-cursor">▶</span>
      <JobAvatar icon={profile.job_icon} photoUrl={profile.photo_url} name={profile.job} />
      <span className="min-w-0">
        <span className="block text-base tracking-wider">{profile.display_name}</span>
        <span className="c-muted block text-xs">
          {profile.job}・{profile.region}
        </span>
        <span className="block truncate text-xs">{profile.headline}</span>
      </span>
    </Link>
  );
}

/** クエスト板のカード（枠つき） */
export function QuestCard({ quest, compact = false }: { quest: Quest; compact?: boolean }) {
  const creator = getProfile(quest.creator_id);
  const done = quest.status === "completed";
  return (
    <Link
      href={`/guild/quests/${quest.id}`}
      className={cn("c-card rpg-cursor-row block p-3 sm:p-4", done && "opacity-75")}
    >
      <div className="flex items-start gap-1.5">
        <span className="rpg-cursor mt-1">▶</span>
        <div className="min-w-0 flex-1">
          <QuestMeta quest={quest} />
          <p className="mt-1 text-[15px] leading-snug break-words">{quest.title}</p>
          {/* かんたん表示は しゅるいの札と タイトルだけ（1画面に入る数を増やす） */}
          {!compact && (
            <>
              <p className="c-muted mt-1 text-sm break-words">{quest.summary}</p>
              <p className="c-muted mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                {creator && <span>{creator.display_name}</span>}
                <span>ばしょ：{quest.region}</span>
                {quest.deadline && <span>しめきり：{formatDate(quest.deadline)}</span>}
                <span>参加したい {applicantCount(quest.id)}人</span>
              </p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/** 窓の中に並べる1行（枠なし） */
export function QuestRow({ quest }: { quest: Quest }) {
  return (
    <Link href={`/guild/quests/${quest.id}`} className="rpg-cursor-row flex items-start gap-1.5">
      <span className="rpg-cursor mt-0.5">▶</span>
      <span className="min-w-0">
        <QuestMeta quest={quest} />
        <span className="mt-0.5 block text-[15px] leading-snug break-words">{quest.title}</span>
      </span>
    </Link>
  );
}

function QuestMeta({ quest }: { quest: Quest }) {
  const done = quest.status === "completed";
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="c-label">
        {questCategoryMark[quest.category]} {questCategoryLabel[quest.category]}
      </span>
      {quest.is_urgent && !done && quest.status !== "withdrawn" && <span className="c-tag-urgent">急ぎ</span>}
      {quest.members_only && <span className="c-chip">有料会員限定</span>}
      {quest.status !== "open" && <span className="c-chip">{questStatusLabel[quest.status]}</span>}
    </span>
  );
}
