// 人物の画像（ai_clone_person_photo）と アバター（ai_clone_person.avatar_url）の Server Actions。
// アップロードのファイル転送はクライアント側で Storage に直接行い（RLS で tenant member 判定）、
// ここでは「DBへの記録」「アイコン設定」「削除」を担う。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "ai-clone-people";

// アップロード済みファイルを人物の画像として記録。初めての1枚は自動でアイコンにする。
export async function addPersonPhoto(
  slug: string,
  tenantId: string,
  personId: string,
  storagePath: string,
  publicUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase.from("ai_clone_person_photo").insert({
    tenant_id: tenantId,
    person_id: personId,
    storage_path: storagePath,
    public_url: publicUrl,
  });
  if (error) return { ok: false, error: `保存に失敗しました：${error.message}` };

  // まだアバターが無ければ、この1枚目をアイコンに設定
  const { data: person } = await supabase
    .from("ai_clone_person")
    .select("avatar_url")
    .eq("id", personId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (person && !person.avatar_url) {
    await supabase
      .from("ai_clone_person")
      .update({ avatar_url: publicUrl })
      .eq("id", personId)
      .eq("tenant_id", tenantId);
  }

  revalidatePath(`/clone/${slug}/people/${personId}`);
  revalidatePath(`/clone/${slug}/people`);
  return { ok: true };
}

export async function setPersonAvatar(
  slug: string,
  tenantId: string,
  personId: string,
  publicUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { error } = await supabase
    .from("ai_clone_person")
    .update({ avatar_url: publicUrl })
    .eq("id", personId)
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, error: `設定に失敗しました：${error.message}` };

  revalidatePath(`/clone/${slug}/people/${personId}`);
  revalidatePath(`/clone/${slug}/people`);
  return { ok: true };
}

export async function deletePersonPhoto(
  slug: string,
  tenantId: string,
  personId: string,
  photoId: string,
  storagePath: string,
  publicUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  // Storage オブジェクト削除（失敗しても DB 行は消す）
  await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => null);

  const { error } = await supabase
    .from("ai_clone_person_photo")
    .delete()
    .eq("id", photoId)
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, error: `削除に失敗しました：${error.message}` };

  // 消した画像がアイコンだったら、残りの最新を新アイコンに（無ければ null）
  const { data: person } = await supabase
    .from("ai_clone_person")
    .select("avatar_url")
    .eq("id", personId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (person && person.avatar_url === publicUrl) {
    const { data: rest } = await supabase
      .from("ai_clone_person_photo")
      .select("public_url")
      .eq("tenant_id", tenantId)
      .eq("person_id", personId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    await supabase
      .from("ai_clone_person")
      .update({ avatar_url: rest?.public_url ?? null })
      .eq("id", personId)
      .eq("tenant_id", tenantId);
  }

  revalidatePath(`/clone/${slug}/people/${personId}`);
  revalidatePath(`/clone/${slug}/people`);
  return { ok: true };
}
