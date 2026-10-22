import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveQuestForm } from "@/components/guild/live-quest-form";
import { getGuildContext } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "集まりを ひらく" };

export default async function NewGatheringPage() {
  const context = await getGuildContext();
  if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
  return <LiveQuestForm questTerm={context.guild.terms.quest} gathering />;
}
