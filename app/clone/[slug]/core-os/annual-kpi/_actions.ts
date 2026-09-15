// /clone/[slug]/core-os/annual-kpi の Server Actions。03_今年のKPI。
// 汎用化後: 1年度 × 複数KPI（title + target_value + unit）。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AnnualKpiInput {
  fiscal_year: string; // not null
  title: string; // not null
  target_value?: string | null;
  unit?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const parseNum = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const t = v.trim();
  if (t.length === 0) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export async function createAnnualKpi(
  slug: string,
  tenantId: string,
  input: AnnualKpiInput,
): Promise<{ ok: boolean; error?: string }> {
  const fiscalYear = input.fiscal_year?.trim() ?? "";
  if (fiscalYear.length === 0) {
    return { ok: false, error: "年度は必須です" };
  }
  const title = input.title?.trim() ?? "";
  if (title.length === 0) {
    return { ok: false, error: "KPI名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_annual_kpi").insert({
    tenant_id: tenantId,
    fiscal_year: fiscalYear,
    title,
    target_value: parseNum(input.target_value),
    unit: norm(input.unit),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/annual-kpi`);
  return { ok: true };
}

export async function updateAnnualKpi(
  slug: string,
  tenantId: string,
  kpiId: string,
  input: AnnualKpiInput,
): Promise<{ ok: boolean; error?: string }> {
  const fiscalYear = input.fiscal_year?.trim() ?? "";
  if (fiscalYear.length === 0) {
    return { ok: false, error: "年度は必須です" };
  }
  const title = input.title?.trim() ?? "";
  if (title.length === 0) {
    return { ok: false, error: "KPI名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_annual_kpi")
    .update({
      fiscal_year: fiscalYear,
      title,
      target_value: parseNum(input.target_value),
      unit: norm(input.unit),
      updated_at: new Date().toISOString(),
    })
    .eq("id", kpiId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/annual-kpi`);
  return { ok: true };
}

export async function deleteAnnualKpi(
  slug: string,
  tenantId: string,
  kpiId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_annual_kpi")
    .delete()
    .eq("id", kpiId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/annual-kpi`);
  return { ok: true };
}
