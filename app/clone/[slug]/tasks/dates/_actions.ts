// /clone/[slug]/tasks/dates（記念日・日付リマインド）の Server Actions。
// データ: ai_clone_dated_reminder（migration 0044）

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Recurrence } from "@/lib/ai-clone/dated-reminder";

export interface DatedReminderInput {
  title: string;
  base_date: string; // YYYY-MM-DD
  recurrence: Recurrence;
  milestone_months: number[];
  note?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const VALID_RECURRENCE: Recurrence[] = ["none", "yearly", "monthly", "milestone"];

function sanitizeMonths(recurrence: Recurrence, months: number[]): number[] {
  if (recurrence !== "milestone") return [];
  return Array.from(
    new Set(
      (months ?? [])
        .map((n) => Math.trunc(Number(n)))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 600),
    ),
  ).sort((a, b) => a - b);
}

export async function createDatedReminder(
  slug: string,
  tenantId: string,
  input: DatedReminderInput,
): Promise<{ ok: boolean; error?: string }> {
  const title = input.title?.trim() ?? "";
  if (title.length === 0) {
    return { ok: false, error: "タイトルは必須です" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.base_date ?? "")) {
    return { ok: false, error: "基準日を入力してください" };
  }
  const recurrence: Recurrence = VALID_RECURRENCE.includes(input.recurrence)
    ? input.recurrence
    : "none";
  const months = sanitizeMonths(recurrence, input.milestone_months);
  if (recurrence === "milestone" && months.length === 0) {
    return { ok: false, error: "節目（何ヶ月後に通知するか）を1つ以上選んでください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_dated_reminder").insert({
    tenant_id: tenantId,
    title,
    base_date: input.base_date,
    recurrence,
    milestone_months: months,
    note: norm(input.note),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/tasks/dates`);
  return { ok: true };
}

export async function deleteDatedReminder(
  slug: string,
  tenantId: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_dated_reminder")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/tasks/dates`);
  return { ok: true };
}
