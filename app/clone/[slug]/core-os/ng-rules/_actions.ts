// /clone/[slug]/core-os/ng-rules の Server Actions。06_NG判断・確認ルール。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface NgRuleInput {
  area_name: string;
  area?: string | null;
  reason_not_for_ai?: string | null;
  escalation_target?: string | null;
  confirmation_procedure?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function createNgRule(
  slug: string,
  tenantId: string,
  input: NgRuleInput,
): Promise<{ ok: boolean; error?: string }> {
  const areaName = input.area_name?.trim() ?? "";
  if (areaName.length === 0) {
    return { ok: false, error: "領域名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_ng_rule").insert({
    tenant_id: tenantId,
    area_name: areaName,
    area: norm(input.area),
    reason_not_for_ai: norm(input.reason_not_for_ai),
    escalation_target: norm(input.escalation_target),
    confirmation_procedure: norm(input.confirmation_procedure),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/ng-rules`);
  return { ok: true };
}

export async function updateNgRule(
  slug: string,
  tenantId: string,
  ruleId: string,
  input: NgRuleInput,
): Promise<{ ok: boolean; error?: string }> {
  const areaName = input.area_name?.trim() ?? "";
  if (areaName.length === 0) {
    return { ok: false, error: "領域名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_ng_rule")
    .update({
      area_name: areaName,
      area: norm(input.area),
      reason_not_for_ai: norm(input.reason_not_for_ai),
      escalation_target: norm(input.escalation_target),
      confirmation_procedure: norm(input.confirmation_procedure),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/ng-rules`);
  return { ok: true };
}

export async function deleteNgRule(
  slug: string,
  tenantId: string,
  ruleId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_ng_rule")
    .delete()
    .eq("id", ruleId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/ng-rules`);
  return { ok: true };
}
