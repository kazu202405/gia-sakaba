import { Metadata } from "next";
import { AdvisorApp } from "@/components/advisor/advisor-app";

export const metadata: Metadata = {
  title: "AIアドバイザー",
  description:
    "業務整理・組織改善の専門AIに、業務フローや意思決定の改善について相談できます。",
};

export default function AdvisorPage() {
  return <AdvisorApp />;
}
