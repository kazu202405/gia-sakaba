// /clone/[slug]/review/weekly の Server Actions。22_週次レビュー。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface WeeklyReviewInput {
  period: string;
  key_decisions?: string | null;
  progressed_projects?: string | null;
  stuck_projects?: string | null;
  new_decision_rules?: string | null;
  relationship_changes?: string | null;
  next_week_priorities?: string | null;
  promote_to_core_os?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function createWeeklyReview(
  slug: string,
  tenantId: string,
  input: WeeklyReviewInput,
): Promise<{ ok: boolean; error?: string }> {
  const period = input.period?.trim() ?? "";
  if (period.length === 0) {
    return { ok: false, error: "対象期間は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase.from("ai_clone_weekly_review").insert({
    tenant_id: tenantId,
    period,
    key_decisions: norm(input.key_decisions),
    progressed_projects: norm(input.progressed_projects),
    stuck_projects: norm(input.stuck_projects),
    new_decision_rules: norm(input.new_decision_rules),
    relationship_changes: norm(input.relationship_changes),
    next_week_priorities: norm(input.next_week_priorities),
    promote_to_core_os: norm(input.promote_to_core_os),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/weekly`);
  return { ok: true };
}

export async function updateWeeklyReview(
  slug: string,
  tenantId: string,
  reviewId: string,
  input: WeeklyReviewInput,
): Promise<{ ok: boolean; error?: string }> {
  const period = input.period?.trim() ?? "";
  if (period.length === 0) {
    return { ok: false, error: "対象期間は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("ai_clone_weekly_review")
    .update({
      period,
      key_decisions: norm(input.key_decisions),
      progressed_projects: norm(input.progressed_projects),
      stuck_projects: norm(input.stuck_projects),
      new_decision_rules: norm(input.new_decision_rules),
      relationship_changes: norm(input.relationship_changes),
      next_week_priorities: norm(input.next_week_priorities),
      promote_to_core_os: norm(input.promote_to_core_os),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/weekly`);
  return { ok: true };
}

export async function deleteWeeklyReview(
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
    .from("ai_clone_weekly_review")
    .delete()
    .eq("id", reviewId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/weekly`);
  return { ok: true };
}
