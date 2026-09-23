import { notFound } from "next/navigation";
import { LiveQuestForm } from "@/components/guild/live-quest-form";
import { getAuthenticatedUserId, getGuildContext, listGuildQuests } from "@/lib/guild/server-data";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "クエストをなおす" };

export default async function EditQuestPage({ params }: Props) {
  const { id } = await params;
  const [context, quests, userId] = await Promise.all([
    getGuildContext(), listGuildQuests(), getAuthenticatedUserId(),
  ]);
  const quest = quests.find((item) => item.id === id);
  if (!quest || quest.creator_id !== userId || !["open", "in_progress"].includes(quest.status)) notFound();
  const canCreateGathering = context.membership.role === "owner" || context.membership.role === "master";

  return <LiveQuestForm questTerm={context.guild.terms.quest} quest={quest} canCreateGathering={canCreateGathering} />;
}
