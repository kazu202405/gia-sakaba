// AI Clone のテナント解決とアクセス制御。Server Component / Server Action から呼ぶ。
// slug → テナント引き当て → ログインユーザーが member であるかをチェック。
//
// 設計判断:
//   * テナントが存在しない / member でない場合は notFound() を返す
//     （存在自体を漏らさないため 403 ではなく 404）
//   * 未ログインは /login にリダイレクト（一般ユーザー導線。/admin/login は主催者専用）
//   * role は 'owner' | 'admin' | 'member' | 'viewer' を返す。UI 側で権限制御

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export type CloneTenantRole = "owner" | "admin" | "member" | "viewer";

export interface CloneTenant {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  status: string;
}

export interface CloneTenantContext {
  tenant: CloneTenant;
  role: CloneTenantRole;
  userId: string;
}

export async function loadTenantOr404(slug: string): Promise<CloneTenantContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("ai_clone_tenants")
    .select("id, name, slug, plan, status")
    .eq("slug", slug)
    .maybeSingle();

  if (tenantErr || !tenant) {
    notFound();
  }

  const { data: member, error: memberErr } = await supabase
    .from("ai_clone_tenant_members")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberErr || !member) {
    notFound();
  }

  return {
    tenant,
    role: member.role as CloneTenantRole,
    userId: user.id,
  };
}
