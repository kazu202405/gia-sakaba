import { currentStore } from "@/lib/guild/current-store";
import { LiveQuestForm } from "@/components/guild/live-quest-form";
import { getGuildContext, getMyPlanUsage } from "@/lib/guild/server-data";

export async function generateMetadata() {
  const store = await currentStore();
  return { title: `${store.config.terms.quest}を出す` };
}

export default async function NewQuestPage() {
  const [context, usage] = await Promise.all([getGuildContext(), getMyPlanUsage()]);
  return <LiveQuestForm questTerm={context.guild.terms.quest} quota={usage ? { plan: usage.plan, slot: usage.quest } : null} />;
}
