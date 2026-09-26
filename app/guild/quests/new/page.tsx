import type { Metadata } from "next";
import { LiveQuestForm } from "@/components/guild/live-quest-form";
import { getGuildContext } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "クエストを出す" };

export default async function NewQuestPage() {
  const context = await getGuildContext();
  return <LiveQuestForm questTerm={context.guild.terms.quest} />;
}
