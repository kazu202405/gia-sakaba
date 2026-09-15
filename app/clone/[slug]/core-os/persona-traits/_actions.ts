// /clone/[slug]/core-os/persona-traits の Server Actions。
//
// 用途：
//   * 候補（status='candidate'）の採択 / 却下
//   * trait / detail / category の編集
//   * 手動追加（AI 抽出を待たずに自分で書く）
//   * 削除
//
// 採択（adopted）されたものは generateReply のシステムプロンプトに注入される。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PERSONA_TRAIT_CATEGORIES } from "@/lib/ai-clone/supabase-db";

export type PersonaTraitStatus = "candidate" | "adopted" | "dismissed";

export interface PersonaTraitInput {
  category: string;
  trait: string;
  detail?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

function validateCategory(c: string): { ok: true } | { ok: false; error: string } {
  if (!(PERSONA_TRAIT_CATEGORIES as readonly string[]).includes(c)) {
    return {
      ok: false,
      error: `category は ${PERSONA_TRAIT_CATEGORIES.join(" / ")} のいずれかを指定してください`,
    };
  }
  return { ok: true };
}

export async function createPersonaTrait(
  slug: string,
  tenantId: string,
  input: PersonaTraitInput,
  status: PersonaTraitStatus = "candidate",
): Promise<{ ok: boolean; error?: string }> {
  const trait = input.trait?.trim() ?? "";
  if (trait.length === 0) return { ok: false, error: "傾向は必須です" };
  const cat = validateCategory(input.category);
  if (!cat.ok) return { ok: false, error: cat.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase.from("ai_clone_persona_trait").insert({
    tenant_id: tenantId,
    category: input.category,
    trait,
    detail: norm(input.detail),
    status,
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/persona-traits`);
  return { ok: true };
}

export async function updatePersonaTrait(
  slug: string,
  tenantId: string,
  traitId: string,
  input: PersonaTraitInput,
): Promise<{ ok: boolean; error?: string }> {
  const trait = input.trait?.trim() ?? "";
  if (trait.length === 0) return { ok: false, error: "傾向は必須です" };
  const cat = validateCategory(input.category);
  if (!cat.ok) return { ok: false, error: cat.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("ai_clone_persona_trait")
    .update({
      category: input.category,
      trait,
      detail: norm(input.detail),
    })
    .eq("id", traitId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/persona-traits`);
  return { ok: true };
}

export async function updatePersonaTraitStatus(
  slug: string,
  tenantId: string,
  traitId: string,
  status: PersonaTraitStatus,
): Promise<{ ok: boolean; error?: string }> {
  if (!["candidate", "adopted", "dismissed"].includes(status)) {
    return { ok: false, error: "不正なステータスです" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("ai_clone_persona_trait")
    .update({ status })
    .eq("id", traitId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/persona-traits`);
  return { ok: true };
}

export async function deletePersonaTrait(
  slug: string,
  tenantId: string,
  traitId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("ai_clone_persona_trait")
    .delete()
    .eq("id", traitId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/persona-traits`);
  return { ok: true };
}
