import type { Metadata } from "next";
import { QuestForm } from "@/components/guild/quest-form";
import { guild } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: `${guild.terms.quest}を出す` };

export default function NewQuestPage() {
  return <QuestForm />;
}
