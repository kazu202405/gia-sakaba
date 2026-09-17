import type { Metadata } from "next";
import { QuestForm } from "@/components/guild/quest-form";
import { guild } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: `${guild.terms.quest}を出す` };

type Props = { searchParams: Promise<{ boss?: string }> };

// ?boss=ボスのid … ボスの画面から来たとき、そのボスを 最初から選んでおく
export default async function NewQuestPage({ searchParams }: Props) {
  const { boss } = await searchParams;
  return <QuestForm initialBossId={boss ?? ""} />;
}
