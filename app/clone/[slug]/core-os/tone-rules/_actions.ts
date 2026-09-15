// /clone/[slug]/core-os/tone-rules の Server Actions。05_口調・対応ルール。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ToneRuleInput {
  name: string;
  base_tone?: string | null;
  politeness?: string | null;
  ng_expressions?: string | null;
  reply_length?: string | null;
  confirm_before_proposing?: string | null;
  no_pushy_rule?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function createToneRule(
  slug: string,
  tenantId: string,
  input: ToneRuleInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "ルール名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_tone_rule").insert({
    tenant_id: tenantId,
    name,
    base_tone: norm(input.base_tone),
    politeness: norm(input.politeness),
    ng_expressions: norm(input.ng_expressions),
    reply_length: norm(input.reply_length),
    confirm_before_proposing: norm(input.confirm_before_proposing),
    no_pushy_rule: norm(input.no_pushy_rule),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/tone-rules`);
  return { ok: true };
}

export async function updateToneRule(
  slug: string,
  tenantId: string,
  ruleId: string,
  input: ToneRuleInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "ルール名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_tone_rule")
    .update({
      name,
      base_tone: norm(input.base_tone),
      politeness: norm(input.politeness),
      ng_expressions: norm(input.ng_expressions),
      reply_length: norm(input.reply_length),
      confirm_before_proposing: norm(input.confirm_before_proposing),
      no_pushy_rule: norm(input.no_pushy_rule),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/tone-rules`);
  return { ok: true };
}

export async function deleteToneRule(
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
    .from("ai_clone_tone_rule")
    .delete()
    .eq("id", ruleId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/tone-rules`);
  return { ok: true };
}
