// /clone/[slug]/finance/expenses ─ 経費の一覧 + 追加 + 当月サマリ。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDate } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { FinanceNav } from "../_components/FinanceNav";
import { ExpenseAddDialog } from "./_components/ExpenseAddDialog";
import { ExpenseEditDialog } from "./_components/ExpenseEditDialog";
import { ExpenseDeleteButton } from "./_components/ExpenseDeleteButton";
import { CsvExportButton } from "../../_components/CsvExportButton";

export const dynamic = "force-dynamic";

interface ExpenseRow {
  id: string;
  occurred_date: string;
  amount: number;
  category: string | null;
  payee: string | null;
  purpose: string | null;
  fixed_or_variable: string | null;
  memo: string | null;
}

function formatYen(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function MetricBlock({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
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
    </div>
  );
}

function thisMonthSum(rows: ExpenseRow[]): {
  total: number;
  fixed: number;
  variable: number;
} {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inMonth = rows.filter((r) => r.occurred_date.startsWith(ym));
  const total = inMonth.reduce((acc, r) => acc + (r.amount ?? 0), 0);
  const fixed = inMonth
    .filter((r) => r.fixed_or_variable === "固定")
    .reduce((acc, r) => acc + (r.amount ?? 0), 0);
  const variable = inMonth
    .filter((r) => r.fixed_or_variable === "変動")
    .reduce((acc, r) => acc + (r.amount ?? 0), 0);
  return { total, fixed, variable };
}

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_expense")
    .select(
      "id, occurred_date, amount, category, payee, purpose, fixed_or_variable, memo",
    )
    .eq("tenant_id", tenant.id)
    .order("occurred_date", { ascending: false });

  const rows = (data ?? []) as ExpenseRow[];
  const { total, fixed, variable } = thisMonthSum(rows);

  // CSV エクスポート（金額は生の数値）
  const csvHeaders = ["計上日", "金額", "カテゴリ", "支払先", "用途", "固定/変動", "メモ"];
  const csvRows: (string | number | null)[][] = rows.map((e) => [
    e.occurred_date ? formatDate(e.occurred_date) : "",
    e.amount, e.category, e.payee, e.purpose, e.fixed_or_variable, e.memo,
  ]);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="FINANCE"
        title="経費"
        description="経費の記録。固定/変動の区分・カテゴリ別の集計から、右腕AI がコスト圧縮余地を判断する基盤。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={rows.length} label="件" tone="navy" />
            <CsvExportButton filename="expenses" headers={csvHeaders} rows={csvRows} />
            <ExpenseAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <FinanceNav slug={slug} />

      <div className="grid grid-cols-3 gap-3">
        <MetricBlock label="今月の経費" value={formatYen(total)} tone="navy" />
        <MetricBlock label="うち固定" value={formatYen(fixed)} />
        <MetricBlock label="うち変動" value={formatYen(variable)} />
      </div>

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && rows.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ経費が記録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「経費を追加」から、カテゴリ・固定/変動と一緒に記録していきます。
          </p>
        </EditorialCard>
      )}

      {!error && rows.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[0.8fr_0.7fr_0.5fr_0.9fr_1.1fr_1.3fr_0.7fr_0.4fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60 text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            <span>日付</span>
            <span>カテゴリ</span>
            <span>区分</span>
            <span className="text-right">金額</span>
            <span>支払先</span>
            <span>目的</span>
            <span>メモ</span>
            <span></span>
          </div>

          <ul className="divide-y divide-gray-100">
            {rows.map((r) => {
              const initial = {
                occurred_date: r.occurred_date,
                amount: String(r.amount),
                category: r.category ?? "",
                payee: r.payee ?? "",
                purpose: r.purpose ?? "",
                fixed_or_variable: r.fixed_or_variable ?? "",
                memo: r.memo ?? "",
              };
              const label =
                r.purpose?.slice(0, 30) ||
                r.payee ||
                r.category ||
                formatDate(r.occurred_date);
              return (
                <li
                  key={r.id}
                  className="md:grid md:grid-cols-[0.8fr_0.7fr_0.5fr_0.9fr_1.1fr_1.3fr_0.7fr_0.4fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group"
                >
                  <div className="text-[12px] text-gray-700 tabular-nums">
                    {formatDate(r.occurred_date)}
                  </div>
                  <div className="text-[13px] text-gray-700 mt-1 md:mt-0">
                    {r.category || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="text-[12px] text-gray-500 mt-1 md:mt-0">
                    {r.fixed_or_variable || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="text-[13px] text-gray-800 mt-1 md:mt-0 md:text-right tabular-nums font-medium">
                    {formatYen(r.amount)}
                  </div>
                  <div className="text-[13px] text-gray-700 mt-1 md:mt-0 truncate">
                    {r.payee || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="text-[13px] text-gray-700 mt-1 md:mt-0 truncate">
                    {r.purpose || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="text-[12px] text-gray-500 mt-1 md:mt-0 truncate">
                    {r.memo || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="flex items-center justify-end gap-0.5 mt-1 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExpenseEditDialog
                      slug={slug}
                      tenantId={tenant.id}
                      expenseId={r.id}
                      initial={initial}
                    />
                    <ExpenseDeleteButton
                      slug={slug}
                      tenantId={tenant.id}
                      expenseId={r.id}
                      label={label}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
