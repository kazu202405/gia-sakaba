import type { Metadata } from "next";
import { ProjectForm } from "@/components/guild/project-form";

export const metadata: Metadata = { title: "プロジェクトを つくる" };

export default function NewProjectPage() {
  return <ProjectForm />;
}
