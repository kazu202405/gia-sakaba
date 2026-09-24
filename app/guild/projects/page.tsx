import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { LiveProjectList } from "@/components/guild/live-project-list";
import { getAuthenticatedUserId, getGuildContext, listGuildProjects } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "プロジェクト" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [projects, context, userId, query] = await Promise.all([listGuildProjects(), getGuildContext(), getAuthenticatedUserId(), searchParams]);
  const checkoutResult = query.checkout === "success" || query.checkout === "canceled" ? query.checkout : undefined;
  return (
    <div>
      <PageTitle
        title="プロジェクト"
        lead="自分（たち）が すすめたいことを、タスクに分けて すすめます。自分だけのものは あなたにしか見えません。"
      />
      <LiveProjectList projects={projects} userId={userId} isPaid={context.is_paid} checkoutResult={checkoutResult} />
    </div>
  );
}
