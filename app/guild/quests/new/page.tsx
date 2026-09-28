import type { Metadata } from "next";
import { LiveQuestForm } from "@/components/guild/live-quest-form";
import { getGuildContext, getMyPlanUsage } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "クエストを出す" };

export default async function NewQuestPage() {
  const [context, usage] = await Promise.all([getGuildContext(), getMyPlanUsage()]);
  return <LiveQuestForm questTerm={context.guild.terms.quest} quota={usage ? { plan: usage.plan, slot: usage.quest } : null} />;
}
