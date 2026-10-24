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
import { currentStore } from "@/lib/guild/current-store";
import { Go } from "@/components/guild/go-mark";

export async function generateMetadata() {
  const store = await currentStore();
  return { title: store.w("quests.title", { quest: store.config.terms.quest }) };
}

export default async function QuestsPage() {
  const store = await currentStore();
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
        title={store.w("quests.title", { quest: questTerm })}
        lead={
          <>
            {store.w("quests.lead1")}
            <span className="mt-1 block">{store.w("quests.lead2")}</span>
            <span className="mt-1 block">{store.w("quests.lead3")}</span>
          </>
        }
      />

      <div className="mb-9">
        <Link href={store.path("/quests/new")} className="rpg-button h-12 w-full text-base sm:w-auto">
          <Go />{questTerm}を出す
        </Link>
      </div>
      <QuestBoard quests={quests} members={members} currentUserId={currentUserId} />
    </div>
  );
}
