// /clone/[slug]/finance/activities の Server Actions。16_活動ログ。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActivityLogInput {
  occurred_date: string;
  content?: string | null;
  activity_type?: string | null;
  duration_minutes?: string | null;
  travel_minutes?: string | null;
  cost?: string | null;
  outcome?: string | null;
  next_action?: string | null;
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

export async function createActivityLog(
  slug: string,
  tenantId: string,
  input: ActivityLogInput,
): Promise<{ ok: boolean; error?: string }> {
  const occurred = input.occurred_date?.trim() ?? "";
  if (occurred.length === 0) {
    return { ok: false, error: "日付は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_activity_log").insert({
    tenant_id: tenantId,
    occurred_date: occurred,
    content: norm(input.content),
    activity_type: norm(input.activity_type),
    duration_minutes: parseNum(input.duration_minutes),
    travel_minutes: parseNum(input.travel_minutes),
    cost: parseNum(input.cost),
    outcome: norm(input.outcome),
    next_action: norm(input.next_action),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/finance/activities`);
  return { ok: true };
}

export async function updateActivityLog(
  slug: string,
  tenantId: string,
  activityId: string,
  input: ActivityLogInput,
): Promise<{ ok: boolean; error?: string }> {
  const occurred = input.occurred_date?.trim() ?? "";
  if (occurred.length === 0) {
    return { ok: false, error: "日付は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_activity_log")
    .update({
      occurred_date: occurred,
      content: norm(input.content),
      activity_type: norm(input.activity_type),
      duration_minutes: parseNum(input.duration_minutes),
      travel_minutes: parseNum(input.travel_minutes),
      cost: parseNum(input.cost),
      outcome: norm(input.outcome),
      next_action: norm(input.next_action),
      updated_at: new Date().toISOString(),
    })
    .eq("id", activityId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/finance/activities`);
  return { ok: true };
}

export async function deleteActivityLog(
  slug: string,
  tenantId: string,
  activityId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_activity_log")
    .delete()
    .eq("id", activityId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/finance/activities`);
  return { ok: true };
}
