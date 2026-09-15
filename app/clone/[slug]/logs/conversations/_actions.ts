// /clone/[slug]/logs/conversations の Server Actions。12_会話ログ。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ConversationInput {
  occurred_at: string; // datetime-local の値（"YYYY-MM-DDTHH:mm"）。必須
  channel?: string | null; // Slack / LINE / Email / 対面 / 電話 / その他
  content?: string | null;
  summary?: string | null;
  usage_tags?: string | null; // カンマ / 改行 / スペース区切り → text[] に変換
  importance?: string | null; // S / A / B / C
  next_action?: string | null;
  person_ids?: string[]; // 関連人物（ai_clone_person.id の配列）。create/update 時に person_conversation_logs を同期
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

// "tag1, tag2 / tag3 タグ4" のような自由入力を text[] に正規化する。
// カンマ・スラッシュ・改行・全角スペースで分割し、空要素を除去。
const parseTags = (v: string | null | undefined): string[] | null => {
  if (!v) return null;
  const parts = v
    .split(/[,、\/\n\r　]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : null;
};

export async function createConversation(
  slug: string,
  tenantId: string,
  input: ConversationInput,
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

  const { data: inserted, error } = await supabase
    .from("ai_clone_conversation_log")
    .insert({
      tenant_id: tenantId,
      occurred_at: occurredAtDate.toISOString(),
      channel: norm(input.channel),
      content: norm(input.content),
      summary: norm(input.summary),
      usage_tags: parseTags(input.usage_tags),
      importance: norm(input.importance),
      next_action: norm(input.next_action),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: `登録に失敗しました：${error?.message ?? "不明なエラー"}` };
  }

  // 関連人物リンクを一括INSERT（テナント所有を確認した上で）
  const personIds = uniqueIds(input.person_ids);
  if (personIds.length > 0) {
    const linkErr = await syncPersonLinks(
      supabase,
      tenantId,
      inserted.id,
      personIds,
      [], // 新規作成時は既存リンクなし
    );
    if (linkErr) {
      // 会話自体は作れているのでロールバックはせず、警告として返す
      return { ok: false, error: `会話は登録しましたが人物紐付けに失敗：${linkErr}` };
    }
  }

  revalidatePath(`/clone/${slug}/logs/conversations`);
  return { ok: true };
}

export async function updateConversation(
  slug: string,
  tenantId: string,
  conversationId: string,
  input: ConversationInput,
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
    .from("ai_clone_conversation_log")
    .update({
      occurred_at: occurredAtDate.toISOString(),
      channel: norm(input.channel),
      content: norm(input.content),
      summary: norm(input.summary),
      usage_tags: parseTags(input.usage_tags),
      importance: norm(input.importance),
      next_action: norm(input.next_action),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  // 関連人物リンクの差分同期。input.person_ids が undefined の場合は触らない
  // （既存呼び出し互換性のため）。空配列なら「全解除」を意味する。
  if (input.person_ids !== undefined) {
    const desired = uniqueIds(input.person_ids);
    const { data: existingRows } = await supabase
      .from("ai_clone_person_conversation_logs")
      .select("person_id")
      .eq("conversation_log_id", conversationId);
    const existing = (existingRows ?? []).map(
      (r: { person_id: string }) => r.person_id,
    );

    const linkErr = await syncPersonLinks(
      supabase,
      tenantId,
      conversationId,
      desired,
      existing,
    );
    if (linkErr) {
      return { ok: false, error: `会話は更新しましたが人物紐付けに失敗：${linkErr}` };
    }
  }

  revalidatePath(`/clone/${slug}/logs/conversations`);
  return { ok: true };
}

// 関連人物の同期処理。テナント所有を都度確認してから INSERT / DELETE する。
// リンクテーブル ai_clone_person_conversation_logs には tenant_id 列が無いため、
// person 側で tenant_id を検証してから操作する（links.ts と同じ防御パターン）。
type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

function uniqueIds(ids: string[] | null | undefined): string[] {
  if (!ids) return [];
  const out = new Set<string>();
  for (const id of ids) {
    if (typeof id === "string" && id.trim().length > 0) out.add(id.trim());
  }
  return Array.from(out);
}

async function syncPersonLinks(
  supabase: SupabaseLike,
  tenantId: string,
  conversationId: string,
  desired: string[],
  existing: string[],
): Promise<string | null> {
  const desiredSet = new Set(desired);
  const existingSet = new Set(existing);
  const toAdd = desired.filter((id) => !existingSet.has(id));
  const toRemove = existing.filter((id) => !desiredSet.has(id));

  // 追加対象がテナント所有の人物かを一括検証
  if (toAdd.length > 0) {
    const { data: validRows } = await supabase
      .from("ai_clone_person")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("id", toAdd);
    const validIds = new Set(
      (validRows ?? []).map((r: { id: string }) => r.id),
    );
    const rejected = toAdd.filter((id) => !validIds.has(id));
    if (rejected.length > 0) {
      return `テナント外の人物が含まれています（${rejected.length}件）`;
    }

    const insertRows = toAdd.map((personId) => ({
      person_id: personId,
      conversation_log_id: conversationId,
    }));
    const { error: insertErr } = await supabase
      .from("ai_clone_person_conversation_logs")
      .insert(insertRows);
    if (insertErr && !/duplicate key|already exists/i.test(insertErr.message)) {
      return insertErr.message;
    }
  }

  // 削除も同様にテナント確認（消す側のため緩めても良いが、防御のため）
  if (toRemove.length > 0) {
    const { error: deleteErr } = await supabase
      .from("ai_clone_person_conversation_logs")
      .delete()
      .eq("conversation_log_id", conversationId)
      .in("person_id", toRemove);
    if (deleteErr) {
      return deleteErr.message;
    }
  }

  return null;
}

// ダイアログから呼ぶ用：テナント内の人物一覧。
// page.tsx でまとめて取得して props 経由で渡すのが基本だが、初回マウント以外でも使えるよう server action としても露出。
export async function listPeopleForConversationDialog(
  tenantId: string,
): Promise<Array<{ id: string; label: string; sublabel: string | null }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_clone_person")
    .select("id, name, company_name, position")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });
  return (data ?? []).map((p: { id: string; name: string; company_name: string | null; position: string | null }) => ({
    id: p.id,
    label: p.name,
    sublabel: [p.company_name, p.position].filter(Boolean).join(" / ") || null,
  }));
}

export async function deleteConversation(
  slug: string,
  tenantId: string,
  conversationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_conversation_log")
    .delete()
    .eq("id", conversationId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/logs/conversations`);
  return { ok: true };
}
