import { Metadata } from "next";
import { BehavioralScienceApp } from "@/components/knowledge/behavioral-science-app";

export const metadata: Metadata = {
  title: "ナレッジ",
  description:
    "行動心理学・脳科学・行動経済学の効果辞典。業務改善やDX推進に活かせる科学的知見を網羅しています。",
};

export default function BehavioralSciencePage() {
  return <BehavioralScienceApp />;
}
