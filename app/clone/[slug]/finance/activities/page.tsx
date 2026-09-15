// /clone/[slug]/finance/activities ─ 活動ログの一覧 + 追加。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDate } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { FinanceNav } from "../_components/FinanceNav";
import { ActivityLogAddDialog } from "./_components/ActivityLogAddDialog";
import { ActivityLogEditDialog } from "./_components/ActivityLogEditDialog";
import { ActivityLogDeleteButton } from "./_components/ActivityLogDeleteButton";
import { CsvExportButton } from "../../_components/CsvExportButton";

export const dynamic = "force-dynamic";

interface ActivityRow {
  id: string;
  occurred_date: string;
  content: string | null;
  activity_type: string | null;
  duration_minutes: number | null;
  travel_minutes: number | null;
  cost: number | null;
  outcome: string | null;
  next_action: string | null;
}

function formatMinutes(v: number | null): string {
  if (v === null || v === undefined) return "—";
  if (v < 60) return `${v}分`;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

function formatYen(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export default async function ActivitiesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_activity_log")
    .select(
      "id, occurred_date, content, activity_type, duration_minutes, travel_minutes, cost, outcome, next_action",
    )
    .eq("tenant_id", tenant.id)
    .order("occurred_date", { ascending: false });

  const rows = (data ?? []) as ActivityRow[];

  // CSV エクスポート（所要・移動は分、費用は生の数値）
  const csvHeaders = [
    "日付", "種別", "内容", "所要時間(分)", "移動(分)", "費用", "成果", "次のアクション",
  ];
  const csvRows: (string | number | null)[][] = rows.map((r) => [
    r.occurred_date ? formatDate(r.occurred_date) : "",
    r.activity_type, r.content, r.duration_minutes, r.travel_minutes,
    r.cost, r.outcome, r.next_action,
  ]);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="FINANCE"
        title="活動ログ"
        description="商談・紹介依頼・会食などの活動記録。所要時間と費用から、右腕AI が活動コストパフォーマンスを判断する基盤。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={rows.length} label="件" tone="navy" />
            <CsvExportButton filename="activities" headers={csvHeaders} rows={csvRows} />
            <ActivityLogAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <FinanceNav slug={slug} />

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
            まだ活動が記録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「活動を記録」から、商談・面談・紹介依頼などの活動を残していきます。
          </p>
        </EditorialCard>
      )}

      {!error && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((r) => {
            const initial = {
              occurred_date: r.occurred_date,
              content: r.content ?? "",
              activity_type: r.activity_type ?? "",
              duration_minutes:
                r.duration_minutes === null ? "" : String(r.duration_minutes),
              travel_minutes:
                r.travel_minutes === null ? "" : String(r.travel_minutes),
              cost: r.cost === null ? "" : String(r.cost),
              outcome: r.outcome ?? "",
              next_action: r.next_action ?? "",
            };
            const label =
              r.content?.slice(0, 30) ||
              r.activity_type ||
              formatDate(r.occurred_date);
            return (
              <li key={r.id}>
                <EditorialCard variant="row" className="px-5 py-4 group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-gray-700 tabular-nums">
                          {formatDate(r.occurred_date)}
                        </span>
                        {r.activity_type && (
                          <span className="text-[11px] tracking-[0.15em] text-gray-500 uppercase">
                            {r.activity_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 tabular-nums">
                        {r.duration_minutes !== null && (
                          <span>所要 {formatMinutes(r.duration_minutes)}</span>
                        )}
                        {r.travel_minutes !== null && (
                          <span>移動 {formatMinutes(r.travel_minutes)}</span>
                        )}
                        {r.cost !== null && (
                          <span className="text-[#8a5a1c]">
                            {formatYen(r.cost)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActivityLogEditDialog
                          slug={slug}
                          tenantId={tenant.id}
                          activityId={r.id}
                          initial={initial}
                        />
                        <ActivityLogDeleteButton
                          slug={slug}
                          tenantId={tenant.id}
                          activityId={r.id}
                          label={label}
                        />
                      </div>
                    </div>
                  </div>

                  {r.content && (
                    <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap mt-2">
                      {r.content}
                    </p>
                  )}

                  <div className="space-y-1.5 mt-3 text-[12px]">
                    {r.outcome && (
                      <div>
                        <span className="text-gray-400 tracking-wider">結果: </span>
                        <span className="text-gray-700 whitespace-pre-wrap">
                          {r.outcome}
                        </span>
                      </div>
                    )}
                    {r.next_action && (
                      <div>
                        <span className="text-gray-400 tracking-wider">次: </span>
                        <span className="text-gray-700">{r.next_action}</span>
                      </div>
                    )}
                  </div>
                </EditorialCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
