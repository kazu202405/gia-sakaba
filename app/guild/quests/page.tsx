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
        lead={
          <>
            手伝ってほしいこと・お願いしたい仕事を出して、できる人を探す場所です。
            <span className="mt-1 block">例：「LPを作れる人を探しています」「来月の勉強会で話せる方いませんか」</span>
            <span className="mt-1 block">（自分のサービスの紹介は、プロフィールに書いてください）</span>
          </>
        }
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
