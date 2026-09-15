// /clone/[slug]/core-os/faq の Server Actions。08_FAQ・返答案。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface FaqInput {
  question: string;
  base_answer?: string | null;
  supplement?: string | null;
  caveat?: string | null;
  requires_final_check?: boolean;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function createFaq(
  slug: string,
  tenantId: string,
  input: FaqInput,
): Promise<{ ok: boolean; error?: string }> {
  const question = input.question?.trim() ?? "";
  if (question.length === 0) {
    return { ok: false, error: "質問は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_faq").insert({
    tenant_id: tenantId,
    question,
    base_answer: norm(input.base_answer),
    supplement: norm(input.supplement),
    caveat: norm(input.caveat),
    requires_final_check: input.requires_final_check ?? false,
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/faq`);
  return { ok: true };
}

export async function updateFaq(
  slug: string,
  tenantId: string,
  faqId: string,
  input: FaqInput,
): Promise<{ ok: boolean; error?: string }> {
  const question = input.question?.trim() ?? "";
  if (question.length === 0) {
    return { ok: false, error: "質問は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_faq")
    .update({
      question,
      base_answer: norm(input.base_answer),
      supplement: norm(input.supplement),
      caveat: norm(input.caveat),
      requires_final_check: input.requires_final_check ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", faqId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/faq`);
  return { ok: true };
}

export async function deleteFaq(
  slug: string,
  tenantId: string,
  faqId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_faq")
    .delete()
    .eq("id", faqId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/faq`);
  return { ok: true };
}
