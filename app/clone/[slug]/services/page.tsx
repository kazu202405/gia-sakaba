// /clone/[slug]/services ─ Hub / サービスの一覧 + 追加。
// 詳細・編集・削除は Phase 1 残（people と同パターンで後追い実装可能）。

import Link from "next/link";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { SortableTableHeader } from "@/components/nav/SortableTableHeader";
import { ServiceAddDialog } from "./_components/ServiceAddDialog";
import { ServicesFilterBar } from "./_components/ServicesFilterBar";
import { CsvExportButton } from "../_components/CsvExportButton";

export const dynamic = "force-dynamic";

interface ServiceRow {
  id: string;
  name: string;
  target_audience: string | null;
  pricing: string | null;
  problem_solved: string | null;
  updated_at: string | null;
}

// 長文の最初の1行（または最大80字）だけ抜粋して一覧に出す。
function excerpt(value: string | null, max = 80): string | null {
  if (!value) return null;
  const firstLine = value.split(/\r?\n/)[0].trim();
  if (firstLine.length === 0) return null;
  return firstLine.length > max
    ? `${firstLine.slice(0, max)}…`
    : firstLine;
}

function sanitizeForOr(s: string): string {
  return s.replace(/[,()]/g, "").trim();
}

function parseSortParam(sort: string): { field: string; ascending: boolean } {
  const m = /^(.+)_(asc|desc)$/.exec(sort);
  if (!m) return { field: "updated_at", ascending: false };
  return { field: m[1], ascending: m[2] === "asc" };
}

export default async function ServicesPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = sanitizeForOr((sp.q ?? "").toString());
  const sort = (sp.sort ?? "updated_at_desc").toString();

  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  let mainQuery = supabase
    .from("ai_clone_service")
    .select("id, name, target_audience, pricing, problem_solved, updated_at")
    .eq("tenant_id", tenant.id);

  if (q) {
    mainQuery = mainQuery.or(
      `name.ilike.%${q}%,target_audience.ilike.%${q}%,problem_solved.ilike.%${q}%,pricing.ilike.%${q}%`,
    );
  }

  // ソート（name / updated_at のみ許可）
  const { field: sortField, ascending } = parseSortParam(sort);
  if (sortField === "name" || sortField === "updated_at") {
    mainQuery = mainQuery.order(sortField, { ascending, nullsFirst: false });
  } else {
    mainQuery = mainQuery.order("updated_at", { ascending: false });
  }

  const [logsRes, totalRes] = await Promise.all([
    mainQuery,
    supabase
      .from("ai_clone_service")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
  ]);
  const { data, error } = logsRes;
  const totalCount = totalRes.count ?? 0;
  const hasActiveFilter = q.length > 0;
  const services = (data ?? []) as ServiceRow[];

  // CSV エクスポート（解決する悩みは全文。CSV 側でエスケープされる）
  const csvHeaders = ["サービス名", "対象者", "料金", "解決する悩み", "更新日時"];
  const csvRows: (string | number | null)[][] = services.map((s) => [
    s.name, s.target_audience, s.pricing, s.problem_solved,
    s.updated_at ? formatDateTime(s.updated_at) : "",
  ]);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="HUB / SERVICES"
        title="サービス・商品"
        description="提供する商品のマスタ。右腕AI が提案文を組み立てる時の素材として参照する。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={totalCount} label="登録済み" tone="navy" />
            <CsvExportButton filename="services" headers={csvHeaders} rows={csvRows} />
            <ServiceAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      {totalCount > 0 && (
        <ServicesFilterBar
          filteredCount={services.length}
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

      {!error && services.length === 0 && !hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだサービスが登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「サービスを追加」から、提供している商品を1件ずつ入れていきます。
            <br />
            サービス名だけでもOK。詳細は後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!error && services.length === 0 && hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            条件に一致するサービスはありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            検索キーワードを見直してみてください。
            <br />
            上部「検索解除」で全件表示に戻せます。
          </p>
        </EditorialCard>
      )}

      {!error && services.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.5fr_1.3fr_1fr_2fr_0.9fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60">
            <SortableTableHeader field="name" defaultDir="asc" label="サービス名" />
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">対象者</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">料金</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">解決する悩み</span>
            <SortableTableHeader field="updated_at" defaultDir="desc" label="更新" align="right" />
          </div>

          <ul className="divide-y divide-gray-100">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/clone/${slug}/services/${s.id}`}
                  className="md:grid md:grid-cols-[1.5fr_1.3fr_1fr_2fr_0.9fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors block"
                >
                  <div className="font-medium text-sm text-[#1c3550]">
                    {s.name}
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0">
                    {s.target_audience || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="text-[13px] text-gray-700 mt-1 md:mt-0 tabular-nums">
                    {s.pricing || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 leading-relaxed">
                    {excerpt(s.problem_solved) || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 md:mt-0 md:text-right tabular-nums">
                    {formatDateTime(s.updated_at)}
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
