// /admin/ai-clone/tenants の Server Actions。
// GIA 運営側の admin が AI Clone のクライアントテナントを新規作成する。
//
// 動作:
//   1. ログインユーザーが is_admin であることを RPC で確認
//   2. owner として登録する人物（email）を auth.users から解決
//   3. service_role で ai_clone_tenants 作成 + ai_clone_tenant_members に owner 登録
//      （RLS は ai_clone_is_tenant_member を要求するため、新規作成時は service_role でしか書けない）
//
// 安全策:
//   - admin チェックは Server Action 内で必ず実施（クライアントを信用しない）
//   - slug 重複 / 形式チェック / 予約語チェック

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SLUG_RE = /^[a-z0-9-]{3,20}$/;
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "clone",
  "founder",
  "login",
  "logout",
  "members",
  "members-admin",
  "mypage",
  "post",
  "profile",
  "services",
  "settings",
  "tasks",
  "tree",
  "worksheet",
  "_next",
  "public",
  "static",
  "new",
  "edit",
  "delete",
  "create",
  "update",
]);

type Result =
  | { ok: true; tenantId: string; slug: string }
  | { ok: false; error: string };

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
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

export async function createTenantWithOwner(input: {
  name: string;
  slug: string;
  ownerEmail: string;
  plan: string;
}): Promise<Result> {
  // 1. admin 権限チェック
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { ok: false, error: adminCheck.error };

  // 2. 入力バリデーション
  const name = (input.name ?? "").trim();
  const slug = (input.slug ?? "").trim().toLowerCase();
  const ownerEmail = (input.ownerEmail ?? "").trim().toLowerCase();
  const plan = (input.plan ?? "").trim();

  if (name.length === 0 || name.length > 50) {
    return { ok: false, error: "表示名は1〜50文字で入力してください" };
  }
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      error: "slug は英小文字 / 数字 / ハイフンの3〜20文字で指定してください",
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: "この slug は予約語のため使用できません" };
  }
  if (!ownerEmail.includes("@")) {
    return { ok: false, error: "オーナーのメールアドレスが不正です" };
  }
  const validPlans = ["assistant", "partner", "team", "custom"];
  if (!validPlans.includes(plan)) {
    return {
      ok: false,
      error: "プランは assistant / partner / team / custom のいずれかを指定してください",
    };
  }

  const sb = getServiceClient();
  if (!sb) {
    return {
      ok: false,
      error: "サーバ設定エラー: SUPABASE_SERVICE_ROLE_KEY が未設定です",
    };
  }

  // 3. slug 重複チェック
  const { data: existingSlug } = await sb
    .from("ai_clone_tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingSlug) {
    return { ok: false, error: "この slug は既に使われています" };
  }

  // 4. owner の auth.users.id を email から解決
  //    Supabase の auth.users は通常テーブルとして直接 select できないため、
  //    admin API（listUsers）経由で email 一致を探す
  const { data: usersData, error: listErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) {
    return {
      ok: false,
      error: `ユーザー一覧の取得に失敗しました：${listErr.message}`,
    };
  }
  const owner = usersData.users.find(
    (u) => (u.email || "").toLowerCase() === ownerEmail,
  );
  if (!owner) {
    return {
      ok: false,
      error: `email「${ownerEmail}」のユーザーが見つかりません。先に Supabase Auth で登録してください`,
    };
  }

  // 5. テナント作成（service_role で RLS バイパス）
  const { data: createdTenant, error: tenantErr } = await sb
    .from("ai_clone_tenants")
    .insert({
      name,
      slug,
      owner_user_id: owner.id,
      plan,
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

  // 6. owner を tenant_members に登録
  const { error: memberErr } = await sb.from("ai_clone_tenant_members").insert({
    tenant_id: createdTenant.id,
    user_id: owner.id,
    role: "owner",
  });

  if (memberErr) {
    // メンバー登録に失敗したらテナントもロールバック（手動で削除）
    await sb.from("ai_clone_tenants").delete().eq("id", createdTenant.id);
    return {
      ok: false,
      error: `オーナー登録に失敗しました：${memberErr.message}`,
    };
  }

  revalidatePath("/admin/ai-clone/tenants");
  return { ok: true, tenantId: createdTenant.id, slug: createdTenant.slug };
}
