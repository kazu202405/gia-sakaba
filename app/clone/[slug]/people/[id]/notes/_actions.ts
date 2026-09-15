// /clone/[slug]/people/[id]/notes の Server Actions。13_人物メモ。
// person_id FK は URL から渡る。person の所属テナント整合性は RLS が担保。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface PersonNoteInput {
  occurred_at: string; // datetime-local 値
  content?: string | null;
  challenges?: string | null;
  temperature?: string | null;
  caveats?: string | null;
  next_touch_date?: string | null; // YYYY-MM-DD
  interests?: string | null; // 自由入力 → text[] へ
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

export async function createPersonNote(
  slug: string,
  tenantId: string,
  personId: string,
  input: PersonNoteInput,
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

  const { error } = await supabase.from("ai_clone_person_note").insert({
    tenant_id: tenantId,
    person_id: personId,
    occurred_at: occurredAtDate.toISOString(),
    content: norm(input.content),
    challenges: norm(input.challenges),
    temperature: norm(input.temperature),
    caveats: norm(input.caveats),
    next_touch_date: norm(input.next_touch_date),
    interests: parseTags(input.interests),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people/${personId}/notes`);
  revalidatePath(`/clone/${slug}/people/${personId}`);
  return { ok: true };
}

export async function updatePersonNote(
  slug: string,
  tenantId: string,
  personId: string,
  noteId: string,
  input: PersonNoteInput,
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
    .from("ai_clone_person_note")
    .update({
      occurred_at: occurredAtDate.toISOString(),
      content: norm(input.content),
      challenges: norm(input.challenges),
      temperature: norm(input.temperature),
      caveats: norm(input.caveats),
      next_touch_date: norm(input.next_touch_date),
      interests: parseTags(input.interests),
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("tenant_id", tenantId)
    .eq("person_id", personId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people/${personId}/notes`);
  revalidatePath(`/clone/${slug}/people/${personId}`);
  return { ok: true };
}

export async function deletePersonNote(
  slug: string,
  tenantId: string,
  personId: string,
  noteId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_person_note")
    .delete()
    .eq("id", noteId)
    .eq("tenant_id", tenantId)
    .eq("person_id", personId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people/${personId}/notes`);
  revalidatePath(`/clone/${slug}/people/${personId}`);
  return { ok: true };
}
