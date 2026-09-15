// /clone/[slug]/core-os/three-year-plan の Server Actions。02_3年計画。
// 1テナント1行運用：既存があれば UPDATE、なければ INSERT。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ThreeYearPlanInput {
  plan_name: string; // not null
  ideal_state_in_3y?: string | null;
  business_pillars?: string | null; // 自由入力 → text[]
  revenue_model?: string | null;
  assets_to_build?: string | null;
  work_style_to_quit?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const parseTags = (v: string | null | undefined): string[] | null => {
  if (!v) return null;
  const parts = v
    .split(/[,、\/\n\r　]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : null;
};

export async function saveThreeYearPlan(
  slug: string,
  tenantId: string,
  existingId: string | null,
  input: ThreeYearPlanInput,
): Promise<{ ok: boolean; error?: string }> {
  const planName = input.plan_name?.trim() ?? "";
  if (planName.length === 0) {
    return { ok: false, error: "計画名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const payload = {
    tenant_id: tenantId,
    plan_name: planName,
    ideal_state_in_3y: norm(input.ideal_state_in_3y),
    business_pillars: parseTags(input.business_pillars),
    revenue_model: norm(input.revenue_model),
    assets_to_build: norm(input.assets_to_build),
    work_style_to_quit: norm(input.work_style_to_quit),
  };

  if (existingId) {
    const { error } = await supabase
      .from("ai_clone_three_year_plan")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .eq("tenant_id", tenantId);
    if (error) {
      return { ok: false, error: `保存に失敗しました：${error.message}` };
    }
  } else {
    const { error } = await supabase
      .from("ai_clone_three_year_plan")
      .insert(payload);
    if (error) {
      return { ok: false, error: `保存に失敗しました：${error.message}` };
    }
  }

  revalidatePath(`/clone/${slug}/core-os/three-year-plan`);
  return { ok: true };
}
