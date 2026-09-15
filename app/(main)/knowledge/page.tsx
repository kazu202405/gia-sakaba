import { Metadata } from "next";
import { KnowledgeApp } from "@/components/knowledge/knowledge-app";

export const metadata: Metadata = {
  title: "行動科学ナレッジベース",
  description:
    "行動心理学・脳科学・行動経済学の効果辞典とカリキュラム。認知バイアス、ナッジ理論、行動変容の科学的知見を網羅。",
};

export default function KnowledgePage() {
  return <KnowledgeApp />;
}
