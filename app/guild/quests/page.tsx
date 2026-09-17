import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/guild/cards";
import { MarkSeen } from "@/components/guild/mark-seen";
import { QuestBoard } from "@/components/guild/quest-board";
import { guild } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: `${guild.terms.quest} けいじばん` };

export default function QuestsPage() {
  return (
    <div>
      <MarkSeen list="quests" />
      <PageTitle
        title={`${guild.terms.quest} けいじばん`}
        lead="仕事の依頼・相談・協業したいことを、だれでも出せます。"
      />

      <div className="mb-9">
        <Link href="/guild/quests/new" className="rpg-button h-12 w-full text-base sm:w-auto">
          ▶ {guild.terms.quest}を出す
        </Link>
      </div>

      <QuestBoard />
    </div>
  );
}
