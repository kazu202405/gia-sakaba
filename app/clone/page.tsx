// /clone ─ AI Clone のテナント中継ページ。
// 用途: members サイドバー「右腕AI DB」のリンク先。slug を知らないユーザーをここに着地させ、
// 自分が member の tenant にディスパッチする。
//
// 動作:
//   * 未ログイン → /login に redirect
//   * tenant 0件 → 「契約していません」案内ページ（mypage 戻り導線つき）
//   * tenant 1件 → /clone/<slug> に redirect（一番多い経路）
//   * tenant 複数件 → picker（クライアント運用が始まってから活きる）

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Brain, ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  status: string;
}

export default async function ClonePickerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 自分がメンバーになっている tenant_id を引く
  const { data: members } = await supabase
    .from("ai_clone_tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id);

  const memberRows = (members ?? []) as { tenant_id: string; role: string }[];
  const tenantIds = memberRows.map((m) => m.tenant_id);

  // 0件 → 案内ページ
  if (tenantIds.length === 0) {
    return <EmptyState />;
  }

  // テナント情報を取得
  const { data: tenants } = await supabase
    .from("ai_clone_tenants")
    .select("id, name, slug, plan, status")
    .in("id", tenantIds)
    .order("created_at", { ascending: true });

  const rows = (tenants ?? []) as TenantRow[];

  // 1件 → 即 redirect
  if (rows.length === 1) {
    redirect(`/clone/${rows[0].slug}`);
  }

  // 複数件 → picker
  const roleByTenant = new Map(memberRows.map((m) => [m.tenant_id, m.role]));
  return <Picker tenants={rows} roleByTenant={roleByTenant} />;
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl px-7 py-9">
        <div className="flex items-center gap-3 mb-5">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#fbf3e3]"
          >
            <Sparkles className="w-4 h-4 text-[#c08a3e]" />
          </span>
          <span className="text-[10px] tracking-[0.3em] text-[#c08a3e] font-bold">
            EXECUTIVE AI CLONE
          </span>
        </div>
        <h1 className="font-serif text-xl font-bold text-[#1c3550] tracking-[0.04em] leading-snug mb-3">
          右腕AI を利用するには契約が必要です
        </h1>
        <p className="text-[13px] text-gray-600 leading-relaxed mb-6">
          経営者の判断・人脈・案件を 24時間サポートする AI Clone は、
          法人向けプランからの提供です。資料・体験は LP からご確認ください。
        </p>
        <div className="space-y-2">
          {/* 2026-08-10: 右腕AIの提供を停止し /services/ai を閉じたため、
              会員のご案内へ向け替えた（そのままだと404に飛ぶ）。 */}
          <Link
            href="/upgrade"
            className="inline-flex w-full items-center justify-between gap-2 px-4 py-3 rounded-lg bg-[#1c3550] text-white text-sm font-bold tracking-[0.06em] hover:bg-[#0f2238] transition-colors"
          >
            <span>会員のご案内を見る</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/members/app/mypage"
            className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            マイページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

function Picker({
  tenants,
  roleByTenant,
}: {
  tenants: TenantRow[];
  roleByTenant: Map<string, string>;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#fbf3e3]"
          >
            <Brain className="w-4 h-4 text-[#c08a3e]" />
          </span>
          <div>
            <p className="text-[10px] tracking-[0.3em] text-[#c08a3e] font-bold">
              EXECUTIVE AI CLONE
            </p>
            <h1 className="font-serif text-lg font-bold text-[#1c3550] tracking-[0.04em] leading-snug">
              開く DB を選んでください
            </h1>
          </div>
        </div>

        <ul className="space-y-2">
          {tenants.map((t) => {
            const role = roleByTenant.get(t.id) ?? "member";
            return (
              <li key={t.id}>
                <Link
                  href={`/clone/${t.slug}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 bg-white border border-gray-200 rounded-lg hover:border-[#1c3550] hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="font-serif text-base font-semibold text-[#1c3550] tracking-[0.04em]">
                      {t.name}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      <span className="tracking-[0.18em] uppercase">
                        {t.slug}
                      </span>
                      {t.plan && (
                        <>
                          <span className="mx-2 text-gray-300">·</span>
                          <span>{t.plan}</span>
                        </>
                      )}
                      <span className="mx-2 text-gray-300">·</span>
                      <span className="tracking-[0.18em]">
                        {role.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1c3550] flex-shrink-0 transition-colors" />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 text-center">
          <Link
            href="/members/app/mypage"
            className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-[#1c3550] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            マイページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
