// /clone/[slug]/people の Server Actions。
// テナント member 判定は ai_clone_person への RLS（ai_clone_is_tenant_member(tenant_id)）が
// 自動で実行する。サーバ側ではフィールドの whitelist 化と name の必須チェックだけ持つ。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 追加フォームから受け取るフィールド。型と必須/任意の明示。
// ai_clone_person の DB スキーマと 1:1（trust_level / interests / referred_to / birth_hour は今回 UI に出さないので除外）。
// birth_hour は /admin/divination からの保存でのみ書き込まれ、編集 UI には出さない方針（ユーザー要望）。
export interface PersonInput {
  name: string;
  name_kana?: string | null;  // migration 0049: よみがな
  company_name?: string | null;
  url?: string | null;  // migration 0054: 本人のURL（サイト/SNS/note 等）
  position?: string | null;
  // 2026-05-31 migration 0045: 業種（紹介マッチングの軸）。position（役職・仕事）とは別。
  industry?: string | null;
  // 2026-05-17 migration 0028: relationship → met_context にリネーム。
  met_context?: string | null;   // 出会った場所・コミュニティ
  importance?: string | null;    // S / A / B / C
  temperature?: string | null;   // 熱い / 様子見 / 冷えてる
  referred_by?: string | null;
  // 紹介元の FK。テナント内の別人物を指す。
  // referred_by（text）は外部人物用の fallback として併用可。
  referred_by_person_id?: string | null;
  // 関心ごとタグ。chip 入力で編集可能。null は変更なし、空配列は全削除。
  interests?: string[] | null;
  // 所属する「会」（BNI / 守成クラブ 等のコミュニティ）。chip 入力で編集可能。
  // 多対多（ai_clone_person_communities）。undefined は変更なし、空配列は全解除。
  communities?: string[] | null;
  // 2026-05-17 migration 0028: challenges を caveats に統合し「備考」化。
  caveats?: string | null;
  next_action?: string | null;
  // 2026-05-17 追加。鑑定ツール経由でも編集ダイアログ経由でも入れられる。
  birthday?: string | null;   // ISO date "YYYY-MM-DD"
  gender?: string | null;     // "男性" / "女性" / "未指定"
  birthplace?: string | null;
}

// 紹介元 picker 用：テナント内人物の名前検索。
export interface PersonPickerHit {
  id: string;
  name: string;
  companyName: string | null;
}

export async function searchPeopleInTenant(
  tenantId: string,
  query: string,
  excludeId?: string,
): Promise<{ ok: true; hits: PersonPickerHit[] } | { ok: false; error: string }> {
  const q = query.trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  let builder = supabase
    .from("ai_clone_person")
    .select("id, name, company_name")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .limit(20);

  if (q.length > 0) builder = builder.ilike("name", `%${q}%`);
  if (excludeId) builder = builder.neq("id", excludeId);

  const { data, error } = await builder;
  if (error) return { ok: false, error: `検索に失敗しました：${error.message}` };

  return {
    ok: true,
    hits: (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      companyName: r.company_name,
    })),
  };
}

