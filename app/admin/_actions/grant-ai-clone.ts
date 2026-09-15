// 会員詳細（全会員タブ）から、その会員に右腕AI（AI Clone テナント）を手動で払い出す Server Action。
//
// 背景:
//   テラこや会員には右腕AIをデフォルト非表示にしつつ、運営が「使わせたい人」にだけ
//   手動で付与できるようにする運用。従来は /admin/ai-clone/tenants で表示名・slug・email を
//   手入力する必要があったが、ここでは会員行から userId 直指定でワンクリック付与する。
//
// 動作:
//   1. is_admin を RPC で確認（クライアントを信用しない）
//   2. 既に owner テナントを持っていれば再作成せず既存 slug を返す（冪等）
//   3. service_role で ai_clone_tenants 作成 + ai_clone_tenant_members に owner 登録
//      （RLS は member であることを要求するため新規作成は service_role でのみ可能）
//
// slug は webhook と同じ `t-<8hex>` 形式で自動生成（衝突時は最大5回リトライ）。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

type Result =
  | { ok: true; slug: string; alreadyExisted: boolean }
  | { ok: false; error: string };

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) {
    return { ok: false, error: "管理者権限が必要です" };
  }
  return { ok: true };
}

async function generateUniqueSlug(sb: SupabaseClient): Promise<string | null> {
  for (let i = 0; i < 5; i++) {
    const short = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const slug = `t-${short}`;
    const { data } = await sb
      .from("ai_clone_tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  return null;
}

export async function grantAiCloneToMember(input: {
  userId: string;
  name?: string | null;
}): Promise<Result> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { ok: false, error: adminCheck.error };

  const userId = (input.userId ?? "").trim();
  if (!userId) return { ok: false, error: "ユーザーIDが不正です" };

  const sb = getServiceClient();
  if (!sb) {
    return {
      ok: false,
      error: "サーバ設定エラー: SUPABASE_SERVICE_ROLE_KEY が未設定です",
    };
  }

  // 既に owner テナントを持っていれば冪等に既存 slug を返す（二重払い出し防止）
  const { data: existing } = await sb
    .from("ai_clone_tenant_members")
    .select("tenant_id, ai_clone_tenants(slug)")
    .eq("user_id", userId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  if (existing) {
    const joined = (existing as { ai_clone_tenants?: { slug?: string } | null })
      .ai_clone_tenants;
    return { ok: true, slug: joined?.slug ?? "", alreadyExisted: true };
  }

  const slug = await generateUniqueSlug(sb);
  if (!slug) return { ok: false, error: "slug の生成に失敗しました（再試行してください）" };

  const displayName = (input.name ?? "").trim().slice(0, 50) || "右腕AI";

  const { data: createdTenant, error: tenantErr } = await sb
    .from("ai_clone_tenants")
    .insert({
      name: displayName,
      slug,
      owner_user_id: userId,
      plan: "assistant",
      status: "active",
    })
    .select("id, slug")
    .single();
  if (tenantErr || !createdTenant) {
    return {
      ok: false,
      error: `テナント作成に失敗しました：${tenantErr?.message ?? "unknown"}`,
    };
  }

  const { error: memberErr } = await sb.from("ai_clone_tenant_members").insert({
    tenant_id: createdTenant.id,
    user_id: userId,
    role: "owner",
  });
  if (memberErr) {
    // owner 登録に失敗したらテナントもロールバック
    await sb.from("ai_clone_tenants").delete().eq("id", createdTenant.id);
    return {
      ok: false,
      error: `オーナー登録に失敗しました：${memberErr.message}`,
    };
  }

  // 監査ログ（fire-and-forget）
  void sb.from("activity_log").insert({
    actor_id: null,
    subject_type: "ai_clone_tenant",
    subject_id: createdTenant.id,
    action: "tenant_provisioned",
    details: {
      source: "admin_member_grant",
      owner_user_id: userId,
      slug: createdTenant.slug,
      plan: "assistant",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/ai-clone/tenants");
  return { ok: true, slug: createdTenant.slug, alreadyExisted: false };
}
