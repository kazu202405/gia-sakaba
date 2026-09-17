import type { Metadata } from "next";
import { PlanForm } from "@/components/guild/plan-form";

export const metadata: Metadata = { title: "有料会員" };

// 有料会員の申し込み（見本）。本番は GIA の会員の段（¥480前後の入口の段）で Stripe に進み、
// 「あなたの つよみ」が入っているかを サーバー側でも確かめてから 決済に進める
export default function PlanPage() {
  return <PlanForm />;
}
