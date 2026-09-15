// /clone/[slug]/journal の Server Actions。日記の更新/削除。
//
// 設計:
//   entry_date は (tenant_id, entry_date) UNIQUE に縛られているので編集対象外。
//   日付を直したい場合は削除 → Slack で再投稿する運用にする。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface JournalEntryInput {
  content: string;
  summary?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function updateJournalEntry(
  slug: string,
  tenantId: string,
  entryId: string,
  input: JournalEntryInput,
): Promise<{ ok: boolean; error?: string }> {
  const content = input.content?.trim() ?? "";
  if (content.length === 0) {
    return { ok: false, error: "本文は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_journal")
    .update({
      content,
      summary: norm(input.summary),
    })
    .eq("id", entryId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/journal`);
  return { ok: true };
}

export async function deleteJournalEntry(
  slug: string,
  tenantId: string,
  entryId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_journal")
    .delete()
    .eq("id", entryId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/journal`);
  return { ok: true };
}
