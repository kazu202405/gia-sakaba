// /clone/[slug]/finance/revenue の Server Actions。18_売上。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface RevenueInput {
  occurred_date: string; // YYYY-MM-DD
  customer?: string | null;
  amount: string; // not null
  expected_paid_date?: string | null;
  payment_status?: string | null;
  memo?: string | null;
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

export async function createRevenue(
  slug: string,
  tenantId: string,
  input: RevenueInput,
): Promise<{ ok: boolean; error?: string }> {
  const occurred = input.occurred_date?.trim() ?? "";
  if (occurred.length === 0) {
    return { ok: false, error: "日付は必須です" };
  }
  const amount = parseNum(input.amount);
  if (amount === null) {
    return { ok: false, error: "金額は必須です（数値）" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_revenue").insert({
    tenant_id: tenantId,
    occurred_date: occurred,
    customer: norm(input.customer),
    amount,
    expected_paid_date: norm(input.expected_paid_date),
    payment_status: norm(input.payment_status),
    memo: norm(input.memo),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/finance/revenue`);
  return { ok: true };
}

export async function updateRevenue(
  slug: string,
  tenantId: string,
  revenueId: string,
  input: RevenueInput,
): Promise<{ ok: boolean; error?: string }> {
  const occurred = input.occurred_date?.trim() ?? "";
  if (occurred.length === 0) {
    return { ok: false, error: "日付は必須です" };
  }
  const amount = parseNum(input.amount);
  if (amount === null) {
    return { ok: false, error: "金額は必須です（数値）" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_revenue")
    .update({
      occurred_date: occurred,
      customer: norm(input.customer),
      amount,
      expected_paid_date: norm(input.expected_paid_date),
      payment_status: norm(input.payment_status),
      memo: norm(input.memo),
      updated_at: new Date().toISOString(),
    })
    .eq("id", revenueId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/finance/revenue`);
  return { ok: true };
}

export async function deleteRevenue(
  slug: string,
  tenantId: string,
  revenueId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_revenue")
    .delete()
    .eq("id", revenueId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/finance/revenue`);
  return { ok: true };
}
