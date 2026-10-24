import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveQuestForm } from "@/components/guild/live-quest-form";
import { getGuildContext } from "@/lib/guild/server-data";
import { currentStore } from "@/lib/guild/current-store";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await currentStore()).w("gathering.newTitle") };
}

export default async function NewGatheringPage() {
  const context = await getGuildContext();
  if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
  return <LiveQuestForm questTerm={context.guild.terms.quest} gathering />;
}
