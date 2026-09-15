// /clone/[slug]/projects ─ Hub / 案件の一覧 + 追加。
// 詳細・編集・削除は Phase 1 残（people と同パターンで後追い実装可能）。

import Link from "next/link";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import {
  formatDate,
  formatDateTime,
} from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { SortableTableHeader } from "@/components/nav/SortableTableHeader";
import { ProjectAddDialog } from "./_components/ProjectAddDialog";
import { ProjectsFilterBar } from "./_components/ProjectsFilterBar";
import { CsvExportButton } from "../_components/CsvExportButton";

export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  status: string | null;
  proposal_amount: number | null;
  contract_amount: number | null;
  headcount: number | null;
  unit_price: number | null;
  next_action: string | null;
  due_date: string | null;
  updated_at: string | null;
}

// ステータスバッジ（muted Editorial パレット）
function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-[11px] text-gray-300">—</span>;
  }
  const styles: Record<
    string,
    { bg: string; border: string; text: string; dotBg: string }
  > = {
    リード: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-600",
      dotBg: "bg-gray-400",
    },
    提案: {
      bg: "bg-[#fbf3e3]",
      border: "border-[#e6d3a3]",
      text: "text-[#8a5a1c]",
      dotBg: "bg-[#c08a3e]",
    },
    受注: {
      bg: "bg-[#e9efe9]",
      border: "border-[#c5d3c8]",
      text: "text-[#3d6651]",
      dotBg: "bg-[#3d6651]",
    },
    進行中: {
      bg: "bg-[#f1f4f7]",
      border: "border-[#d6dde5]",
      text: "text-[#1c3550]",
      dotBg: "bg-[#1c3550]",
    },
    完了: {
      bg: "bg-[#eef0ee]",
      border: "border-[#cdd3cd]",
      text: "text-[#3a4a3d]",
      dotBg: "bg-[#3a4a3d]",
    },
    失注: {
      bg: "bg-[#f3e9e6]",
      border: "border-[#d8c4be]",
      text: "text-[#8a4538]",
      dotBg: "bg-[#8a4538]",
    },
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

function parseCsvParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw[0] : raw;
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseNumberParam(raw: string | string[] | undefined): number | null {
  if (!raw) return null;
  const str = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

function sanitizeForOr(s: string): string {
  return s.replace(/[,()]/g, "").trim();
}

function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// SortableTableHeader と完全連動。「<field>_<dir>」を分解。
// fields に複数アンダースコアを含むもの（updated_at, due_date, proposal_amount, contract_amount）も対応。
function parseSortParam(sort: string): { field: string; ascending: boolean } {
  const m = /^(.+)_(asc|desc)$/.exec(sort);
  if (!m) return { field: "updated_at", ascending: false };
  return { field: m[1], ascending: m[2] === "asc" };
}

export default async function ProjectsPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = sanitizeForOr((sp.q ?? "").toString());
  const statuses = parseCsvParam(sp.status);
  const amountMin = parseNumberParam(sp.amount_min);
  const amountMax = parseNumberParam(sp.amount_max);
  const dueFromRaw = (sp.due_from ?? "").toString();
  const dueToRaw = (sp.due_to ?? "").toString();
  const dueFrom = isValidDateStr(dueFromRaw) ? dueFromRaw : "";
  const dueTo = isValidDateStr(dueToRaw) ? dueToRaw : "";
  const hasAction = sp.has_action === "1";
  const sort = (sp.sort ?? "updated_at_desc").toString();

  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  // メインクエリ
  let mainQuery = supabase
    .from("ai_clone_project")
    .select(
      "id, name, status, proposal_amount, contract_amount, headcount, unit_price, next_action, due_date, updated_at",
    )
    .eq("tenant_id", tenant.id);

  if (statuses.length > 0) mainQuery = mainQuery.in("status", statuses);
  // 金額は proposal_amount をベースに比較。null は除外される（gte/lte）。
  if (amountMin !== null) mainQuery = mainQuery.gte("proposal_amount", amountMin);
  if (amountMax !== null) mainQuery = mainQuery.lte("proposal_amount", amountMax);
  if (dueFrom) mainQuery = mainQuery.gte("due_date", dueFrom);
  if (dueTo) mainQuery = mainQuery.lte("due_date", dueTo);
  if (hasAction) mainQuery = mainQuery.not("next_action", "is", null);
  if (q) {
    mainQuery = mainQuery.or(
      `name.ilike.%${q}%,next_action.ilike.%${q}%`,
    );
  }

  // ソート
  const { field: sortField, ascending } = parseSortParam(sort);
  const allowedFields = [
    "name", "status", "proposal_amount", "contract_amount",
    "due_date", "updated_at",
  ];
  if (allowedFields.includes(sortField)) {
    mainQuery = mainQuery.order(sortField, { ascending, nullsFirst: false });
  } else {
    mainQuery = mainQuery.order("updated_at", { ascending: false });
  }

  const [logsRes, totalRes] = await Promise.all([
    mainQuery,
    supabase
      .from("ai_clone_project")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
  ]);
  const { data, error } = logsRes;
  const totalCount = totalRes.count ?? 0;
  const hasActiveFilter =
    q.length > 0 || statuses.length > 0
    || amountMin !== null || amountMax !== null
    || dueFrom !== "" || dueTo !== "" || hasAction;

  const projects = (data ?? []) as ProjectRow[];

  // 関連人物の数を「人数」として自動カウント（手動 headcount があればそちらを優先）。
  // 概算売上 = 人数 × 単価。
  const projectIds = projects.map((p) => p.id);
  const linkedCount = new Map<string, number>();
  if (projectIds.length > 0) {
    const { data: linkRows } = await supabase
      .from("ai_clone_person_projects")
      .select("project_id")
      .in("project_id", projectIds);
    for (const r of (linkRows ?? []) as { project_id: string }[]) {
      linkedCount.set(r.project_id, (linkedCount.get(r.project_id) ?? 0) + 1);
    }
  }
  const effectiveHeadcount = (p: ProjectRow) =>
    p.headcount ?? linkedCount.get(p.id) ?? 0;
  const estimateOf = (p: ProjectRow) =>
    effectiveHeadcount(p) * (p.unit_price ?? 0);

  // CSV エクスポート（現在のフィルタ結果をそのまま出力。金額は生の数値）
  const csvHeaders = [
    "案件名", "状態", "提案金額", "受注金額", "次のアクション", "期限", "更新日時",
  ];
  const csvRows: (string | number | null)[][] = projects.map((p) => [
    p.name, p.status, p.proposal_amount, p.contract_amount, p.next_action,
    p.due_date ? formatDate(p.due_date) : "",
    p.updated_at ? formatDateTime(p.updated_at) : "",
  ]);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="HUB / PROJECTS"
        title="案件"
        description="提案中・進行中・完了の案件をここに集約。右腕AI が金額・期限・次アクションから優先度を提案する基盤データ。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={totalCount} label="登録済み" tone="navy" />
            <CsvExportButton filename="projects" headers={csvHeaders} rows={csvRows} />
            <ProjectAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      {totalCount > 0 && (
        <ProjectsFilterBar
          filteredCount={projects.length}
          totalCount={totalCount}
        />
      )}

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && projects.length === 0 && !hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ案件が登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「案件を追加」から、進行中の案件を1件ずつ入れていきます。
            <br />
            案件名だけでもOK。金額・期限・次アクションは後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!error && projects.length === 0 && hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            条件に一致する案件はありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            検索キーワードやフィルタを見直してみてください。
            <br />
            上部「フィルタ解除」で全件表示に戻せます。
          </p>
        </EditorialCard>
      )}

      {!error && projects.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr_0.9fr_1.0fr_0.7fr_0.8fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60">
            <SortableTableHeader field="name" defaultDir="asc" label="案件名" />
            <SortableTableHeader field="status" defaultDir="asc" label="状態" />
            <SortableTableHeader field="proposal_amount" defaultDir="desc" label="提案" align="right" />
            <SortableTableHeader field="contract_amount" defaultDir="desc" label="受注" align="right" />
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase text-right">概算</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">次のアクション</span>
            <SortableTableHeader field="due_date" defaultDir="asc" label="期限" align="right" />
            <SortableTableHeader field="updated_at" defaultDir="desc" label="更新" align="right" />
          </div>

          <ul className="divide-y divide-gray-100">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/clone/${slug}/projects/${p.id}`}
                  className="md:grid md:grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr_0.9fr_1.0fr_0.7fr_0.8fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors block"
                >
                  <div className="font-medium text-sm text-[#1c3550]">
                    {p.name}
                  </div>
                  <div className="mt-1 md:mt-0">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 md:text-right tabular-nums">
                    {formatYen(p.proposal_amount)}
                  </div>
                  <div className="text-[13px] text-gray-800 mt-1 md:mt-0 md:text-right tabular-nums font-medium">
                    {formatYen(p.contract_amount)}
                  </div>
                  <div className="text-[13px] text-[#8a5a1c] mt-1 md:mt-0 md:text-right tabular-nums font-bold">
                    {estimateOf(p) > 0 ? (
                      formatYen(estimateOf(p))
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 truncate">
                    {p.next_action || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="text-[12px] text-gray-500 mt-1 md:mt-0 md:text-right tabular-nums">
                    {p.due_date ? formatDate(p.due_date) : "—"}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 md:mt-0 md:text-right tabular-nums">
                    {formatDateTime(p.updated_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
