// /clone/[slug]/projects/[id] ─ 案件詳細。ステータス・金額・GENERATED列（粗利/粗利率/時間単価）を一目で確認。
// 関連人物・進捗ログ・タスクは Phase 1 残としてプレースホルダ。

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import {
  formatDate,
  formatDateTime,
} from "@/app/admin/_components/EditorialFormat";
import { ProjectEditDialog } from "../_components/ProjectEditDialog";
import { ProjectDeleteButton } from "../_components/ProjectDeleteButton";
import { ProjectTabs } from "./_components/ProjectTabs";
import { RelatedSection, type RelatedItem } from "../../_components/RelatedSection";
import type { PickerCandidate } from "../../_components/LinkPickerDialog";
import {
  linkProjectPerson,
  unlinkProjectPerson,
  linkProjectService,
  unlinkProjectService,
} from "@/lib/ai-clone/links";
import type { ProjectInput } from "../_actions";

export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  status: string | null;
  proposal_amount: number | null;
  contract_amount: number | null;
  headcount: number | null;
  unit_price: number | null;
  revenue_total: number | null;
  cost_total: number | null;
  gross_profit: number | null;
  gross_margin: number | null;
  hours_invested: number | null;
  hourly_rate: number | null;
  next_action: string | null;
  pending_decision: string | null;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function statusLabel(value: string | null): string {
  return value ?? "—";
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<
    string,
    { bg: string; border: string; text: string; dotBg: string }
  > = {
    リード: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", dotBg: "bg-gray-400" },
    提案: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]", dotBg: "bg-[#c08a3e]" },
    受注: { bg: "bg-[#e9efe9]", border: "border-[#c5d3c8]", text: "text-[#3d6651]", dotBg: "bg-[#3d6651]" },
    進行中: { bg: "bg-[#f1f4f7]", border: "border-[#d6dde5]", text: "text-[#1c3550]", dotBg: "bg-[#1c3550]" },
    完了: { bg: "bg-[#eef0ee]", border: "border-[#cdd3cd]", text: "text-[#3a4a3d]", dotBg: "bg-[#3a4a3d]" },
    失注: { bg: "bg-[#f3e9e6]", border: "border-[#d8c4be]", text: "text-[#8a4538]", dotBg: "bg-[#8a4538]" },
  };
  const s = styles[status] ?? styles["リード"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotBg}`} />
      {status}
    </span>
  );
}

function formatYen(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatHours(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value} h`;
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

// KPI カード（GENERATED 列を強調）
function MetricBlock({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "navy" | "gold";
}) {
  const valueColor =
    tone === "navy"
      ? "text-[#1c3550]"
      : tone === "gold"
        ? "text-[#8a5a1c]"
        : "text-gray-800";
  return (
    <div className="px-4 py-3 border border-gray-200 rounded-md bg-white">
      <p className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-1">
        {label}
      </p>
      <p className={`font-serif text-xl font-bold tabular-nums ${valueColor}`}>
        {value}
      </p>
      {hint && (
        <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>
      )}
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_project")
    .select(
      "id, name, status, proposal_amount, contract_amount, headcount, unit_price, revenue_total, cost_total, gross_profit, gross_margin, hours_invested, hourly_rate, next_action, pending_decision, due_date, created_at, updated_at",
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const project = data as ProjectRow;

  // タブの「進捗 N件」+ リンク取得 + 候補マスター取得 を並列
  const [
    progressRes,
    linkPersons,
    linkServices,
    allPersonsRes,
    allServicesRes,
  ] = await Promise.all([
    supabase
      .from("ai_clone_project_progress_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("project_id", project.id),
    supabase
      .from("ai_clone_person_projects")
      .select("person_id")
      .eq("project_id", project.id),
    supabase
      .from("ai_clone_service_projects")
      .select("service_id")
      .eq("project_id", project.id),
    supabase
      .from("ai_clone_person")
      .select("id, name, company_name, position")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("ai_clone_service")
      .select("id, name, target_audience")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false }),
  ]);
  const progressCount = progressRes.count ?? 0;

  type PersonRowMini = {
    id: string;
    name: string;
    company_name: string | null;
    position: string | null;
  };
  type ServiceRowMini = {
    id: string;
    name: string;
    target_audience: string | null;
  };
  const personRows = (allPersonsRes.data ?? []) as PersonRowMini[];
  const serviceRows = (allServicesRes.data ?? []) as ServiceRowMini[];
  const linkedPersonIds = new Set(
    (linkPersons.data ?? []).map((r: { person_id: string }) => r.person_id),
  );
  const linkedServiceIds = new Set(
    (linkServices.data ?? []).map((r: { service_id: string }) => r.service_id),
  );

  const personItems: RelatedItem[] = personRows
    .filter((p) => linkedPersonIds.has(p.id))
    .map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: [p.company_name, p.position].filter(Boolean).join(" / ") || null,
      href: `/clone/${slug}/people/${p.id}`,
    }));
  const personCandidates: PickerCandidate[] = personRows
    .filter((p) => !linkedPersonIds.has(p.id))
    .map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: [p.company_name, p.position].filter(Boolean).join(" / ") || null,
    }));

  const serviceItems: RelatedItem[] = serviceRows
    .filter((s) => linkedServiceIds.has(s.id))
    .map((s) => ({
      id: s.id,
      label: s.name,
      sublabel: s.target_audience,
      href: `/clone/${slug}/services/${s.id}`,
    }));
  const serviceCandidates: PickerCandidate[] = serviceRows
    .filter((s) => !linkedServiceIds.has(s.id))
    .map((s) => ({
      id: s.id,
      label: s.name,
      sublabel: s.target_audience,
    }));

  type LinkFn = (
    slug: string,
    tenantId: string,
    projectId: string,
    rightId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  const bindLink = (fn: LinkFn) =>
    fn.bind(null, slug, tenant.id, project.id) as (
      rightId: string,
    ) => Promise<{ ok: boolean; error?: string }>;

  // Edit ダイアログに渡す初期値（numeric は文字列で）
  const numStr = (v: number | null) =>
    v === null || v === undefined ? "" : String(v);
  const initial: ProjectInput = {
    name: project.name,
    status: project.status ?? "",
    proposal_amount: numStr(project.proposal_amount),
    contract_amount: numStr(project.contract_amount),
    headcount: numStr(project.headcount),
    unit_price: numStr(project.unit_price),
    revenue_total: numStr(project.revenue_total),
    cost_total: numStr(project.cost_total),
    hours_invested: numStr(project.hours_invested),
    next_action: project.next_action ?? "",
    pending_decision: project.pending_decision ?? "",
    due_date: project.due_date ?? "",
  };

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <Link
        href={`/clone/${slug}/projects`}
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-[#1c3550] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        案件一覧に戻る
      </Link>

      <EditorialHeader
        eyebrow="HUB / PROJECTS"
        title={project.name}
        description={
          project.status ? `ステータス: ${statusLabel(project.status)}` : undefined
        }
        right={
          <div className="flex items-center gap-2">
            <ProjectEditDialog
              slug={slug}
              tenantId={tenant.id}
              projectId={project.id}
              initial={initial}
            />
            <ProjectDeleteButton
              slug={slug}
              tenantId={tenant.id}
              projectId={project.id}
              projectName={project.name}
            />
          </div>
        }
      />

      <ProjectTabs
        slug={slug}
        projectId={project.id}
        progressCount={progressCount}
      />

      {/* KPI（GENERATED 列を強調） */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBlock
          label="提案金額"
          value={formatYen(project.proposal_amount)}
        />
        <MetricBlock
          label="受注金額"
          value={formatYen(project.contract_amount)}
          tone="navy"
        />
        <MetricBlock
          label="概算売上"
          value={formatYen(
            (project.headcount ?? (linkPersons.data ?? []).length) *
              (project.unit_price ?? 0),
          )}
          hint={`${project.headcount ?? (linkPersons.data ?? []).length}人 × 単価`}
          tone="gold"
        />
        <MetricBlock
          label="粗利"
          value={formatYen(project.gross_profit)}
          hint="売上 − 原価（自動計算）"
          tone="gold"
        />
        <MetricBlock
          label="粗利率"
          value={formatPercent(project.gross_margin)}
          hint="自動計算"
        />
        <MetricBlock
          label="売上合計"
          value={formatYen(project.revenue_total)}
        />
        <MetricBlock
          label="原価・経費"
          value={formatYen(project.cost_total)}
        />
        <MetricBlock
          label="投下時間"
          value={formatHours(project.hours_invested)}
        />
        <MetricBlock
          label="時間単価"
          value={formatYen(project.hourly_rate)}
          hint="売上 ÷ 投下時間"
          tone="gold"
        />
      </div>

      {/* テキスト系 */}
      <EditorialCard className="px-6 py-2">
        <Row label="ステータス" value={<StatusBadge status={project.status} />} />
        <Row
          label="期限"
          value={project.due_date ? formatDate(project.due_date) : null}
        />
        <Row label="次のアクション" value={project.next_action} />
        <Row label="判断待ち" value={project.pending_decision} />
      </EditorialCard>

      {/* 関連エンティティ（進捗ログは「進捗」タブに移管） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RelatedSection
          title="関連人物"
          pickerTitle="人物を紐付け"
          triggerLabel="人物を追加"
          pickerEmptyMessage="人物マスターに登録がありません"
          items={personItems}
          candidates={personCandidates}
          onLink={bindLink(linkProjectPerson)}
          onUnlink={bindLink(unlinkProjectPerson)}
        />
        <RelatedSection
          title="関連サービス"
          pickerTitle="サービスを紐付け"
          triggerLabel="サービスを追加"
          pickerEmptyMessage="サービスマスターに登録がありません"
          items={serviceItems}
          candidates={serviceCandidates}
          onLink={bindLink(linkProjectService)}
          onUnlink={bindLink(unlinkProjectService)}
        />
      </div>

      <p className="text-[10px] tracking-[0.18em] text-gray-400 text-right">
        作成 {formatDateTime(project.created_at)} ／ 更新{" "}
        {formatDateTime(project.updated_at)}
      </p>
    </div>
  );
}
