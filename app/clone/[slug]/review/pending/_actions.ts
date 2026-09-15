// /clone/[slug]/review/pending の Server Actions。21_更新待ちルール。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface PendingRuleInput {
  proposed_change: string;
  rule_kind?: string | null;
  reason?: string | null;
  target_db?: string | null;
  origin_log?: string | null;
}

const APPROVAL_VALUES = ["申請中", "承認", "却下", "保留"] as const;
type ApprovalStatus = (typeof APPROVAL_VALUES)[number];

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function createPendingRule(
  slug: string,
  tenantId: string,
  input: PendingRuleInput,
): Promise<{ ok: boolean; error?: string }> {
  const proposed = input.proposed_change?.trim() ?? "";
  if (proposed.length === 0) {
    return { ok: false, error: "提案内容は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase.from("ai_clone_pending_rule").insert({
    tenant_id: tenantId,
    proposed_change: proposed,
    rule_kind: norm(input.rule_kind),
    reason: norm(input.reason),
    target_db: norm(input.target_db),
    origin_log: norm(input.origin_log),
    approval_status: "申請中",
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/pending`);
  return { ok: true };
}

export async function updatePendingRuleStatus(
  slug: string,
  tenantId: string,
  ruleId: string,
  approvalStatus: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!APPROVAL_VALUES.includes(approvalStatus as ApprovalStatus)) {
    return { ok: false, error: "不正なステータスです" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  // 承認/却下時は approver を記録、申請中/保留に戻す時は null へ
  const approverId =
    approvalStatus === "承認" || approvalStatus === "却下" ? user.id : null;

  const { error } = await supabase
    .from("ai_clone_pending_rule")
    .update({
      approval_status: approvalStatus,
      approver_user_id: approverId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/pending`);
  return { ok: true };
}

export async function updatePendingRule(
  slug: string,
  tenantId: string,
  ruleId: string,
  input: PendingRuleInput,
): Promise<{ ok: boolean; error?: string }> {
  const proposed = input.proposed_change?.trim() ?? "";
  if (proposed.length === 0) {
    return { ok: false, error: "提案内容は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("ai_clone_pending_rule")
    .update({
      proposed_change: proposed,
      rule_kind: norm(input.rule_kind),
      reason: norm(input.reason),
      target_db: norm(input.target_db),
      origin_log: norm(input.origin_log),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/pending`);
  return { ok: true };
}

export async function deletePendingRule(
  slug: string,
  tenantId: string,
  ruleId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("ai_clone_pending_rule")
    .delete()
    .eq("id", ruleId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/pending`);
  return { ok: true };
}
