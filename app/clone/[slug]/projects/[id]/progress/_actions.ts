// /clone/[slug]/projects/[id]/progress の Server Actions。14_案件進捗ログ。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProgressLogInput {
  occurred_at: string;
  content?: string | null;
  current_state?: string | null;
  challenges?: string | null;
  next_action?: string | null;
  needs_decision?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function createProgressLog(
  slug: string,
  tenantId: string,
  projectId: string,
  input: ProgressLogInput,
): Promise<{ ok: boolean; error?: string }> {
  const occurredRaw = input.occurred_at?.trim() ?? "";
  if (occurredRaw.length === 0) {
    return { ok: false, error: "日時は必須です" };
  }
  const occurredAtDate = new Date(occurredRaw);
  if (Number.isNaN(occurredAtDate.getTime())) {
    return { ok: false, error: "日時の形式が不正です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_project_progress_log").insert({
    tenant_id: tenantId,
    project_id: projectId,
    occurred_at: occurredAtDate.toISOString(),
    content: norm(input.content),
    current_state: norm(input.current_state),
    challenges: norm(input.challenges),
    next_action: norm(input.next_action),
    needs_decision: norm(input.needs_decision),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/projects/${projectId}/progress`);
  revalidatePath(`/clone/${slug}/projects/${projectId}`);
  return { ok: true };
}

export async function updateProgressLog(
  slug: string,
  tenantId: string,
  projectId: string,
  logId: string,
  input: ProgressLogInput,
): Promise<{ ok: boolean; error?: string }> {
  const occurredRaw = input.occurred_at?.trim() ?? "";
  if (occurredRaw.length === 0) {
    return { ok: false, error: "日時は必須です" };
  }
  const occurredAtDate = new Date(occurredRaw);
  if (Number.isNaN(occurredAtDate.getTime())) {
    return { ok: false, error: "日時の形式が不正です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_project_progress_log")
    .update({
      occurred_at: occurredAtDate.toISOString(),
      content: norm(input.content),
      current_state: norm(input.current_state),
      challenges: norm(input.challenges),
      next_action: norm(input.next_action),
      needs_decision: norm(input.needs_decision),
      updated_at: new Date().toISOString(),
    })
    .eq("id", logId)
    .eq("tenant_id", tenantId)
    .eq("project_id", projectId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/projects/${projectId}/progress`);
  revalidatePath(`/clone/${slug}/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProgressLog(
  slug: string,
  tenantId: string,
  projectId: string,
  logId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_project_progress_log")
    .delete()
    .eq("id", logId)
    .eq("tenant_id", tenantId)
    .eq("project_id", projectId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/projects/${projectId}/progress`);
  revalidatePath(`/clone/${slug}/projects/${projectId}`);
  return { ok: true };
}
