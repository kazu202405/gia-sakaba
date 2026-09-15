// /clone/[slug]/review/decisions の Server Actions。19_判断履歴。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface DecisionLogInput {
  occurred_at: string;
  theme?: string | null;
  conclusion?: string | null;
  reasoning?: string | null;
  values_emphasized?: string | null; // 自由入力 → text[]
  reusable_rule?: string | null;
  promote_to_core_os?: boolean;
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

export async function createDecisionLog(
  slug: string,
  tenantId: string,
  input: DecisionLogInput,
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

  const { error } = await supabase.from("ai_clone_decision_log").insert({
    tenant_id: tenantId,
    occurred_at: occurredAtDate.toISOString(),
    theme: norm(input.theme),
    conclusion: norm(input.conclusion),
    reasoning: norm(input.reasoning),
    values_emphasized: parseTags(input.values_emphasized),
    reusable_rule: norm(input.reusable_rule),
    promote_to_core_os: input.promote_to_core_os ?? false,
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/decisions`);
  return { ok: true };
}

export async function updateDecisionLog(
  slug: string,
  tenantId: string,
  decisionId: string,
  input: DecisionLogInput,
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
    .from("ai_clone_decision_log")
    .update({
      occurred_at: occurredAtDate.toISOString(),
      theme: norm(input.theme),
      conclusion: norm(input.conclusion),
      reasoning: norm(input.reasoning),
      values_emphasized: parseTags(input.values_emphasized),
      reusable_rule: norm(input.reusable_rule),
      promote_to_core_os: input.promote_to_core_os ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", decisionId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/decisions`);
  return { ok: true };
}

export async function deleteDecisionLog(
  slug: string,
  tenantId: string,
  decisionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_decision_log")
    .delete()
    .eq("id", decisionId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/decisions`);
  return { ok: true };
}
