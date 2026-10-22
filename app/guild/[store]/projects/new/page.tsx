import type { Metadata } from "next";
import { LiveProjectForm } from "@/components/guild/live-project-form";
import { getAuthenticatedUserId, getGuildContext, getMyPlanUsage, listGuildProjects } from "@/lib/guild/server-data";
import { isExhausted } from "@/lib/guild/plan-usage";

export const metadata: Metadata = { title: "プロジェクトを つくる" };

export default async function NewProjectPage() {
  const [projects, context, userId, usage] = await Promise.all([listGuildProjects(), getGuildContext(), getAuthenticatedUserId(), getMyPlanUsage()]);
  // 段ごとの上限（0114）。読めなかったときだけ前の判定で出し分ける（どちらでも最後はDBが止める）
  const canCreate = usage ? !isExhausted(usage.project) : context.is_paid || projects.filter((project) => project.owner_id === userId).length < 2;
  return <LiveProjectForm canCreate={canCreate} quota={usage ? { plan: usage.plan, slot: usage.project } : null} />;
}
