// /clone/[slug]/services/[id] ─ サービス詳細。
// 全項目を読みやすく表示 + 編集 / 削除導線。関連案件は Phase 1 残としてプレースホルダ。

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { ServiceEditDialog } from "../_components/ServiceEditDialog";
import { ServiceDeleteButton } from "../_components/ServiceDeleteButton";
import { RelatedSection, type RelatedItem } from "../../_components/RelatedSection";
import type { PickerCandidate } from "../../_components/LinkPickerDialog";
import { linkServiceProject, unlinkServiceProject } from "@/lib/ai-clone/links";
import { formatDate } from "@/app/admin/_components/EditorialFormat";
import type { ServiceInput } from "../_actions";

export const dynamic = "force-dynamic";

interface ServiceRow {
  id: string;
  name: string;
  target_audience: string | null;
  problem_solved: string | null;
  offering: string | null;
  pricing: string | null;
  onboarding_flow: string | null;
  faq_text: string | null;
  good_fit: string | null;
  bad_fit: string | null;
  usp: string | null;
  buying_reason: string | null;
  referral_one_liner: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-[11px] tracking-[0.18em] text-gray-500 uppercase pt-0.5">
        {label}
      </div>
      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {value || <span className="text-gray-300">—</span>}
      </div>
    </div>
  );
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_service")
    .select(
      "id, name, target_audience, problem_solved, offering, pricing, onboarding_flow, faq_text, good_fit, bad_fit, usp, buying_reason, referral_one_liner, created_at, updated_at",
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const service = data as ServiceRow;

  // 関連案件のリンク状況 + 案件マスター
  const [linkProjectsRes, allProjectsRes] = await Promise.all([
    supabase
      .from("ai_clone_service_projects")
      .select("project_id")
      .eq("service_id", service.id),
    supabase
      .from("ai_clone_project")
      .select("id, name, status, due_date")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false }),
  ]);

  type ProjectRowMini = {
    id: string;
    name: string;
    status: string | null;
    due_date: string | null;
  };
  const projectRows = (allProjectsRes.data ?? []) as ProjectRowMini[];
  const linkedProjectIds = new Set(
    (linkProjectsRes.data ?? []).map(
      (r: { project_id: string }) => r.project_id,
    ),
  );

  const projectItems: RelatedItem[] = projectRows
    .filter((p) => linkedProjectIds.has(p.id))
    .map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: [p.status, p.due_date ? `期限 ${formatDate(p.due_date)}` : null]
        .filter(Boolean)
        .join(" / "),
      href: `/clone/${slug}/projects/${p.id}`,
    }));
  const projectCandidates: PickerCandidate[] = projectRows
    .filter((p) => !linkedProjectIds.has(p.id))
    .map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: p.status ?? null,
    }));

  const onLinkProject = linkServiceProject.bind(
    null,
    slug,
    tenant.id,
    service.id,
  ) as (id: string) => Promise<{ ok: boolean; error?: string }>;
  const onUnlinkProject = unlinkServiceProject.bind(
    null,
    slug,
    tenant.id,
    service.id,
  ) as (id: string) => Promise<{ ok: boolean; error?: string }>;

  const initial: ServiceInput = {
    name: service.name,
    target_audience: service.target_audience ?? "",
    problem_solved: service.problem_solved ?? "",
    offering: service.offering ?? "",
    pricing: service.pricing ?? "",
    onboarding_flow: service.onboarding_flow ?? "",
    faq_text: service.faq_text ?? "",
    good_fit: service.good_fit ?? "",
    bad_fit: service.bad_fit ?? "",
    usp: service.usp ?? "",
    buying_reason: service.buying_reason ?? "",
    referral_one_liner: service.referral_one_liner ?? "",
  };

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <Link
        href={`/clone/${slug}/services`}
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-[#1c3550] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        サービス一覧に戻る
      </Link>

      <EditorialHeader
        eyebrow="HUB / SERVICES"
        title={service.name}
        description={service.target_audience ?? undefined}
        right={
          <div className="flex items-center gap-2">
            <ServiceEditDialog
              slug={slug}
              tenantId={tenant.id}
              serviceId={service.id}
              initial={initial}
            />
            <ServiceDeleteButton
              slug={slug}
              tenantId={tenant.id}
              serviceId={service.id}
              serviceName={service.name}
            />
          </div>
        }
      />

      <EditorialCard className="px-6 py-2">
        <Row label="対象者" value={service.target_audience} />
        <Row label="料金" value={service.pricing} />
        <Row label="解決する悩み" value={service.problem_solved} />
        <Row label="提供内容" value={service.offering} />
        <Row label="導入の流れ" value={service.onboarding_flow} />
        <Row label="FAQ" value={service.faq_text} />
        <Row label="提案に向く相手" value={service.good_fit} />
        <Row label="提案しない方がいい相手" value={service.bad_fit} />
      </EditorialCard>

      <EditorialCard className="px-6 py-2">
        <div className="pt-3 pb-1">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
            紹介されやすさ
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            編集画面の「AIで磨く」で、対象・悩み・提供から案を作れます。
          </p>
        </div>
        <Row label="USP（他との違い）" value={service.usp} />
        <Row label="あなたから買う理由" value={service.buying_reason} />
        <Row label="紹介しやすい一言" value={service.referral_one_liner} />
      </EditorialCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RelatedSection
          title="関連案件"
          pickerTitle="案件を紐付け"
          triggerLabel="案件を追加"
          pickerEmptyMessage="案件マスターに登録がありません"
          items={projectItems}
          candidates={projectCandidates}
          onLink={onLinkProject}
          onUnlink={onUnlinkProject}
        />
        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            関連ナレッジ
          </h3>
          <p className="text-[12px] text-gray-400">
            Phase 2 で追加予定（service ⇄ knowledge_candidate）
          </p>
        </EditorialCard>
      </div>

      <p className="text-[10px] tracking-[0.18em] text-gray-400 text-right">
        作成 {formatDateTime(service.created_at)} ／ 更新{" "}
        {formatDateTime(service.updated_at)}
      </p>
    </div>
  );
}
