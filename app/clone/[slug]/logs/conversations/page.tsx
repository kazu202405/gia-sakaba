// /clone/[slug]/logs/conversations ─ Memory / 会話ログの一覧 + 追加。
// 詳細・編集・削除は Phase 1 残（Hub と同パターンで後追い実装可能）。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ConversationAddDialog } from "./_components/ConversationAddDialog";
import { ConversationRow } from "./_components/ConversationRow";
import { ConversationFilterBar } from "./_components/ConversationFilterBar";
import { SortableTableHeader } from "@/components/nav/SortableTableHeader";
import { CsvExportButton } from "../../_components/CsvExportButton";

export const dynamic = "force-dynamic";

interface ConversationRow {
  id: string;
  occurred_at: string;
  channel: string | null;
  summary: string | null;
  content: string | null;
  importance: string | null;
  next_action: string | null;
  usage_tags: string[] | null;
}

function ImportanceBadge({ importance }: { importance: string | null }) {
  if (!importance) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<
    string,
    { bg: string; border: string; text: string; dotBg: string }
  > = {
    S: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]", dotBg: "bg-[#c08a3e]" },
    A: { bg: "bg-[#f1f4f7]", border: "border-[#d6dde5]", text: "text-[#1c3550]", dotBg: "bg-[#1c3550]" },
    B: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", dotBg: "bg-gray-400" },
    C: { bg: "bg-gray-50", border: "border-gray-100", text: "text-gray-400", dotBg: "bg-gray-300" },
  };
  const s = styles[importance] ?? styles.B;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotBg}`} />
      {importance}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return <span className="text-[11px] text-gray-300">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-700 bg-gray-100 border border-gray-200">
      {channel}
    </span>
  );
}

// 一覧での要約表示。summary があれば優先、なければ content の最初の1行抜粋
function excerpt(
  summary: string | null,
  content: string | null,
  max = 90,
): string | null {
  const src = (summary?.trim() || content?.trim() || "").split(/\r?\n/)[0];
  if (!src) return null;
  return src.length > max ? `${src.slice(0, max)}…` : src;
}

// .or() に流すための簡易エスケープ。Supabase の or 構文では , と () が予約。
function sanitizeForOr(s: string): string {
  return s.replace(/[,()]/g, "").trim();
}

// "YYYY-MM-DD" 形式かを軽くチェック（不正値は無視する）
function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// カンマ区切り URL param を配列にパース。
function parseCsvParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw[0] : raw;
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function ConversationsPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = sanitizeForOr((sp.q ?? "").toString());
  const channels = parseCsvParam(sp.channel);
  const importances = parseCsvParam(sp.importance);
  const personId = (sp.person ?? "").toString();
  const dateFromRaw = (sp.date_from ?? "").toString();
  const dateToRaw = (sp.date_to ?? "").toString();
  const dateFrom = isValidDateStr(dateFromRaw) ? dateFromRaw : "";
  const dateTo = isValidDateStr(dateToRaw) ? dateToRaw : "";
  // 既定は新しい順。ヘッダークリックで上書きされる。
  const sort = (sp.sort ?? "occurred_at_desc").toString();

  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  // person フィルタが指定されていれば、まず該当 conversation_id を引く。
  // ai_clone_person 経由で tenant_id 縛りも兼ねる（不正な person_id を弾く）。
  let personFilteredIds: string[] | null = null;
  if (personId) {
    const linkRes = await supabase
      .from("ai_clone_person_conversation_logs")
      .select("conversation_log_id, ai_clone_person!inner(tenant_id)")
      .eq("person_id", personId)
      .eq("ai_clone_person.tenant_id", tenant.id);
    personFilteredIds = (linkRes.data ?? []).map(
      (r: { conversation_log_id: string }) => r.conversation_log_id,
    );
  }

  // メインクエリ：条件を順次積む
  let mainQuery = supabase
    .from("ai_clone_conversation_log")
    .select(
      "id, occurred_at, channel, summary, content, importance, next_action, usage_tags",
    )
    .eq("tenant_id", tenant.id);

  if (channels.length > 0) mainQuery = mainQuery.in("channel", channels);
  if (importances.length > 0) mainQuery = mainQuery.in("importance", importances);
  // 日付範囲：from は当日 00:00 から、to は翌日 00:00 まで（to を含む）
  if (dateFrom) {
    mainQuery = mainQuery.gte("occurred_at", `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    // 末尾を翌日 00:00 にして to 当日を「含む」扱いに
    const next = new Date(`${dateTo}T00:00:00`);
    next.setDate(next.getDate() + 1);
    const ny = next.getFullYear();
    const nm = String(next.getMonth() + 1).padStart(2, "0");
    const nd = String(next.getDate()).padStart(2, "0");
    mainQuery = mainQuery.lt("occurred_at", `${ny}-${nm}-${nd}T00:00:00`);
  }
  if (personFilteredIds !== null) {
    if (personFilteredIds.length === 0) {
      // この人物に紐づく会話が0件 → 必ず 0 件にする
      mainQuery = mainQuery.eq(
        "id", "00000000-0000-0000-0000-000000000000",
      );
    } else {
      mainQuery = mainQuery.in("id", personFilteredIds);
    }
  }
  if (q) {
    mainQuery = mainQuery.or(
      `summary.ilike.%${q}%,content.ilike.%${q}%,next_action.ilike.%${q}%`,
    );
  }

  // sort: <field>_<dir>。SortableTableHeader と完全連動。
  // 既定は occurred_at_desc（新しい順）。
  const [sortField, sortDir] = sort.split("_") as [string, "asc" | "desc"];
  const ascending = sortDir === "asc";
  if (sortField === "channel" || sortField === "importance" || sortField === "occurred_at") {
    mainQuery = mainQuery.order(sortField, { ascending, nullsFirst: false });
    // importance/channel をソートキーにした場合、同値内は新しい順で補助ソート
    if (sortField !== "occurred_at") {
      mainQuery = mainQuery.order("occurred_at", { ascending: false });
    }
  } else {
    mainQuery = mainQuery.order("occurred_at", { ascending: false });
  }

  const [logsRes, totalRes, peopleRes, linkRes] = await Promise.all([
    mainQuery,
    supabase
      .from("ai_clone_conversation_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
    supabase
      .from("ai_clone_person")
      .select("id, name, company_name, position")
      .eq("tenant_id", tenant.id)
      .order("name", { ascending: true }),
    // 既存の会話 ⇄ 人物リンクを一括取得し、conversation_id でグルーピングする
    supabase
      .from("ai_clone_person_conversation_logs")
      .select("conversation_log_id, person_id, ai_clone_person!inner(tenant_id)")
      .eq("ai_clone_person.tenant_id", tenant.id),
  ]);

  const { data, error } = logsRes;
  const logs = (data ?? []) as ConversationRow[];
  const totalCount = totalRes.count ?? 0;
  const hasActiveFilter =
    q.length > 0 || channels.length > 0 || importances.length > 0
    || personId !== "" || dateFrom !== "" || dateTo !== "";

  const peopleCandidates = (peopleRes.data ?? []).map(
    (p: { id: string; name: string; company_name: string | null; position: string | null }) => ({
      id: p.id,
      label: p.name,
      sublabel: [p.company_name, p.position].filter(Boolean).join(" / ") || null,
    }),
  );

  // conversation_id → person_id[] のマップ
  const linksByConversation = new Map<string, string[]>();
  for (const row of (linkRes.data ?? []) as Array<{
    conversation_log_id: string;
    person_id: string;
  }>) {
    const arr = linksByConversation.get(row.conversation_log_id) ?? [];
    arr.push(row.person_id);
    linksByConversation.set(row.conversation_log_id, arr);
  }

  // person_id → 名前（CSV の関連人物列用）
  const personNameById = new Map<string, string>();
  for (const p of (peopleRes.data ?? []) as Array<{ id: string; name: string }>) {
    personNameById.set(p.id, p.name);
  }

  // CSV エクスポート（現在のフィルタ結果。内容は全文、関連人物は「/」連結）
  const csvHeaders = [
    "日時", "チャンネル", "要約", "内容", "重要度", "次のアクション", "用途タグ", "関連人物",
  ];
  const csvRows: (string | number | null)[][] = logs.map((l) => {
    const personNames = (linksByConversation.get(l.id) ?? [])
      .map((pid) => personNameById.get(pid) ?? "")
      .filter(Boolean)
      .join(" / ");
    return [
      l.occurred_at ? formatDateTime(l.occurred_at) : "",
      l.channel, l.summary, l.content, l.importance, l.next_action,
      l.usage_tags ? l.usage_tags.join(" / ") : "",
      personNames,
    ];
  });

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="MEMORY / LOGS"
        title="会話・活動ログ"
        description="商談・面談・電話・LINE の記録。右腕AI が「過去の言質」を引用するためのソース。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={totalCount} label="記録済み" tone="navy" />
            <CsvExportButton filename="conversations" headers={csvHeaders} rows={csvRows} />
            <ConversationAddDialog
              slug={slug}
              tenantId={tenant.id}
              peopleCandidates={peopleCandidates}
            />
          </div>
        }
      />

      {/* 検索＋フィルタバー（テナント内に記録がある時だけ表示） */}
      {totalCount > 0 && (
        <ConversationFilterBar
          peopleCandidates={peopleCandidates}
          filteredCount={logs.length}
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

      {!error && logs.length === 0 && !hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ会話が記録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「会話を記録」から、商談・電話・LINE のやり取りを記録していきます。
            <br />
            日時と要約だけでもOK。タグ・次アクションは後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!error && logs.length === 0 && hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            条件に一致する会話はありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            検索キーワードやフィルタを見直してみてください。
            <br />
            上部「フィルタ解除」で全件表示に戻せます。
          </p>
        </EditorialCard>
      )}

      {!error && logs.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.1fr_0.7fr_0.9fr_2fr_0.5fr_1.1fr_0.4fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60">
            <SortableTableHeader field="occurred_at" defaultDir="desc" label="日時" />
            <SortableTableHeader field="channel" defaultDir="asc" label="チャンネル" />
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">関連人物</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">要約</span>
            <SortableTableHeader field="importance" defaultDir="asc" label="重要度" />
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">次のアクション</span>
            <span></span>
          </div>

          <ul className="divide-y divide-gray-100">
            {logs.map((l) => {
              // Edit ダイアログに渡す初期値
              const initial = {
                occurred_at: l.occurred_at
                  ? new Date(l.occurred_at).toISOString().slice(0, 16)
                  : "",
                channel: l.channel ?? "",
                content: l.content ?? "",
                summary: l.summary ?? "",
                usage_tags: l.usage_tags ? l.usage_tags.join(", ") : "",
                importance: l.importance ?? "",
                next_action: l.next_action ?? "",
                person_ids: linksByConversation.get(l.id) ?? [],
              };
              const label =
                l.summary?.slice(0, 30) ||
                l.content?.slice(0, 30) ||
                formatDateTime(l.occurred_at);
              const rowPersonNames = (linksByConversation.get(l.id) ?? [])
                .map((pid) => personNameById.get(pid))
                .filter((n): n is string => !!n);
              return (
                <li key={l.id}>
                  <ConversationRow
                    slug={slug}
                    tenantId={tenant.id}
                    conversationId={l.id}
                    initial={initial}
                    peopleCandidates={peopleCandidates}
                    deleteLabel={label}
                    occurredLabel={formatDateTime(l.occurred_at)}
                    gridCols="md:grid-cols-[1.1fr_0.7fr_0.9fr_2fr_0.5fr_1.1fr_0.4fr]"
                  >
                    <div className="hidden md:block text-[12px] text-gray-700 tabular-nums">
                      {formatDateTime(l.occurred_at)}
                    </div>
                    <div className="shrink-0 md:mt-0">
                      <ChannelBadge channel={l.channel} />
                    </div>
                    <div className="hidden md:block text-[12px] text-gray-700 truncate">
                      {rowPersonNames.length > 0 ? (
                        rowPersonNames.join("、")
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 truncate md:overflow-visible md:whitespace-normal text-[13px] text-gray-800 md:mt-0 leading-relaxed">
                      {excerpt(l.summary, l.content) || (
                        <span className="text-gray-300">—</span>
                      )}
                      {l.usage_tags && l.usage_tags.length > 0 && (
                        <div className="hidden md:flex flex-wrap gap-1 mt-1.5">
                          {l.usage_tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-gray-500 bg-white border border-gray-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="hidden md:block">
                      <ImportanceBadge importance={l.importance} />
                    </div>
                    <div className="hidden md:block text-[13px] text-gray-600 truncate">
                      {l.next_action || (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </ConversationRow>
                </li>
              );
            })}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
