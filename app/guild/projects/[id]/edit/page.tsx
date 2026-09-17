import type { Metadata } from "next";
import { ProjectForm } from "@/components/guild/project-form";

type Props = { params: Promise<{ id: string }> };

// 題名にプロジェクト名を出さない（本人だけのプロジェクト名が、タブや履歴から見えないように）
export const metadata: Metadata = { title: "プロジェクトを なおす" };

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  return <ProjectForm projectId={id} />;
}
