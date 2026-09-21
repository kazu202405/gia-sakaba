import type { Metadata } from "next";
import { LiveProjectForm } from "@/components/guild/live-project-form";
import { getAuthenticatedUserId, getGuildContext, listGuildProjects } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "プロジェクトを つくる" };

export default async function NewProjectPage() {
  const [projects, context, userId] = await Promise.all([listGuildProjects(), getGuildContext(), getAuthenticatedUserId()]);
  return <LiveProjectForm canCreate={context.is_paid || projects.filter((project) => project.owner_id === userId).length < 2} />;
}
