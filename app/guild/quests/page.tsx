import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle, Window } from "@/components/guild/cards";
import { MarkSeen } from "@/components/guild/mark-seen";
import { QuestBoard } from "@/components/guild/quest-board";
import { activeBosses, challengerIds, questsForBoss } from "@/lib/guild/boss";
import { bosses, guild, questApplications, quests } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: `${guild.terms.quest} けいじばん` };

export default function QuestsPage() {
  return (
    <div>
      <MarkSeen list="quests" />
      <PageTitle
        title={`${guild.terms.quest} けいじばん`}
        lead="仕事の依頼・相談・協業したいことを、だれでも出せます。"
      />

      {/* ギルドの ボス：みんなで挑む課題。敵は 課題だけ（人・会社を 敵にしない） */}
      {activeBosses(bosses).length > 0 && (
        <Window title="ギルドの ボス（みんなで 挑む 課題）" className="mb-9">
          <ul className="space-y-4">
            {activeBosses(bosses).map((b) => (
              <li key={b.id}>
                <Link href={`/guild/bosses/${b.id}`} className="rpg-cursor-row flex items-start gap-1.5">
                  <span className="rpg-cursor mt-0.5">▶</span>
                  <span className="min-w-0">
                    <span className="block text-[15px]">⚑ {b.title}</span>
                    <span className="c-muted mt-0.5 block text-xs tabular-nums">
                      挑んでいる {guild.terms.quest} {questsForBoss(quests, b.id).length}・人{" "}
                      {challengerIds(quests, questApplications, b.id).length}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Window>
      )}

      <div className="mb-9">
        <Link href="/guild/quests/new" className="rpg-button h-12 w-full text-base sm:w-auto">
          ▶ {guild.terms.quest}を出す
        </Link>
      </div>

      <QuestBoard />
    </div>
  );
}
