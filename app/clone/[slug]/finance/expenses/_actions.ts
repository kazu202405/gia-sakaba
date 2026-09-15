// /clone/[slug]/finance/expenses の Server Actions。17_経費。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ExpenseInput {
  occurred_date: string;
  amount: string; // not null
  category?: string | null;
  payee?: string | null;
  purpose?: string | null;
  fixed_or_variable?: string | null;
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

export async function createExpense(
  slug: string,
  tenantId: string,
  input: ExpenseInput,
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

  const { error } = await supabase.from("ai_clone_expense").insert({
    tenant_id: tenantId,
    occurred_date: occurred,
    amount,
    category: norm(input.category),
    payee: norm(input.payee),
    purpose: norm(input.purpose),
    fixed_or_variable: norm(input.fixed_or_variable),
    memo: norm(input.memo),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/finance/expenses`);
  return { ok: true };
}

export async function updateExpense(
  slug: string,
  tenantId: string,
  expenseId: string,
  input: ExpenseInput,
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
    .from("ai_clone_expense")
    .update({
      occurred_date: occurred,
      amount,
      category: norm(input.category),
      payee: norm(input.payee),
      purpose: norm(input.purpose),
      fixed_or_variable: norm(input.fixed_or_variable),
      memo: norm(input.memo),
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/finance/expenses`);
  return { ok: true };
}

export async function deleteExpense(
  slug: string,
  tenantId: string,
  expenseId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_expense")
    .delete()
    .eq("id", expenseId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/finance/expenses`);
  return { ok: true };
}
