// /clone/[slug]/projects の Server Actions。
// テナント member 判定は ai_clone_project への RLS が自動実行する。
//
// numeric 列（proposal_amount / contract_amount / revenue_total / cost_total / hours_invested）
// は input としては文字列で受け取り、サーバ側で number に正規化する。
// gross_profit / gross_margin / hourly_rate は GENERATED 列のため INSERT しない。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProjectInput {
  name: string;
  status?: string | null;
  proposal_amount?: string | null;
  contract_amount?: string | null;
  // migration 0055: 概算売上の素材。人数 × 単価 = 概算。
  headcount?: string | null;
  unit_price?: string | null;
  revenue_total?: string | null;
  cost_total?: string | null;
  hours_invested?: string | null;
  next_action?: string | null;
  pending_decision?: string | null;
  due_date?: string | null; // YYYY-MM-DD
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

// "1,200" や全角数字を弾き、有限な数値だけを受け取る。
const parseNum = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const t = v.trim();
  if (t.length === 0) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

// integer 列用（人数）。小数が来たら四捨五入。
const parseIntOrNull = (v: string | null | undefined): number | null => {
  const n = parseNum(v);
  return n === null ? null : Math.round(n);
};

export async function createProject(
  slug: string,
  tenantId: string,
  input: ProjectInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "案件名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_project").insert({
    tenant_id: tenantId,
    name,
    status: norm(input.status),
    proposal_amount: parseNum(input.proposal_amount),
    contract_amount: parseNum(input.contract_amount),
    headcount: parseIntOrNull(input.headcount),
    unit_price: parseNum(input.unit_price),
    // revenue_total / cost_total / hours_invested は default 0 のため、
    // 入力なしの場合は明示 0 を入れて GENERATED 列の計算が0スタートになるようにする。
    revenue_total: parseNum(input.revenue_total) ?? 0,
    cost_total: parseNum(input.cost_total) ?? 0,
    hours_invested: parseNum(input.hours_invested) ?? 0,
    next_action: norm(input.next_action),
    pending_decision: norm(input.pending_decision),
    due_date: norm(input.due_date),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/projects`);
  return { ok: true };
}

export async function updateProject(
  slug: string,
  tenantId: string,
  projectId: string,
  input: ProjectInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "案件名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_project")
    .update({
      name,
      status: norm(input.status),
      proposal_amount: parseNum(input.proposal_amount),
      contract_amount: parseNum(input.contract_amount),
      headcount: parseIntOrNull(input.headcount),
      unit_price: parseNum(input.unit_price),
      revenue_total: parseNum(input.revenue_total) ?? 0,
      cost_total: parseNum(input.cost_total) ?? 0,
      hours_invested: parseNum(input.hours_invested) ?? 0,
      next_action: norm(input.next_action),
      pending_decision: norm(input.pending_decision),
      due_date: norm(input.due_date),
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/projects`);
  revalidatePath(`/clone/${slug}/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProject(
  slug: string,
  tenantId: string,
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_project")
    .delete()
    .eq("id", projectId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/projects`);
  return { ok: true };
}
