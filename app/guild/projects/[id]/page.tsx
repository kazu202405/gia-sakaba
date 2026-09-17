import type { Metadata } from "next";
import { ProjectDetail } from "@/components/guild/project-detail";

type Props = { params: Promise<{ id: string }> };

// 題名にプロジェクト名を出さない（本人だけのプロジェクト名が、タブや履歴から見えないように）
export const metadata: Metadata = { title: "プロジェクト" };

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProjectDetail id={id} />;
}
