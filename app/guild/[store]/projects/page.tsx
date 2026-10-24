import type { Metadata } from "next";
import { currentStore } from "@/lib/guild/current-store";
import { PageTitle } from "@/components/guild/cards";
import { LiveProjectList } from "@/components/guild/live-project-list";
import { getAuthenticatedUserId, getGuildContext, getMyPlanUsage, listGuildProjects } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "プロジェクト" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const store = await currentStore();
  const [projects, context, userId, query, usage] = await Promise.all([listGuildProjects(), getGuildContext(), getAuthenticatedUserId(), searchParams, getMyPlanUsage()]);
  const checkoutResult = query.checkout === "success" || query.checkout === "canceled" ? query.checkout : undefined;
  return (
    <div>
      <PageTitle
        title="プロジェクト"
        lead={store.w("projects.lead")}
      />
      <LiveProjectList projects={projects} userId={userId} isPaid={context.is_paid} checkoutResult={checkoutResult} quota={usage ? { plan: usage.plan, slot: usage.project } : null} />
    </div>
  );
}
