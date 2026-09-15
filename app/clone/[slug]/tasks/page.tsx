// /clone/[slug]/tasks ─ Memory / タスクの一覧 + 追加。
// チェックボックスで「完了 ⇄ 未着手」をワンクリック切替可能。
// それ以外のステータス変更（進行中・保留）と編集・削除・人物/案件紐付けは Phase 1 残。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDate } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { TaskAddDialog } from "./_components/TaskAddDialog";
import { TaskStatusToggle } from "./_components/TaskStatusToggle";
import { TaskRow } from "./_components/TaskRow";
import { TaskFilterBar } from "./_components/TaskFilterBar";
import { SortableTableHeader } from "@/components/nav/SortableTableHeader";
import { CsvExportButton } from "../_components/CsvExportButton";
import { ReminderTabs } from "./_components/ReminderTabs";

export const dynamic = "force-dynamic";

interface TaskRow {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  purpose: string | null;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<
    string,
    { bg: string; border: string; text: string; dotBg: string }
  > = {
    未着手: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", dotBg: "bg-gray-400" },
    進行中: { bg: "bg-[#f1f4f7]", border: "border-[#d6dde5]", text: "text-[#1c3550]", dotBg: "bg-[#1c3550]" },
    完了: { bg: "bg-[#e9efe9]", border: "border-[#c5d3c8]", text: "text-[#3d6651]", dotBg: "bg-[#3d6651]" },
    保留: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]", dotBg: "bg-[#c08a3e]" },
  };
  const s = styles[status] ?? styles["未着手"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotBg}`} />
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    高: { bg: "bg-[#f3e9e6]", border: "border-[#d8c4be]", text: "text-[#8a4538]" },
    中: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]" },
    低: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500" },
  };
  const s = styles[priority] ?? styles["低"];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${s.bg} ${s.border} ${s.text}`}
    >
      {priority}
    </span>
  );
}

// 期限が今日以前で未完了なら警告色
function isOverdue(due: string | null, status: string | null): boolean {
  if (!due) return false;
  if (status === "完了") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  return d.getTime() < today.getTime();
}

// 期限フィルタ：range キーから due_date 上限の "YYYY-MM-DD" を返す。
function sanitizeForOr(s: string): string {
  return s.replace(/[,()]/g, "").trim();
}

function parseCsvParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw[0] : raw;
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function todayDateStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// 優先度の表示順（数値が小さいほど上位）
const PRIORITY_ORDER: Record<string, number> = {
  高: 0,
  中: 1,
  低: 2,
};

