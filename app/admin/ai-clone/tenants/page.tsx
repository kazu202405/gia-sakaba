// /admin/ai-clone/tenants ─ AI Clone テナント管理。
// GIA 運営側の admin がクライアント企業向けのテナントを新規作成する。
// テナントが作成されると、owner として登録された人物が /clone/<slug>/settings から
// Slack 連携などを自分で設定できるようになる。
//
// 認証:
//   未ログインは middleware が /admin/login へリダイレクト。
//   admin 権限チェックは Server Action 側で再度実施（is_admin RPC）。

import {
  EditorialHeader,
} from "@/app/admin/_components/EditorialChrome";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { TenantCreateForm } from "./_components/TenantCreateForm";

export const dynamic = "force-dynamic";

export default async function TenantsAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    return (
      <div className="px-5 sm:px-6 py-12 max-w-3xl">
        <p className="text-sm text-gray-500">
          このページは管理者専用です。
        </p>
      </div>
    );
  }

  // テナント一覧（is_admin RLS は ai_clone_tenants には未適用なので
  // 自分が member のテナントしか見えない。admin 一覧用に service_role で取り直す）
  const { data: tenants } = await supabase
    .from("ai_clone_tenants")
    .select(
      "id, name, slug, plan, status, owner_user_id, created_at, ai_clone_tenant_members(user_id, role, slack_user_id)",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6 max-w-4xl">
      <EditorialHeader
        eyebrow="AI CLONE / ADMIN"
        title="テナント管理"
        description="クライアント企業向けの AI Clone テナントを作成・管理します。"
      />

      {/* 新規作成フォーム */}
      <TenantCreateForm />

      {/* 既存テナント一覧 */}
      <section className="bg-white border border-gray-200 rounded-md">
        <header className="px-5 sm:px-6 py-4 border-b border-gray-100">
          <h3 className="font-serif text-base font-semibold text-[#1c3550] tracking-[0.06em]">
            既存テナント
          </h3>
          <p className="text-[12px] text-gray-500 mt-1">
            あなたが member として参加しているテナント一覧。
          </p>
        </header>
        {tenants && tenants.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {tenants.map((t: any) => {
              const memberCount = Array.isArray(t.ai_clone_tenant_members)
                ? t.ai_clone_tenant_members.length
                : 0;
              const linkedSlackCount = Array.isArray(t.ai_clone_tenant_members)
                ? t.ai_clone_tenant_members.filter(
                    (m: any) => m.slack_user_id,
                  ).length
                : 0;
              return (
                <li
                  key={t.id}
                  className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1c3550]">
                        {t.name}
                      </span>
                      <code className="text-[11px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                        /clone/{t.slug}
                      </code>
                      {t.plan && (
                        <span className="text-[10px] tracking-[0.18em] text-gray-500 uppercase">
                          {t.plan}
                        </span>
                      )}
                      {t.status !== "active" && (
                        <span className="text-[10px] tracking-[0.18em] text-[#8a4538] bg-[#f3e9e6] px-1.5 py-0.5 rounded">
                          {t.status}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      メンバー {memberCount} 人 / Slack 連携 {linkedSlackCount} 人
                    </div>
                  </div>
                  <Link
                    href={`/clone/${t.slug}/settings`}
                    className="inline-flex items-center gap-1 text-[11px] text-[#1c3550] hover:text-[#0f2238] font-medium tracking-[0.06em]"
                  >
                    設定を開く
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 sm:px-6 py-8 text-sm text-gray-500 text-center">
            まだテナントがありません。上のフォームから作成してください。
          </p>
        )}
      </section>
    </div>
  );
}
