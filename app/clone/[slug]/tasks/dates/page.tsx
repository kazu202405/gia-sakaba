// /clone/[slug]/tasks/dates ─ リマインドの「記念日・日付」タブ。
// データ: ai_clone_dated_reminder（migration 0044）。繰り返し（単発/毎年/毎月/節目）対応。
// 期限管理（やること）は同階層 /tasks。タブで切替。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDate } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  nextOccurrence,
  RECURRENCE_LABEL,
  type Recurrence,
} from "@/lib/ai-clone/dated-reminder";
import { ReminderTabs } from "../_components/ReminderTabs";
import { ReminderAddDialog } from "./_components/ReminderAddDialog";
import { DeleteReminderButton } from "./_components/DeleteReminderButton";

export const dynamic = "force-dynamic";

interface ReminderRow {
  id: string;
  title: string;
  base_date: string;
  recurrence: Recurrence;
  milestone_months: number[] | null;
  note: string | null;
}

function todayJST(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

function RecurrenceBadge({
  recurrence,
  months,
}: {
  recurrence: Recurrence;
  months: number[] | null;
}) {
  const label = RECURRENCE_LABEL[recurrence] ?? "—";
  const detail =
    recurrence === "milestone" && months && months.length > 0
      ? `（${months.map((m) => `${m}ヶ月`).join("・")}）`
      : "";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]">
      {label}
      {detail}
    </span>
  );
}

export default async function DatedRemindersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_clone_dated_reminder")
    .select("id, title, base_date, recurrence, milestone_months, note")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("base_date", { ascending: true });

  const today = todayJST();
  const rows = ((data ?? []) as ReminderRow[])
    .map((r) => ({
      ...r,
      next: nextOccurrence(
        r.base_date,
        r.recurrence,
        r.milestone_months ?? [],
        today,
      ),
    }))
    // 次回が近い順（次回なし＝終了は末尾）
    .sort((a, b) => {
      if (!a.next && !b.next) return 0;
      if (!a.next) return 1;
      if (!b.next) return -1;
      return a.next.localeCompare(b.next);
    });

  return (
    <div className="px-5 sm:px-6 py-6 space-y-5">
      <ReminderTabs slug={slug} active="dates" />

      <EditorialHeader
        eyebrow="REMINDER / DATES"
        title="日付管理"
        description="サービス開始◯ヶ月、誕生日・記念日など、日付で思い出したいもの。前夜に「明日その日が来ます」と通知します。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={rows.length} label="登録" tone="navy" />
            <ReminderAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

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
            登録はまだありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「日付を追加」から、サービス節目、誕生日・記念日などを登録します。
          </p>
        </EditorialCard>
      )}

      {!error && rows.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[2fr_0.8fr_1fr_1.4fr_0.4fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60">
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">タイトル</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">繰り返し</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">次回</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">メモ</span>
            <span></span>
          </div>

          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_0.8fr_1fr_1.4fr_0.4fr] gap-2 md:gap-4 px-5 py-3 items-center"
              >
                <div className="text-sm font-medium text-[#1c3550]">
                  {r.title}
                </div>
                <div>
                  <RecurrenceBadge
                    recurrence={r.recurrence}
                    months={r.milestone_months}
                  />
                </div>
                <div className="text-[12px] tabular-nums text-gray-600">
                  {r.next ? formatDate(r.next) : <span className="text-gray-300">終了</span>}
                </div>
                <div className="text-[13px] text-gray-600 truncate">
                  {r.note || <span className="text-gray-300">—</span>}
                </div>
                <div className="flex md:justify-end">
                  <DeleteReminderButton
                    slug={slug}
                    tenantId={tenant.id}
                    id={r.id}
                  />
                </div>
              </li>
            ))}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
