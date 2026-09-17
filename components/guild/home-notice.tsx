"use client";

// ホームの「おしらせ」窓。数だけを出し、くわしい中身は下の窓と それぞれの一覧で見る。

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { countIncomingRequests, countNewMembers, countNewQuests } from "@/lib/guild/home-summary";
import { ME_ID, getProfile, guild, introRequests, profiles, quests } from "@/lib/guild/mock-data";
import { getInitialNotifications, getNotifications, subscribeNotifications } from "@/lib/guild/notification-store";
import { getInitialSeen, getSeen, subscribeSeen } from "@/lib/guild/seen-store";
import { Window } from "./cards";

const findIntro = (id: string) => introRequests.find((r) => r.id === id);

export function HomeNotice() {
  const me = getProfile(ME_ID)!;
  const items = useSyncExternalStore(subscribeNotifications, getNotifications, getInitialNotifications);
  const seen = useSyncExternalStore(subscribeSeen, getSeen, getInitialSeen);

  const requests = countIncomingRequests(items, findIntro);
  const newMembers = countNewMembers(profiles, me, seen);
  const newQuests = countNewQuests(quests, me, seen);

  const lines = [
    requests > 0 && {
      href: "/guild/notifications",
      body: (
        <>
          いらいが <Num n={requests} />けん <span className="inline-block">きています</span>
        </>
      ),
    },
    newMembers > 0 && {
      href: "/guild/members",
      body: (
        <>
          しんき {guild.terms.member}が <Num n={newMembers} />人 <span className="inline-block">かにゅうしました</span>
        </>
      ),
    },
    newQuests > 0 && {
      href: "/guild/quests",
      body: (
        <>
          あたらしく <Num n={newQuests} />つの {guild.terms.quest}が <span className="inline-block">はっせいしています</span>
        </>
      ),
    },
  ].filter((l) => l !== false);

  return (
    <Window title="おしらせ">
      <p className="text-[17px] leading-loose">
        おかえりなさい、<span className="inline-block">{me.display_name}さん。</span>
      </p>
      {lines.length === 0 ? (
        <p className="text-[17px] leading-loose">いまは あたらしい しらせは ありません。</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {lines.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="rpg-cursor-row flex items-center gap-1.5 py-1 text-[17px] leading-relaxed">
                <span className="rpg-cursor">▶</span>
                <span className="min-w-0">{l.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="c-muted mt-3 text-sm">
        {guild.name}には いま {profiles.length}人の {guild.terms.member}が います。
      </p>
    </Window>
  );
}

function Num({ n }: { n: number }) {
  return <span className="text-2xl tabular-nums">{n}</span>;
}
