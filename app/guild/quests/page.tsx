import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/guild/cards";
import { MarkSeen } from "@/components/guild/mark-seen";
import { QuestBoard } from "@/components/guild/quest-board";
import {
  getAuthenticatedUserId,
  getGuildContext,
  listGuildMembers,
  listGuildQuests,
} from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "クエスト けいじばん" };

export default async function QuestsPage() {
  const [context, quests, members, currentUserId] = await Promise.all([
    getGuildContext(),
    listGuildQuests(),
    listGuildMembers(),
    getAuthenticatedUserId(),
  ]);
  const questTerm = context.guild.terms.quest;

  return (
    <div>
      <MarkSeen list="quests" />
      <PageTitle
        title={`${questTerm} けいじばん`}
        lead="仕事の依頼・相談・協業したいことを、だれでも出せます。"
      />

      <div className="mb-9">
        <Link href="/guild/quests/new" className="rpg-button h-12 w-full text-base sm:w-auto">
          ▶ {questTerm}を出す
        </Link>
      </div>
      <QuestBoard quests={quests} members={members} currentUserId={currentUserId} />
    </div>
  );
}
