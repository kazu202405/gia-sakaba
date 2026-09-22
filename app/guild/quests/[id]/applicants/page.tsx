import { notFound } from "next/navigation";
import { BackLink, PageTitle } from "@/components/guild/cards";
import { LiveQuestApplicants } from "@/components/guild/live-quest-applicants";
import {
  getAuthenticatedUserId,
  getGuildContext,
  listGuildMembers,
  listGuildQuestApplicants,
  listGuildQuests,
} from "@/lib/guild/server-data";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "参加希望者" };

export default async function QuestApplicantsPage({ params }: Props) {
  const { id } = await params;
  const [context, quests, members, userId] = await Promise.all([
    getGuildContext(), listGuildQuests(), listGuildMembers(), getAuthenticatedUserId(),
  ]);
  const quest = quests.find((item) => item.id === id);
  const isMaster = context.membership.role === "owner" || context.membership.role === "master";
  if (!quest || quest.members_only || (quest.creator_id !== userId && !isMaster)) notFound();
  const applicants = await listGuildQuestApplicants(id);

  return <div className="space-y-8">
    <BackLink href={`/guild/quests/${id}`} label={`${context.guild.terms.quest}に戻る`} />
    <PageTitle title="参加希望者" lead={`「${quest.title}」に参加したい人を確認します。`} />
    <LiveQuestApplicants
      questId={id}
      questTerm={context.guild.terms.quest}
      applicants={applicants}
      members={members}
      canChoose={quest.creator_id === userId && (quest.status === "open" || quest.status === "in_progress")}
    />
  </div>;
}