export async function createPerson(
  slug: string,
  tenantId: string,
  input: PersonInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "名前は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  // 空文字 → null 正規化。trim も同時に行う。
  const norm = (v: string | null | undefined) => {
    if (!v) return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  };
  // 関心ごと配列の正規化（trim, 空白除外, 重複除去）。null/undefined はそのまま null。
  const normTags = (arr: string[] | null | undefined): string[] | null => {
    if (!arr) return null;
    const cleaned = Array.from(
      new Set(arr.map((t) => t.trim()).filter((t) => t.length > 0)),
    );
    return cleaned;
  };

  const { error } = await supabase.from("ai_clone_person").insert({
    tenant_id: tenantId,
    name,
    name_kana: norm(input.name_kana),
    company_name: norm(input.company_name),
    url: norm(input.url),
    position: norm(input.position),
    industry: norm(input.industry),
    met_context: norm(input.met_context),
    importance: norm(input.importance),
    temperature: norm(input.temperature),
    referred_by: norm(input.referred_by),
    referred_by_person_id: norm(input.referred_by_person_id),
    interests: normTags(input.interests),
    caveats: norm(input.caveats),
    next_action: norm(input.next_action),
    birthday: norm(input.birthday),
    gender: norm(input.gender),
    birthplace: norm(input.birthplace),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people`);
  return { ok: true };
}

// 人物 ⇄ 会（コミュニティ）の所属を、渡された名前リストに同期する。
// RLS クライアントで実行（ai_clone_community / _person_communities の RLS が
// テナントメンバー判定を行う）。会名はチャット側と同じ正規化（スペース除去＋小文字化）で
// 既存とマッチし、無ければ作成する。表記ゆれ「BNI / ＢＮＩ / bni」を 1 つに寄せる。
async function syncPersonCommunities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  personId: string,
  names: string[],
): Promise<void> {
  const normName = (s: string) => s.replace(/[\s　]/g, "").toLowerCase();
  // 正規化キーで重複除去（表示名は最初に出てきたものを採用）。
  const desiredByNorm = new Map<string, string>();
  for (const raw of names) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const norm = normName(trimmed);
    if (!norm) continue;
    if (!desiredByNorm.has(norm)) desiredByNorm.set(norm, trimmed);
  }

  // desired の会 ID を解決（無ければ作成）。
  const desiredIds = new Set<string>();
  for (const [norm, display] of desiredByNorm) {
    const { data: existing } = await supabase
      .from("ai_clone_community")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name_normalized", norm)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let communityId = existing?.id as string | undefined;
    if (!communityId) {
      const { data: created } = await supabase
        .from("ai_clone_community")
        .insert({ tenant_id: tenantId, name: display, name_normalized: norm })
        .select("id")
        .single();
      communityId = created?.id as string | undefined;
    }
    if (communityId) desiredIds.add(communityId);
  }

  // 現在の紐付け。
  const { data: current } = await supabase
    .from("ai_clone_person_communities")
    .select("community_id")
    .eq("person_id", personId);
  const currentIds = new Set(
    (current ?? []).map((r) => (r as { community_id: string }).community_id),
  );

  // 追加分（desired にあって現状に無い）。
  const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
  if (toAdd.length > 0) {
    await supabase.from("ai_clone_person_communities").upsert(
      toAdd.map((community_id) => ({ person_id: personId, community_id })),
      { onConflict: "person_id,community_id", ignoreDuplicates: true },
    );
  }
  // 解除分（現状にあって desired に無い）。
  const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));
  if (toRemove.length > 0) {
    await supabase
      .from("ai_clone_person_communities")
      .delete()
      .eq("person_id", personId)
      .in("community_id", toRemove);
  }
}

// 既存人物の更新。RLS で tenant member 判定 + 行所有テナント判定が走る。
export async function updatePerson(
  slug: string,
  tenantId: string,
  personId: string,
  input: PersonInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "名前は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const norm = (v: string | null | undefined) => {
    if (!v) return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  };
  const normTags = (arr: string[] | null | undefined): string[] | null => {
    if (!arr) return null;
    const cleaned = Array.from(
      new Set(arr.map((t) => t.trim()).filter((t) => t.length > 0)),
    );
    return cleaned;
  };

  const { error } = await supabase
    .from("ai_clone_person")
    .update({
      name,
      name_kana: norm(input.name_kana),
      company_name: norm(input.company_name),
      position: norm(input.position),
      industry: norm(input.industry),
      met_context: norm(input.met_context),
      importance: norm(input.importance),
      temperature: norm(input.temperature),
      referred_by: norm(input.referred_by),
      referred_by_person_id: norm(input.referred_by_person_id),
      interests: normTags(input.interests),
      caveats: norm(input.caveats),
      next_action: norm(input.next_action),
      birthday: norm(input.birthday),
      gender: norm(input.gender),
      birthplace: norm(input.birthplace),
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  // 所属（会）の同期。undefined は「変更なし」、空配列は「全解除」。
  if (input.communities !== undefined && input.communities !== null) {
    try {
      await syncPersonCommunities(supabase, tenantId, personId, input.communities);
    } catch (e) {
      // 会の同期失敗は人物更新自体を巻き戻さない（本体は保存済み）。ログだけ残す。
      console.error("[people] 会の同期に失敗:", e);
    }
  }

  revalidatePath(`/clone/${slug}/people`);
  revalidatePath(`/clone/${slug}/people/${personId}`);
  return { ok: true };
}

// ── Quick Edit（inline 編集） ──────────────────────────────
// 詳細ページ上部の Quick Edit パネル専用。許可フィールドだけを部分更新する。
// 全フィールド更新（updatePerson）と分けることで、誤クリックで他カラムを
// うっかり空にする事故を防ぐ。
const QUICK_EDITABLE_FIELDS = [
  "importance",
  "temperature",
  "next_action",
  "caveats",
] as const;
export type QuickEditableField = (typeof QUICK_EDITABLE_FIELDS)[number];

function isQuickEditableField(v: string): v is QuickEditableField {
  return (QUICK_EDITABLE_FIELDS as readonly string[]).includes(v);
}

export async function updatePersonField(
  slug: string,
  tenantId: string,
  personId: string,
  field: string,
  rawValue: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isQuickEditableField(field)) {
    return { ok: false, error: `フィールド「${field}」は inline 編集できません` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const trimmed = rawValue.trim();
  const value: string | null = trimmed.length === 0 ? null : trimmed;

  const { error } = await supabase
    .from("ai_clone_person")
    .update({
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `保存に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people`);
  revalidatePath(`/clone/${slug}/people/${personId}`);
  return { ok: true };
}

// 削除（CASCADE で person_note / 各種リンクテーブルも削除される）。
export async function deletePerson(
  slug: string,
  tenantId: string,
  personId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_person")
    .delete()
    .eq("id", personId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people`);
  return { ok: true };
}
