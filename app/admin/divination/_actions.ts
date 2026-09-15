// /admin/divination 用 Server Actions。
// 鑑定対象（フォーム入力）を ai_clone_person に保存する。
//
// テナント解決:
//   保存先テナントは UI から slug で指定。アクセス可能テナント一覧は
//   listAccessibleDivinationTenants() で取得する。
//   2026-05-17 初版は「goshima 固定」だったが、他テナント（miyako 等）でも
//   使いたい要望が出たため slug 引数化（同日のうちにマルチテナント対応）。
// migration 0027 で birthday/gender/birth_hour/birthplace カラム前提。
//
// 型と定数は _save-shared.ts に分離（"use server" ファイルは async 関数しか
// export できないため）。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  DivinationSavePayload,
  PersonSearchHit,
  AccessibleTenant,
} from "./_save-shared";

// ログインユーザーが member（owner/admin/member/viewer のいずれか）であるテナント一覧。
// 保存先ドロップダウンの選択肢に使う。
export async function listAccessibleDivinationTenants(): Promise<
  { ok: true; tenants: AccessibleTenant[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  // 二段引き: tenant_members で tenant_id 集めて、tenants から name/slug を引く。
  const { data: memberships, error: mErr } = await supabase
    .from("ai_clone_tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id);
  if (mErr) return { ok: false, error: `テナント取得に失敗：${mErr.message}` };

  const tenantIds = (memberships ?? []).map((m) => m.tenant_id);
  if (tenantIds.length === 0) return { ok: true, tenants: [] };

  const { data: tenants, error: tErr } = await supabase
    .from("ai_clone_tenants")
    .select("slug, name")
    .in("id", tenantIds)
    .order("name", { ascending: true });
  if (tErr) return { ok: false, error: `テナント名取得に失敗：${tErr.message}` };

  return { ok: true, tenants: (tenants ?? []) as AccessibleTenant[] };
}

// テナント解決 + member ガード。slug → id を返す。
async function resolveTenant(
  slug: string,
): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; tenantId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { data: tenant, error: tErr } = await supabase
    .from("ai_clone_tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (tErr || !tenant) {
    return { ok: false, error: `テナント「${slug}」が見つかりません` };
  }

  const { data: member, error: mErr } = await supabase
    .from("ai_clone_tenant_members")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (mErr || !member) {
    return { ok: false, error: `テナント「${slug}」へのアクセス権がありません` };
  }

  return { ok: true, supabase, tenantId: tenant.id };
}

// 名前部分一致で人物を検索（最大 20 件、指定テナント内のみ）。
// query が空文字なら 20 件まで全件返す（クリックで dropdown 開いた時に
// 候補をすぐ見せるため）。
export async function searchPeopleForDivination(
  tenantSlug: string,
  query: string,
): Promise<{ ok: true; hits: PersonSearchHit[] } | { ok: false; error: string }> {
  const q = query.trim();

  const resolved = await resolveTenant(tenantSlug);
  if (!resolved.ok) return { ok: false, error: resolved.error };

  let builder = resolved.supabase
    .from("ai_clone_person")
    .select("id, name, company_name, birthday, gender, birth_hour, birth_minute, birthplace")
    .eq("tenant_id", resolved.tenantId)
    .order("name", { ascending: true })
    .limit(20);

  if (q.length > 0) builder = builder.ilike("name", `%${q}%`);

  const { data, error } = await builder;

  if (error) return { ok: false, error: `検索に失敗しました：${error.message}` };

  return {
    ok: true,
    hits: (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      companyName: r.company_name,
      birthday: r.birthday,
      gender: r.gender,
      birthHour: r.birth_hour,
      birthMinute: r.birth_minute,
      birthplace: r.birthplace,
    })),
  };
}

// 鑑定フォームの入力を指定テナントの ai_clone_person に保存。
//   personId が null → 新規作成
//   personId が指定  → 既存レコードを更新（name も上書き）
// どちらの場合も、divination の入力に関係ない他カラム（company_name 等）には触れない。
export async function savePersonFromDivination(
  tenantSlug: string,
  personId: string | null,
  payload: DivinationSavePayload,
): Promise<
  | { ok: true; personId: string; mode: "create" | "update"; tenantSlug: string }
  | { ok: false; error: string }
> {
  const name = payload.name.trim();
  if (name.length === 0) {
    return { ok: false, error: "名前は必須です" };
  }

  const resolved = await resolveTenant(tenantSlug);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { supabase, tenantId } = resolved;

  // YYYY-MM-DD（タイムゾーンの影響を受けない素の date 文字列）
  const birthday = `${payload.year}-${String(payload.month).padStart(2, "0")}-${String(payload.day).padStart(2, "0")}`;
  const gender = payload.gender || "未指定";
  const birthplace = payload.birthplace.trim() || null;
  const birthHour = payload.hour;
  const birthMinute = payload.minute;

  if (personId) {
    const { error } = await supabase
      .from("ai_clone_person")
      .update({
        name,
        birthday,
        gender,
        birth_hour: birthHour,
        birth_minute: birthMinute,
        birthplace,
        updated_at: new Date().toISOString(),
      })
      .eq("id", personId)
      .eq("tenant_id", tenantId);
    if (error) return { ok: false, error: `更新に失敗しました：${error.message}` };
    revalidatePath(`/clone/${tenantSlug}/people`);
    revalidatePath(`/clone/${tenantSlug}/people/${personId}`);
    return { ok: true, personId, mode: "update", tenantSlug };
  }

  const { data, error } = await supabase
    .from("ai_clone_person")
    .insert({
      tenant_id: tenantId,
      name,
      birthday,
      gender,
      birth_hour: birthHour,
      birth_minute: birthMinute,
      birthplace,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: `登録に失敗しました：${error?.message ?? "unknown"}` };
  }
  revalidatePath(`/clone/${tenantSlug}/people`);
  return { ok: true, personId: data.id, mode: "create", tenantSlug };
}
