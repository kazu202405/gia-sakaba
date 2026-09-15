// /clone/[slug]/review/monthly の Server Actions。23_月次レビュー。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface MonthlyReviewInput {
  target_month: string;
  revenue?: number | null;
  expense?: number | null;
  top_people?: string | null;
  top_projects?: string | null;
  high_margin_projects?: string | null;
  low_margin_projects?: string | null;
  activities_to_reduce?: string | null;
  activities_to_increase?: string | null;
  improvement_actions?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const normNum = (v: number | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  if (Number.isNaN(v) || !Number.isFinite(v)) return null;
  return v;
};

export async function createMonthlyReview(
  slug: string,
  tenantId: string,
  input: MonthlyReviewInput,
): Promise<{ ok: boolean; error?: string }> {
  const targetMonth = input.target_month?.trim() ?? "";
  if (targetMonth.length === 0) {
    return { ok: false, error: "対象月は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase.from("ai_clone_monthly_review").insert({
    tenant_id: tenantId,
    target_month: targetMonth,
    revenue: normNum(input.revenue),
    expense: normNum(input.expense),
    top_people: norm(input.top_people),
    top_projects: norm(input.top_projects),
    high_margin_projects: norm(input.high_margin_projects),
    low_margin_projects: norm(input.low_margin_projects),
    activities_to_reduce: norm(input.activities_to_reduce),
    activities_to_increase: norm(input.activities_to_increase),
    improvement_actions: norm(input.improvement_actions),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/monthly`);
  return { ok: true };
}

export async function updateMonthlyReview(
  slug: string,
  tenantId: string,
  reviewId: string,
  input: MonthlyReviewInput,
): Promise<{ ok: boolean; error?: string }> {
  const targetMonth = input.target_month?.trim() ?? "";
  if (targetMonth.length === 0) {
    return { ok: false, error: "対象月は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("ai_clone_monthly_review")
    .update({
      target_month: targetMonth,
      revenue: normNum(input.revenue),
      expense: normNum(input.expense),
      top_people: norm(input.top_people),
      top_projects: norm(input.top_projects),
      high_margin_projects: norm(input.high_margin_projects),
      low_margin_projects: norm(input.low_margin_projects),
      activities_to_reduce: norm(input.activities_to_reduce),
      activities_to_increase: norm(input.activities_to_increase),
      improvement_actions: norm(input.improvement_actions),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/monthly`);
  return { ok: true };
}

export async function deleteMonthlyReview(
  slug: string,
  tenantId: string,
  reviewId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("ai_clone_monthly_review")
    .delete()
    .eq("id", reviewId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/monthly`);
  return { ok: true };
}
