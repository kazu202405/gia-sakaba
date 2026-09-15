// /clone/[slug]/review/knowledge の Server Actions。20_ナレッジ候補。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface KnowledgeCandidateInput {
  content: string;
  kind?: string | null;
  target_db?: string | null;
  priority?: string | null;
  origin_log?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function createKnowledgeCandidate(
  slug: string,
  tenantId: string,
  input: KnowledgeCandidateInput,
): Promise<{ ok: boolean; error?: string }> {
  const content = input.content?.trim() ?? "";
  if (content.length === 0) {
    return { ok: false, error: "内容は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_knowledge_candidate").insert({
    tenant_id: tenantId,
    content,
    kind: norm(input.kind),
    target_db: norm(input.target_db),
    priority: norm(input.priority),
    origin_log: norm(input.origin_log),
    review_status: "未確認",
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/knowledge`);
  return { ok: true };
}

// 確認状態の更新（一覧から直接 未確認 ⇄ 確認中 ⇄ 反映済 ⇄ 却下 を切替）
export async function updateKnowledgeStatus(
  slug: string,
  tenantId: string,
  candidateId: string,
  reviewStatus: string,
): Promise<{ ok: boolean; error?: string }> {
  const valid = ["未確認", "確認中", "反映済", "却下"];
  if (!valid.includes(reviewStatus)) {
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
    .from("ai_clone_knowledge_candidate")
    .update({
      review_status: reviewStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/knowledge`);
  return { ok: true };
}

// 全フィールド更新（編集ダイアログ用）
export async function updateKnowledgeCandidate(
  slug: string,
  tenantId: string,
  candidateId: string,
  input: KnowledgeCandidateInput,
): Promise<{ ok: boolean; error?: string }> {
  const content = input.content?.trim() ?? "";
  if (content.length === 0) {
    return { ok: false, error: "内容は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_knowledge_candidate")
    .update({
      content,
      kind: norm(input.kind),
      target_db: norm(input.target_db),
      priority: norm(input.priority),
      origin_log: norm(input.origin_log),
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/knowledge`);
  return { ok: true };
}

export async function deleteKnowledgeCandidate(
  slug: string,
  tenantId: string,
  candidateId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_knowledge_candidate")
    .delete()
    .eq("id", candidateId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/review/knowledge`);
  return { ok: true };
}
