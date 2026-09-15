// /clone/[slug]/tasks の Server Actions。15_タスク。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TaskInput {
  name: string;
  status?: string | null; // 未着手 / 進行中 / 完了 / 保留
  priority?: string | null; // 高 / 中 / 低
  due_date?: string | null;
  purpose?: string | null;
  origin_log?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const VALID_STATUSES = ["未着手", "進行中", "完了", "保留"];

export async function createTask(
  slug: string,
  tenantId: string,
  input: TaskInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "タスク名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_task").insert({
    tenant_id: tenantId,
    name,
    status: norm(input.status) ?? "未着手",
    priority: norm(input.priority),
    due_date: norm(input.due_date),
    purpose: norm(input.purpose),
    origin_log: norm(input.origin_log),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/tasks`);
  return { ok: true };
}

// 一覧上のステータス変更（チェックで完了化など）。最小ループで便利なので付けておく。
export async function updateTaskStatus(
  slug: string,
  tenantId: string,
  taskId: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "不正なステータスです" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_task")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/tasks`);
  return { ok: true };
}

// 全フィールド更新（編集ダイアログ用）
export async function updateTask(
  slug: string,
  tenantId: string,
  taskId: string,
  input: TaskInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "タスク名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_task")
    .update({
      name,
      status: norm(input.status) ?? "未着手",
      priority: norm(input.priority),
      due_date: norm(input.due_date),
      purpose: norm(input.purpose),
      origin_log: norm(input.origin_log),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/tasks`);
  return { ok: true };
}

export async function deleteTask(
  slug: string,
  tenantId: string,
  taskId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_task")
    .delete()
    .eq("id", taskId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/tasks`);
  return { ok: true };
}
