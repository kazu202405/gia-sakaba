// /clone/[slug]/review/monthly ─ 23_月次レビュー の一覧 + 追加 + 編集 + 削除。
// 月単位の損益と「時間 / お金の配分」を振り返り、来月の改善アクションを決める場所。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ReviewNav } from "../_components/ReviewNav";
import { MonthlyReviewAddDialog } from "./_components/MonthlyReviewAddDialog";
import { MonthlyReviewEditDialog } from "./_components/MonthlyReviewEditDialog";
import { MonthlyReviewDeleteButton } from "./_components/MonthlyReviewDeleteButton";

export const dynamic = "force-dynamic";

interface MonthlyReviewRow {
  id: string;
  target_month: string;
  revenue: number | null;
  expense: number | null;
  gross_profit: number | null; // GENERATED 列
  top_people: string | null;
  top_projects: string | null;
  high_margin_projects: string | null;
  low_margin_projects: string | null;
  activities_to_reduce: string | null;
  activities_to_increase: string | null;
  improvement_actions: string | null;
}

function formatYen(value: number | null): string {
  if (value === null) return "—";
  return `¥${value.toLocaleString("ja-JP")}`;
}

export default async function MonthlyReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_monthly_review")
    .select(
      "id, target_month, revenue, expense, gross_profit, " +
        "top_people, top_projects, high_margin_projects, low_margin_projects, " +
        "activities_to_reduce, activities_to_increase, improvement_actions",
    )
    .eq("tenant_id", tenant.id)
    .order("target_month", { ascending: false })
    .order("created_at", { ascending: false });

  const reviews = (data ?? []) as unknown as MonthlyReviewRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="REVIEW / MONTHLY"
        title="月次レビュー"
        description="売上・経費・利益率と、時間・お金の配分。減らすべき活動と増やすべき活動を月次で見直す。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={reviews.length} label="件" tone="navy" />
            <MonthlyReviewAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <ReviewNav slug={slug} />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && reviews.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ月次レビューがありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            月の終わりに「売上 / 経費 / 利益率 / 時間配分 / 改善アクション」を残していきます。
            <br />
            積み上げが事業の意思決定の土台になります。
          </p>
        </EditorialCard>
      )}

      {!error && reviews.length > 0 && (
        <ul className="space-y-3">
          {reviews.map((r) => {
            const initial = {
              target_month: r.target_month,
              revenue: r.revenue === null ? "" : String(r.revenue),
              expense: r.expense === null ? "" : String(r.expense),
              top_people: r.top_people ?? "",
              top_projects: r.top_projects ?? "",
              high_margin_projects: r.high_margin_projects ?? "",
              low_margin_projects: r.low_margin_projects ?? "",
              activities_to_reduce: r.activities_to_reduce ?? "",
              activities_to_increase: r.activities_to_increase ?? "",
              improvement_actions: r.improvement_actions ?? "",
            };
            const hasFinancials =
              r.revenue !== null || r.expense !== null;
            const margin =
              r.revenue && r.revenue > 0 && r.gross_profit !== null
                ? Math.round((r.gross_profit / r.revenue) * 100)
                : null;

            return (
              <li key={r.id}>
                <EditorialCard variant="row" className="px-5 py-4 group">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="font-serif text-[15px] font-semibold text-[#1c3550] tracking-[0.04em]">
                          {r.target_month}
                        </span>
                        {margin !== null && (
                          <span className="text-[10px] tracking-[0.18em] text-[#c08a3e] uppercase">
                            粗利率 {margin}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <MonthlyReviewEditDialog
                        slug={slug}
                        tenantId={tenant.id}
                        reviewId={r.id}
                        initial={initial}
                      />
                      <MonthlyReviewDeleteButton
                        slug={slug}
                        tenantId={tenant.id}
                        reviewId={r.id}
                        label={r.target_month}
                      />
                    </div>
                  </div>

                  {hasFinancials && (
                    <dl className="grid grid-cols-3 gap-3 mb-4 p-3 bg-[#fbf3e3]/40 border border-[#e6d3a3]/40 rounded-md">
                      <FinTile label="売上" value={formatYen(r.revenue)} />
                      <FinTile label="経費" value={formatYen(r.expense)} />
                      <FinTile
                        label="粗利"
                        value={formatYen(r.gross_profit)}
                        emphasis
                      />
                    </dl>
                  )}

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
                    {r.top_projects && (
                      <Field label="時間を使った上位案件" value={r.top_projects} />
                    )}
                    {r.top_people && (
                      <Field label="時間を使った上位人物" value={r.top_people} />
                    )}
                    {r.high_margin_projects && (
                      <Field
                        label="利益率が高い案件"
                        value={r.high_margin_projects}
                      />
                    )}
                    {r.low_margin_projects && (
                      <Field
                        label="利益率が低い案件"
                        value={r.low_margin_projects}
                      />
                    )}
                    {r.activities_to_reduce && (
                      <Field
                        label="減らすべき活動"
                        value={r.activities_to_reduce}
                      />
                    )}
                    {r.activities_to_increase && (
                      <Field
                        label="増やすべき活動"
                        value={r.activities_to_increase}
                      />
                    )}
                  </dl>

                  {r.improvement_actions && (
                    <div className="mt-3 pt-3 border-t border-dashed border-[#e6d3a3]">
                      <p className="text-[10px] tracking-[0.18em] text-[#c08a3e] uppercase mb-1">
                        来月の改善アクション
                      </p>
                      <p className="text-[12.5px] text-[#1c3550] leading-relaxed whitespace-pre-wrap">
                        {r.improvement_actions}
                      </p>
                    </div>
                  )}
                </EditorialCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.18em] text-gray-400 uppercase mb-1">
        {label}
      </dt>
      <dd className="text-gray-700 leading-relaxed whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  );
}

function FinTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] tracking-[0.18em] text-[#8a5a1c] uppercase mb-1">
        {label}
      </p>
      <p
        className={`font-serif tabular-nums ${
          emphasis
            ? "text-[15px] text-[#1c3550] font-semibold"
            : "text-[14px] text-[#1c3550]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