export default async function TasksPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = sanitizeForOr((sp.q ?? "").toString());
  const statuses = parseCsvParam(sp.status);
  const priorities = parseCsvParam(sp.priority);
  const dueFromRaw = (sp.due_from ?? "").toString();
  const dueToRaw = (sp.due_to ?? "").toString();
  const dueFrom = isValidDateStr(dueFromRaw) ? dueFromRaw : "";
  const dueTo = isValidDateStr(dueToRaw) ? dueToRaw : "";
  const overdueOnly = sp.overdue === "1";
  // 既定は期限近い順。ヘッダークリックで上書きされる。
  const sort = (sp.sort ?? "due_date_asc").toString();

  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  let mainQuery = supabase
    .from("ai_clone_task")
    .select("id, name, status, priority, due_date, purpose, created_at")
    .eq("tenant_id", tenant.id);

  if (statuses.length > 0) mainQuery = mainQuery.in("status", statuses);
  if (priorities.length > 0) mainQuery = mainQuery.in("priority", priorities);
  if (q) {
    mainQuery = mainQuery.or(`name.ilike.%${q}%,purpose.ilike.%${q}%`);
  }
  if (dueFrom) mainQuery = mainQuery.gte("due_date", dueFrom);
  if (dueTo) mainQuery = mainQuery.lte("due_date", dueTo);
  if (overdueOnly) {
    mainQuery = mainQuery.lt("due_date", todayDateStr()).neq("status", "完了");
  }

  // ソート（SortableTableHeader と完全連動）
  // field 候補：name / status / priority / due_date / created_at
  // priority は client-side で「高→中→低」の独自順に並べ替える。
  const [sortField, sortDir] = sort.split("_") as [string, "asc" | "desc"];
  const ascending = sortDir === "asc";
  if (sortField === "name" || sortField === "status" || sortField === "due_date" || sortField === "created_at") {
    mainQuery = mainQuery.order(sortField, { ascending, nullsFirst: false });
  } else if (sortField === "priority") {
    // 一旦 due_date asc で並べてから、下で client-side に priority 優先で再ソート
    mainQuery = mainQuery.order("due_date", { ascending: true, nullsFirst: false });
  } else {
    mainQuery = mainQuery.order("due_date", { ascending: true, nullsFirst: false });
  }

  const [logsRes, totalRes] = await Promise.all([
    mainQuery,
    supabase
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
  ]);
  const { data, error } = logsRes;
  const totalCount = totalRes.count ?? 0;
  const hasActiveFilter =
    q.length > 0 || statuses.length > 0 || priorities.length > 0
    || dueFrom !== "" || dueTo !== "" || overdueOnly;

  // クライアント側ソート：
  //   1) sort=priority_asc の時は priority 順を最優先（高→中→低→null）
  //   2) いずれの sort でも「完了」は最後尾に寄せる
  let tasks = ((data ?? []) as TaskRow[]).slice();
  if (sortField === "priority") {
    const sign = ascending ? 1 : -1;
    tasks.sort((a, b) => {
      const ap = PRIORITY_ORDER[a.priority ?? ""] ?? 99;
      const bp = PRIORITY_ORDER[b.priority ?? ""] ?? 99;
      return (ap - bp) * sign;
    });
  }
  tasks = tasks.sort((a, b) => {
    const aDone = a.status === "完了" ? 1 : 0;
    const bDone = b.status === "完了" ? 1 : 0;
    return aDone - bDone;
  });

  const openCount = tasks.filter((t) => t.status !== "完了").length;

  // CSV エクスポート（現在のフィルタ結果をそのまま出力）
  const csvHeaders = ["タスク名", "状態", "優先度", "期限", "目的"];
  const csvRows: (string | number | null)[][] = tasks.map((t) => [
    t.name, t.status, t.priority,
    t.due_date ? formatDate(t.due_date) : "",
    t.purpose,
  ]);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <ReminderTabs slug={slug} active="tasks" />

      <EditorialHeader
        eyebrow="REMINDER / DEADLINE"
        title="期限管理"
        description="期限のある作業。優先度・期限・目的を一目で。チェックで完了 ⇄ 未着手 を切り替え可能。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={openCount} label="未完了" tone="navy" />
            <CsvExportButton filename="tasks" headers={csvHeaders} rows={csvRows} />
            <TaskAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      {totalCount > 0 && (
        <TaskFilterBar
          filteredCount={tasks.length}
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

      {!error && tasks.length === 0 && !hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            タスクはまだありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「タスクを追加」から、期限・優先度のある作業を入れていきます。
          </p>
        </EditorialCard>
      )}

      {!error && tasks.length === 0 && hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            条件に一致するタスクはありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            検索キーワードやフィルタを見直してみてください。
            <br />
            上部「フィルタ解除」で全件表示に戻せます。
          </p>
        </EditorialCard>
      )}

      {!error && tasks.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[24px_2fr_0.7fr_0.5fr_0.8fr_1.2fr_0.4fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60">
            <span></span>
            <SortableTableHeader field="name" defaultDir="asc" label="タスク名" />
            <SortableTableHeader field="status" defaultDir="asc" label="状態" />
            <SortableTableHeader field="priority" defaultDir="asc" label="優先" />
            <SortableTableHeader field="due_date" defaultDir="asc" label="期限" />
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">目的</span>
            <span></span>
          </div>

          <ul className="divide-y divide-gray-100">
            {tasks.map((t) => {
              const done = t.status === "完了";
              const overdue = isOverdue(t.due_date, t.status);
              const initial = {
                name: t.name,
                status: t.status ?? "未着手",
                priority: t.priority ?? "",
                due_date: t.due_date ?? "",
                purpose: t.purpose ?? "",
                origin_log: "",
              };
              return (
                <li key={t.id}>
                  <TaskRow
                    slug={slug}
                    tenantId={tenant.id}
                    taskId={t.id}
                    initial={initial}
                    deleteLabel={t.name}
                    gridCols="md:grid-cols-[24px_2fr_0.7fr_0.5fr_0.8fr_1.2fr_0.4fr]"
                  >
                    <div className="flex md:block items-center">
                      <TaskStatusToggle
                        slug={slug}
                        tenantId={tenant.id}
                        taskId={t.id}
                        status={t.status}
                      />
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        done
                          ? "text-gray-400 line-through"
                          : "text-[#1c3550]"
                      }`}
                    >
                      {t.name}
                    </div>
                    <div className="mt-1 md:mt-0">
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-1 md:mt-0">
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div
                      className={`text-[12px] mt-1 md:mt-0 tabular-nums ${
                        overdue ? "text-[#8a4538] font-bold" : "text-gray-500"
                      }`}
                    >
                      {t.due_date ? formatDate(t.due_date) : "—"}
                    </div>
                    <div
                      className={`text-[13px] mt-1 md:mt-0 truncate ${
                        done ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {t.purpose || <span className="text-gray-300">—</span>}
                    </div>
                  </TaskRow>
                </li>
              );
            })}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
