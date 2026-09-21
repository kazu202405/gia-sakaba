import type { Metadata } from "next";
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

      <p className="c-card mb-7 border-dashed px-4 py-3 text-sm leading-relaxed">
        {questTerm}の投稿・参加操作は、実データへの接続を順次進めています。いまは内容の閲覧ができます。
      </p>
      <QuestBoard quests={quests} members={members} currentUserId={currentUserId} />
    </div>
  );
}
