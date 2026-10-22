import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveProjectForm } from "@/components/guild/live-project-form";
import { getAuthenticatedUserId, listGuildProjects } from "@/lib/guild/server-data";

type Props = { params: Promise<{ id: string }> };

// 題名にプロジェクト名を出さない（本人だけのプロジェクト名が、タブや履歴から見えないように）
export const metadata: Metadata = { title: "プロジェクトを なおす" };

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const [projects, userId] = await Promise.all([listGuildProjects(), getAuthenticatedUserId()]);
  const project = projects.find((item) => item.id === id && item.owner_id === userId);
  if (!project) notFound();
  return <LiveProjectForm project={project} />;
}
