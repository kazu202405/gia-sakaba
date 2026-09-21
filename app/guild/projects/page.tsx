import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { LiveProjectList } from "@/components/guild/live-project-list";
import { getAuthenticatedUserId, getGuildContext, listGuildProjects } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "プロジェクト" };

export default async function ProjectsPage() {
  const [projects, context, userId] = await Promise.all([listGuildProjects(), getGuildContext(), getAuthenticatedUserId()]);
  return (
    <div>
      <PageTitle
        title="プロジェクト"
        lead="自分（たち）が すすめたいことを、タスクに分けて すすめます。自分だけのものは あなたにしか見えません。"
      />
      <LiveProjectList projects={projects} userId={userId} isPaid={context.is_paid} />
    </div>
  );
}
