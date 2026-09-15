// /clone/[slug]/core-os/annual-kpi ─ 年度×複数KPIの一覧 + 追加。
// 構造: 1年度 = 複数KPIレコード（title + target_value + unit）。
// 年度ごとにグループ化して表示する。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { CoreOsNav } from "../_components/CoreOsNav";
import { SectionGuide } from "../_components/SectionGuide";
import { AnnualKpiAddDialog } from "./_components/AnnualKpiAddDialog";
import { AnnualKpiEditDialog } from "./_components/AnnualKpiEditDialog";
import { AnnualKpiDeleteButton } from "./_components/AnnualKpiDeleteButton";

export const dynamic = "force-dynamic";

interface KpiRow {
  id: string;
  fiscal_year: string;
  title: string;
  target_value: number | null;
  unit: string | null;
}

function formatTarget(value: number | null, unit: string | null) {
  if (value === null || value === undefined) return "—";
  const num = Number.isInteger(value)
    ? value.toLocaleString("ja-JP")
    : value.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
  return unit ? `${num} ${unit}` : num;
}

export default async function AnnualKpiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_annual_kpi")
    .select("id, fiscal_year, title, target_value, unit, created_at")
    .eq("tenant_id", tenant.id)
    .order("fiscal_year", { ascending: false })
    .order("created_at", { ascending: true });

  const kpis = (data ?? []) as KpiRow[];

  // 年度ごとにグループ化
  const grouped = new Map<string, KpiRow[]>();
  for (const k of kpis) {
    const arr = grouped.get(k.fiscal_year) ?? [];
    arr.push(k);
    grouped.set(k.fiscal_year, arr);
  }
  const years = Array.from(grouped.keys());
  const currentYear = String(new Date().getFullYear());
  const defaultFiscalYear = years[0] ?? currentYear;

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        title="今年のKPI"
        description="年度別の重点目標。KPI名・目標値・単位を自由に追加できる。右腕AI が提案優先度を判断する時の基準。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={kpis.length} label="KPI" tone="navy" />
            <AnnualKpiAddDialog
              slug={slug}
              tenantId={tenant.id}
              defaultFiscalYear={defaultFiscalYear}
            />
          </div>
        }
      />

      <CoreOsNav slug={slug} />

      <SectionGuide section="annual-kpi" />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && kpis.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだKPIが登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「KPIを追加」から、今年の重点目標を入れていきます。
          </p>
        </EditorialCard>
      )}

      {!error && years.length > 0 && (
        <div className="space-y-5">
          {years.map((year) => {
            const rows = grouped.get(year) ?? [];
            return (
              <EditorialCard key={year} className="px-6 py-5">
                <div className="flex items-baseline gap-3 mb-4 pb-3 border-b border-gray-100">
                  <span className="font-serif text-2xl font-bold text-[#1c3550] tabular-nums">
                    {year}
                  </span>
                  <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                    Fiscal Year
                  </span>
                  <span className="ml-auto text-[11px] text-gray-500 tabular-nums">
                    {rows.length} KPI
                  </span>
                </div>

                <ul className="divide-y divide-gray-100">
                  {rows.map((k) => {
                    const initial = {
                      fiscal_year: k.fiscal_year,
                      title: k.title,
                      target_value:
                        k.target_value === null ? "" : String(k.target_value),
                      unit: k.unit ?? "",
                    };
                    return (
                      <li
                        key={k.id}
                        className="flex items-center gap-3 py-2.5 group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">
                            {k.title}
                          </p>
                        </div>
                        <div className="flex-shrink-0 font-serif text-base font-bold text-[#1c3550] tabular-nums">
                          {formatTarget(k.target_value, k.unit)}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                          <AnnualKpiEditDialog
                            slug={slug}
                            tenantId={tenant.id}
                            kpiId={k.id}
                            initial={initial}
                          />
                          <AnnualKpiDeleteButton
                            slug={slug}
                            tenantId={tenant.id}
                            kpiId={k.id}
                            label={k.title}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </EditorialCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
