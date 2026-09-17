import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { ProjectList } from "@/components/guild/project-list";

export const metadata: Metadata = { title: "プロジェクト" };

export default function ProjectsPage() {
  return (
    <div>
      <PageTitle
        title="プロジェクト"
        lead="自分（たち）が すすめたいことを、タスクに分けて すすめます。自分だけのものは あなたにしか見えません。"
      />
      <ProjectList />
    </div>
  );
}
