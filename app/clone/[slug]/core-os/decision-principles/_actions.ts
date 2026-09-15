// /clone/[slug]/core-os/decision-principles の Server Actions。04_判断基準。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface DecisionPrincipleInput {
  name: string;
  category?: string | null;
  rule?: string | null;
  reason?: string | null;
  priority?: string | null; // 高/中/低
  exception?: string | null;
  related_values?: string | null; // 自由入力 → text[]
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

export async function createDecisionPrinciple(
  slug: string,
  tenantId: string,
  input: DecisionPrincipleInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "判断名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_decision_principle").insert({
    tenant_id: tenantId,
    name,
    category: norm(input.category),
    rule: norm(input.rule),
    reason: norm(input.reason),
    priority: norm(input.priority),
    exception: norm(input.exception),
    related_values: parseTags(input.related_values),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/decision-principles`);
  return { ok: true };
}

export async function updateDecisionPrinciple(
  slug: string,
  tenantId: string,
  principleId: string,
  input: DecisionPrincipleInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "判断名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_decision_principle")
    .update({
      name,
      category: norm(input.category),
      rule: norm(input.rule),
      reason: norm(input.reason),
      priority: norm(input.priority),
      exception: norm(input.exception),
      related_values: parseTags(input.related_values),
      updated_at: new Date().toISOString(),
    })
    .eq("id", principleId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/decision-principles`);
  return { ok: true };
}

export async function deleteDecisionPrinciple(
  slug: string,
  tenantId: string,
  principleId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_decision_principle")
    .delete()
    .eq("id", principleId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/decision-principles`);
  return { ok: true };
}

// ─── 判断事例（decision_case） CRUD ─────────────────────────
// Phase 1：ショート版（5項目）の手入力。AI 補完・原則紐付けは Phase 2 以降。

export interface DecisionCaseInput {
  // 必須
  event: string;
  // 短ログ
  insight?: string | null;
  action?: string | null;
  outcome?: string | null;
  takeaway?: string | null;
  // 長ログ
  intent?: string | null;
  boundary?: string | null;
  reflection?: string | null;
  reusable_when?: string | null;
  emotion?: string | null;
  // capture_mode は呼び出し側で指定（既定 short）
  capture_mode?: "short" | "long";
  // 日時（datetime-local "YYYY-MM-DDTHH:MM" or ISO 文字列、空なら now()）
  occurred_at?: string | null;
}

function toOccurredAtIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  // datetime-local からの値は秒を持たないので Date でラップして ISO 化
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function createDecisionCase(
  slug: string,
  tenantId: string,
  input: DecisionCaseInput,
): Promise<{ ok: boolean; error?: string }> {
  const event = input.event?.trim() ?? "";
  if (event.length === 0) {
    return { ok: false, error: "出来事（event）は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const occurredAt = toOccurredAtIso(input.occurred_at);

  const { error } = await supabase.from("ai_clone_decision_case").insert({
    tenant_id: tenantId,
    event,
    insight: norm(input.insight),
    action: norm(input.action),
    outcome: norm(input.outcome),
    takeaway: norm(input.takeaway),
    intent: norm(input.intent),
    boundary: norm(input.boundary),
    reflection: norm(input.reflection),
    reusable_when: norm(input.reusable_when),
    emotion: norm(input.emotion),
    capture_mode: input.capture_mode ?? "short",
    ...(occurredAt ? { occurred_at: occurredAt } : {}),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/decision-principles`);
  return { ok: true };
}

export async function updateDecisionCase(
  slug: string,
  tenantId: string,
  caseId: string,
  input: DecisionCaseInput,
): Promise<{ ok: boolean; error?: string }> {
  const event = input.event?.trim() ?? "";
  if (event.length === 0) {
    return { ok: false, error: "出来事（event）は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const occurredAt = toOccurredAtIso(input.occurred_at);

  const { error } = await supabase
    .from("ai_clone_decision_case")
    .update({
      event,
      insight: norm(input.insight),
      action: norm(input.action),
      outcome: norm(input.outcome),
      takeaway: norm(input.takeaway),
      intent: norm(input.intent),
      boundary: norm(input.boundary),
      reflection: norm(input.reflection),
      reusable_when: norm(input.reusable_when),
      emotion: norm(input.emotion),
      capture_mode: input.capture_mode ?? "short",
      ...(occurredAt ? { occurred_at: occurredAt } : {}),
    })
    .eq("id", caseId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/decision-principles`);
  return { ok: true };
}

export async function deleteDecisionCase(
  slug: string,
  tenantId: string,
  caseId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_decision_case")
    .delete()
    .eq("id", caseId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/decision-principles`);
  return { ok: true };
}

// Slack/LINE 経由で AI が抽出した「未確認」事例を、ユーザーが内容確認した
// タイミングで正本化（confirmed=true）するための専用 action。
// 内容自体は別途 updateDecisionCase で修正してから呼ぶ想定。
export async function confirmDecisionCase(
  slug: string,
  tenantId: string,
  caseId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_decision_case")
    .update({ confirmed: true, updated_at: new Date().toISOString() })
    .eq("id", caseId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `確認に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/decision-principles`);
  return { ok: true };
}
