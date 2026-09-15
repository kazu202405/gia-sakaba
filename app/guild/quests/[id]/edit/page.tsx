import { notFound } from "next/navigation";
import { BackLink, Window } from "@/components/guild/cards";
import { QuestForm } from "@/components/guild/quest-form";
import { ME_ID, applicantCount, getQuest, guild } from "@/lib/guild/mock-data";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: `${guild.terms.quest}を なおす` };

export default async function EditQuestPage({ params }: Props) {
  const { id } = await params;
  const q = getQuest(id);
  if (!q) notFound();

  // 本番では RPC の中で「出した本人か・募集中か」を確かめる。見本では画面で止める
  const reason =
    q.creator_id !== ME_ID
      ? `${guild.terms.quest}を なおせるのは、出した人だけです。`
      : q.status !== "open"
        ? `なおせるのは 募集中の ${guild.terms.quest}だけです。`
        : null;

  if (reason) {
    return (
      <div className="space-y-11">
        <BackLink href={`/guild/quests/${q.id}`} label={`${guild.terms.quest}に もどる`} />
        <Window title={`${guild.terms.quest}を なおす`}>
          <p className="text-sm leading-relaxed">{reason}</p>
        </Window>
      </div>
    );
  }

  return <QuestForm quest={q} applicantCount={applicantCount(q.id)} />;
}
