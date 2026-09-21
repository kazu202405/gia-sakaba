import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveProjectDetail } from "@/components/guild/live-project-detail";
import { getAuthenticatedUserId, listGuildProjects } from "@/lib/guild/server-data";

type Props = { params: Promise<{ id: string }> };

// 題名にプロジェクト名を出さない（本人だけのプロジェクト名が、タブや履歴から見えないように）
export const metadata: Metadata = { title: "プロジェクト" };

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const [projects, userId] = await Promise.all([listGuildProjects(), getAuthenticatedUserId()]);
  const project = projects.find((item) => item.id === id);
  if (!project) notFound();
  return <LiveProjectDetail project={project} canEdit={project.owner_id === userId} />;
}
