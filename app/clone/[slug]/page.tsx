// /clone/[slug] ─ AI Clone のテナント別ダッシュボード。
// 各テーブルから count + 要対応項目を集計し、「今この瞬間の状態」を1画面に。

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Flame,
  Handshake,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDate, formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { CoreOsMeter, type CoreOsSectionStatus } from "./_components/CoreOsMeter";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "./_components/OnboardingChecklist";

export const dynamic = "force-dynamic";

// Core OS 充足度メーター用：7セクションの記入有無を測る対象テーブル。
const CORE_OS_SECTIONS = [
  { key: "mission", table: "ai_clone_mission", label: "ミッション理念" },
  { key: "three-year-plan", table: "ai_clone_three_year_plan", label: "3年計画" },
  { key: "annual-kpi", table: "ai_clone_annual_kpi", label: "今年のKPI" },
  { key: "decision-principles", table: "ai_clone_decision_principle", label: "判断基準" },
  { key: "tone-rules", table: "ai_clone_tone_rule", label: "口調ルール" },
  { key: "ng-rules", table: "ai_clone_ng_rule", label: "NGルール" },
  { key: "faq", table: "ai_clone_faq", label: "FAQ" },
] as const;

function formatYen(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

// 今月の YYYY-MM プレフィクス
function monthPrefix(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 今月の開始日と翌月開始日（YYYY-MM-DD）。created_at/occurred_at の範囲フィルタ用。
function monthRange(): { start: string; nextStart: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-indexed
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const ny = m === 11 ? y + 1 : y;
  const nm = m === 11 ? 0 : m + 1;
  const nextStart = `${ny}-${String(nm + 1).padStart(2, "0")}-01`;
  return { start, nextStart };
}

// 今日の YYYY-MM-DD（期限切れ判定の境界）
function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// n 日前の YYYY-MM-DD（ご無沙汰判定の境界）
function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

interface RecentDecisionRow {
  id: string;
  occurred_at: string;
  theme: string | null;
  conclusion: string | null;
  promote_to_core_os: boolean | null;
}

interface RecentConversationRow {
  id: string;
  occurred_at: string;
  channel: string | null;
  summary: string | null;
  content: string | null;
}

interface RecentTaskRow {
  id: string;
  name: string;
  due_date: string | null;
  priority: string | null;
}

// KPI ブロック（数値強調）
function MetricBlock({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "navy" | "gold" | "alert";
}) {
  const valueColor =
    tone === "navy"
      ? "text-[#1c3550]"
      : tone === "gold"
        ? "text-[#8a5a1c]"
        : tone === "alert"
          ? "text-[#8a4538]"
          : "text-gray-800";

  const inner = (
    <div className="px-4 py-3 border border-gray-200 rounded-md bg-white hover:border-gray-300 transition-colors h-full">
      <p className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-1">
        {label}
      </p>
      <p className={`font-serif text-xl font-bold tabular-nums ${valueColor}`}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

// 件数だけのコンパクトな行
function CountRow({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors group"
    >
      <span className="text-sm text-gray-700">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-serif text-base font-bold text-[#1c3550] tabular-nums">
          {count}
        </span>
        <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600 transition-colors" />
      </span>
    </Link>
  );
}

export default async function CloneDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant, role, userId } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const tenantId = tenant.id;
  const today = todayISO();
  const ym = monthPrefix();
  const { start: monthStart, nextStart: monthNextStart } = monthRange();
  const staleBefore = daysAgoISO(30); // ご無沙汰判定の境界（30日前）

  // ────────────────────────────────────────────
  // 並列で集計クエリを発行（Server Component の利点）
  // ────────────────────────────────────────────
  const countOpts = { count: "exact" as const, head: true };

  const [
    personCount,
    projectCount,
    serviceCount,
    conversationCount,
    personNoteCount,
    progressLogCount,
    // activityLogCount, // 一旦コメントアウト（下のクエリ・カードと一緒に戻す）
    decisionLogCount,
    knowledgeCount,
    // expenseCount, // 一旦コメントアウト
    // revenueCount, // 一旦コメントアウト
    missionCount,
    threeYearPlanCount,
    annualKpiCount,
    principleCount,
    toneRuleCount,
    ngRuleCount,
    faqCount,
    overdueTaskCount,
    openTaskCount,
    promoteCandidateCount,
    unreviewedKnowledgeCount,
    needsFinalCheckFaqCount,
    pendingDecisionProgressCount,
    monthRevenueRows,
    monthExpenseRows,
    recentDecisions,
    recentConversations,
    nearestTasks,
    newPeopleCount,
    relationshipKpis,
  ] = await Promise.all([
    supabase.from("ai_clone_person").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_project").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_service").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_conversation_log").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_person_note").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_project_progress_log").select("id", countOpts).eq("tenant_id", tenantId),
    // supabase.from("ai_clone_activity_log").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_decision_log").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_knowledge_candidate").select("id", countOpts).eq("tenant_id", tenantId),
    // supabase.from("ai_clone_expense").select("id", countOpts).eq("tenant_id", tenantId),
    // supabase.from("ai_clone_revenue").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_mission").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_three_year_plan").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_annual_kpi").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_decision_principle").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_tone_rule").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_ng_rule").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_faq").select("id", countOpts).eq("tenant_id", tenantId),
    // 期限切れ未完了タスク
    supabase
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .neq("status", "完了")
      .lt("due_date", today)
      .not("due_date", "is", null),
    // 未完了タスク（未着手 or 進行中）
    supabase
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["未着手", "進行中"]),
    // Core OS 昇格候補（判断履歴）
    supabase
      .from("ai_clone_decision_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("promote_to_core_os", true),
    // 未確認のナレッジ候補
    supabase
      .from("ai_clone_knowledge_candidate")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("review_status", "未確認"),
    // 要最終確認の FAQ
    supabase
      .from("ai_clone_faq")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("requires_final_check", true),
    // 判断待ちが入っている進捗ログ
    supabase
      .from("ai_clone_project_progress_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("needs_decision", "is", null),
    // 今月の売上行（合計を JS 側で計算）
    supabase
      .from("ai_clone_revenue")
      .select("amount, payment_status, occurred_date")
      .eq("tenant_id", tenantId)
      .gte("occurred_date", `${ym}-01`)
      .lte("occurred_date", `${ym}-31`),
    // 今月の経費行（合計を JS 側で計算）
    supabase
      .from("ai_clone_expense")
      .select("amount, occurred_date")
      .eq("tenant_id", tenantId)
      .gte("occurred_date", `${ym}-01`)
      .lte("occurred_date", `${ym}-31`),
    // 最近の判断（5件）
    supabase
      .from("ai_clone_decision_log")
      .select("id, occurred_at, theme, conclusion, promote_to_core_os")
      .eq("tenant_id", tenantId)
      .order("occurred_at", { ascending: false })
      .limit(5),
    // 最近の会話（5件）
    supabase
      .from("ai_clone_conversation_log")
      .select("id, occurred_at, channel, summary, content")
      .eq("tenant_id", tenantId)
      .order("occurred_at", { ascending: false })
      .limit(5),
    // 期限が近い未完了タスク（5件、due_date asc、null は除外）
    supabase
      .from("ai_clone_task")
      .select("id, name, due_date, priority")
      .eq("tenant_id", tenantId)
      .neq("status", "完了")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(5),
    // 今月 出会った人（新規登録。created_at が今月）
    supabase
      .from("ai_clone_person")
      .select("id", countOpts)
      .eq("tenant_id", tenantId)
      .gte("created_at", monthStart)
      .lt("created_at", monthNextStart),
    // 連絡した人（今月実人数）＋ ご無沙汰の重要人物 は DB 側で集計（1000行上限の影響を回避）
    supabase.rpc("ai_clone_relationship_kpis", {
      p_tenant_id: tenantId,
      p_month_start: monthStart,
      p_month_next: monthNextStart,
      p_stale_before: staleBefore,
    }),
  ]);

  // 今月集計
  const monthRevenue = (monthRevenueRows.data ?? []) as Array<{
    amount: number;
    payment_status: string | null;
  }>;
  const monthRevenueTotal = monthRevenue.reduce(
    (acc, r) => acc + (r.amount ?? 0),
    0,
  );
  const monthRevenueUnpaid = monthRevenue
    .filter((r) => r.payment_status !== "入金済")
    .reduce((acc, r) => acc + (r.amount ?? 0), 0);

  const decisions = (recentDecisions.data ?? []) as RecentDecisionRow[];
  const conversations = (recentConversations.data ?? []) as RecentConversationRow[];
  const tasksNearest = (nearestTasks.data ?? []) as RecentTaskRow[];

  // 人脈KPI（DB 側集計の結果を取り出す）。returns table なので配列の先頭行。
  const kpiRow = (relationshipKpis.data ?? [])[0] as
    | { contacted_this_month: number; stale_vip: number }
    | undefined;
  const contactedThisMonth = kpiRow?.contacted_this_month ?? 0;
  const staleVipCount = kpiRow?.stale_vip ?? 0;

  // 紹介の動き（今月）。頼んだ/与えた=活動ログ(activity_type)、生まれた=紹介元つきの新規人物。
  // 紹介コーチの考え方「紹介＝頼んだ数×与えた数」をダッシュボードで可視化（DB側 count で集計）。
  const [referralAskedRes, referralGaveRes, referralBornRes] = await Promise.all([
    supabase
      .from("ai_clone_activity_log")
      .select("id", countOpts)
      .eq("tenant_id", tenantId)
      .eq("activity_type", "紹介依頼")
      .gte("occurred_date", monthStart)
      .lt("occurred_date", monthNextStart),
    supabase
      .from("ai_clone_activity_log")
      .select("id", countOpts)
      .eq("tenant_id", tenantId)
      .eq("activity_type", "紹介実施")
      .gte("occurred_date", monthStart)
      .lt("occurred_date", monthNextStart),
    supabase
      .from("ai_clone_person")
      .select("id", countOpts)
      .eq("tenant_id", tenantId)
      .not("referred_by_person_id", "is", null)
      .gte("created_at", monthStart)
      .lt("created_at", monthNextStart),
  ]);
  const referralAsked = referralAskedRes.count ?? 0;
  const referralGave = referralGaveRes.count ?? 0;
  const referralBorn = referralBornRes.count ?? 0;

  // 案件の概算売上（人数 × 単価）。人数は関連人物の数を自動カウント（手動 headcount 優先）。
  const { data: projEstData } = await supabase
    .from("ai_clone_project")
    .select("id, headcount, unit_price")
    .eq("tenant_id", tenantId);
  const projEstRows = (projEstData ?? []) as Array<{
    id: string;
    headcount: number | null;
    unit_price: number | null;
  }>;
  const projLinkedCount = new Map<string, number>();
  if (projEstRows.length > 0) {
    const { data: projLinkRows } = await supabase
      .from("ai_clone_person_projects")
      .select("project_id")
      .in(
        "project_id",
        projEstRows.map((p) => p.id),
      );
    for (const r of (projLinkRows ?? []) as { project_id: string }[]) {
      projLinkedCount.set(
        r.project_id,
        (projLinkedCount.get(r.project_id) ?? 0) + 1,
      );
    }
  }
  const projectEstimateTotal = projEstRows.reduce(
    (s, p) =>
      s + (p.headcount ?? projLinkedCount.get(p.id) ?? 0) * (p.unit_price ?? 0),
    0,
  );

  // Core OS 充足度（7セクションの記入有無を head count で測る）
  const coreOsCountResults = await Promise.all(
    CORE_OS_SECTIONS.map((s) =>
      supabase
        .from(s.table)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id),
    ),
  );
  const coreOsSections: CoreOsSectionStatus[] = CORE_OS_SECTIONS.map(
    (s, i) => ({
      key: s.key,
      label: s.label,
      href: `/clone/${slug}/core-os/${s.key}`,
      filled: (coreOsCountResults[i].count ?? 0) > 0,
    }),
  );

  // 登録直後のオンボ：使い始めの3ステップ完了状態。
  // ① LINE/Slack 連携（自分の member 行に user_id があるか）
  // ② 最初の考え（Core OS が1つでも埋まっているか）
  // ③ 最初の1人（人物が1人でも登録されているか）
  const { data: onbMemberRow } = await supabase
    .from("ai_clone_tenant_members")
    .select("slack_user_id, line_user_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", userId)
    .maybeSingle();
  const channelLinked = Boolean(
    onbMemberRow?.slack_user_id || onbMemberRow?.line_user_id,
  );
  const coreOsFilledCount = coreOsSections.filter((s) => s.filled).length;
  const onboardingSteps: OnboardingStep[] = [
    {
      key: "link",
      label: "LINE か Slack をつなぐ",
      hint: "つなぐと、普段のトークから話しかけるだけで記録できます。",
      href: `/clone/${slug}/settings`,
      done: channelLinked,
    },
    {
      key: "core-os",
      label: "あなたの考えを入れる",
      hint: "理念や判断基準を1つ入れると、右腕AIがあなたらしく考えはじめます。",
      href: `/clone/${slug}/core-os/mission`,
      done: coreOsFilledCount > 0,
    },
    {
      key: "first-person",
      label: "最初の1人を記録する",
      hint: "大事な相手を1人入れると、人脈と紹介の動きが見えはじめます。",
      href: `/clone/${slug}/people`,
      done: (personCount.count ?? 0) > 0,
    },
  ];
  const onboardingDone = onboardingSteps.every((s) => s.done);

  // 要対応の合計（emergency セクションのトリガ）
  const attentionTotal =
    (overdueTaskCount.count ?? 0) +
    (promoteCandidateCount.count ?? 0) +
    (unreviewedKnowledgeCount.count ?? 0) +
    (needsFinalCheckFaqCount.count ?? 0) +
    (pendingDecisionProgressCount.count ?? 0);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow={`右腕AI / ${tenant.slug.toUpperCase()}`}
        title="ダッシュボード"
        description="右腕AI が今日の判断材料として読みに行く、あなたの脳の最新スナップショット。各セクションへの入口はここから。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip
              count={openTaskCount.count ?? 0}
              label="未完了タスク"
              tone="navy"
            />
            {attentionTotal > 0 && (
              <MetricChip
                count={attentionTotal}
                label="要対応"
                tone="gold"
              />
            )}
          </div>
        }
      />

      {/* 登録直後のオンボ：使い始めの3ステップ（全部済むと自動で消える） */}
      {!onboardingDone && <OnboardingChecklist steps={onboardingSteps} />}

      {/* 右腕の完成度（Core OS 充足度メーター） */}
      <CoreOsMeter sections={coreOsSections} />

      {/* 人脈の先行指標（出会い・接触はフロー、ご無沙汰は健全さ） */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-[#1c3550]" />
          <h2 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
            人脈の動き
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricBlock
            label="出会った人"
            value={`${newPeopleCount.count ?? 0} 人`}
            hint={`今月（${ym}）の新規登録`}
            tone="navy"
            href={`/clone/${slug}/people`}
          />
          <MetricBlock
            label="連絡した人"
            value={`${contactedThisMonth} 人`}
            hint={`今月（${ym}）・会話/活動の実人数（重複なし）`}
            tone="navy"
            href={`/clone/${slug}/logs/conversations`}
          />
          <MetricBlock
            label="ご無沙汰の重要人物"
            value={`${staleVipCount} 人`}
            hint="重要度S/A・30日以上連絡なし"
            tone={staleVipCount > 0 ? "alert" : "default"}
            href={`/clone/${slug}/people?importance=S,A`}
          />
        </div>
      </section>

      {/* 紹介の動き（頼んだ×与えた＝紹介が生まれる手前の行動） */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Handshake className="w-4 h-4 text-[#1c3550]" />
          <h2 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
            紹介の動き
          </h2>
          <span className="text-[11px] text-gray-400 tabular-nums">{ym}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricBlock
            label="紹介を頼んだ"
            value={`${referralAsked} 回`}
            hint={`今月（${ym}）／紹介のお願い`}
            tone={referralAsked === 0 ? "alert" : "navy"}
            href={`/clone/${slug}/finance/activities`}
          />
          <MetricBlock
            label="紹介を与えた"
            value={`${referralGave} 回`}
            hint={`今月（${ym}）／自分が紹介した`}
            tone="navy"
            href={`/clone/${slug}/finance/activities`}
          />
          <MetricBlock
            label="生まれた紹介"
            value={`${referralBorn} 件`}
            hint="今月／紹介経由で増えた人"
            tone="gold"
            href={`/clone/${slug}/people`}
          />
        </div>
      </section>

      {/* 今月の数字 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[#1c3550]" />
          <h2 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
            今月の数字
          </h2>
          <span className="text-[11px] text-gray-400 tabular-nums">{ym}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricBlock
            label="案件の概算売上"
            value={formatYen(projectEstimateTotal)}
            hint="案件の 人数×単価 の合計"
            tone="navy"
            href={`/clone/${slug}/projects`}
          />
          <MetricBlock
            label="今月の売上"
            value={formatYen(monthRevenueTotal)}
            tone="navy"
            href={`/clone/${slug}/finance/revenue`}
          />
          <MetricBlock
            label="今月の未入金"
            value={formatYen(monthRevenueUnpaid)}
            tone="gold"
            href={`/clone/${slug}/finance/revenue`}
          />
        </div>
      </section>

      {/* 要対応 */}
      {attentionTotal > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-[#8a4538]" />
            <h2 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
              要対応
            </h2>
            <span className="text-[11px] text-gray-400">
              いま見直すべき項目
            </span>
          </div>
          <EditorialCard className="px-2 py-2">
            <div className="divide-y divide-gray-100">
              {(overdueTaskCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/tasks`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#8a4538]" />
                    <span className="text-sm text-gray-700">期限切れの未完了タスク</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a4538] tabular-nums">
                      {overdueTaskCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
              {(unreviewedKnowledgeCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/review/knowledge`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#fbf3e3] border border-[#e6d3a3]" />
                    <span className="text-sm text-gray-700">未確認のナレッジ候補</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a5a1c] tabular-nums">
                      {unreviewedKnowledgeCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
              {(promoteCandidateCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/review/decisions`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8a5a1c]" />
                    <span className="text-sm text-gray-700">Core OS 昇格候補の判断</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a5a1c] tabular-nums">
                      {promoteCandidateCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
              {(pendingDecisionProgressCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/projects`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#fbf3e3] text-[#8a5a1c] border border-[#e6d3a3]">
                      要判断
                    </span>
                    <span className="text-sm text-gray-700">案件進捗の判断待ち</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a5a1c] tabular-nums">
                      {pendingDecisionProgressCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
              {(needsFinalCheckFaqCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/core-os/faq`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#8a5a1c]" />
                    <span className="text-sm text-gray-700">最終確認が必要な FAQ</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a5a1c] tabular-nums">
                      {needsFinalCheckFaqCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
            </div>
          </EditorialCard>
        </section>
      )}

      {/* 件数サマリ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            Hub｜誰となに
          </h3>
          <div className="-mx-2">
            <CountRow
              label="人物"
              count={personCount.count ?? 0}
              href={`/clone/${slug}/people`}
            />
            <CountRow
              label="案件"
              count={projectCount.count ?? 0}
              href={`/clone/${slug}/projects`}
            />
            <CountRow
              label="サービス"
              count={serviceCount.count ?? 0}
              href={`/clone/${slug}/services`}
            />
          </div>
        </EditorialCard>

        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            Memory｜日々の蓄積
          </h3>
          <div className="-mx-2">
            <CountRow
              label="会話・活動ログ"
              count={conversationCount.count ?? 0}
              href={`/clone/${slug}/logs/conversations`}
            />
            <CountRow
              label="人物メモ"
              count={personNoteCount.count ?? 0}
              href={`/clone/${slug}/people`}
            />
            <CountRow
              label="案件進捗"
              count={progressLogCount.count ?? 0}
              href={`/clone/${slug}/projects`}
            />
            {/* 活動ログ・売上・経費 は一旦コメントアウト（サイドバー非表示に合わせる。
                使うなら上の destructure / クエリも一緒に戻す）
            <CountRow
              label="活動ログ"
              count={activityLogCount.count ?? 0}
              href={`/clone/${slug}/finance/activities`}
            />
            <CountRow
              label="売上"
              count={revenueCount.count ?? 0}
              href={`/clone/${slug}/finance/revenue`}
            />
            <CountRow
              label="経費"
              count={expenseCount.count ?? 0}
              href={`/clone/${slug}/finance/expenses`}
            />
            */}
            <CountRow
              label="判断履歴"
              count={decisionLogCount.count ?? 0}
              href={`/clone/${slug}/review/decisions`}
            />
            <CountRow
              label="ナレッジ候補"
              count={knowledgeCount.count ?? 0}
              href={`/clone/${slug}/review/knowledge`}
            />
          </div>
        </EditorialCard>

        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            Core OS｜判断軸
          </h3>
          <div className="-mx-2">
            <CountRow
              label="ミッション理念"
              count={missionCount.count ?? 0}
              href={`/clone/${slug}/core-os/mission`}
            />
            <CountRow
              label="3年計画"
              count={threeYearPlanCount.count ?? 0}
              href={`/clone/${slug}/core-os/three-year-plan`}
            />
            <CountRow
              label="今年のKPI"
              count={annualKpiCount.count ?? 0}
              href={`/clone/${slug}/core-os/annual-kpi`}
            />
            <CountRow
              label="判断基準"
              count={principleCount.count ?? 0}
              href={`/clone/${slug}/core-os/decision-principles`}
            />
            <CountRow
              label="口調ルール"
              count={toneRuleCount.count ?? 0}
              href={`/clone/${slug}/core-os/tone-rules`}
            />
            <CountRow
              label="NGルール"
              count={ngRuleCount.count ?? 0}
              href={`/clone/${slug}/core-os/ng-rules`}
            />
            <CountRow
              label="FAQ"
              count={faqCount.count ?? 0}
              href={`/clone/${slug}/core-os/faq`}
            />
          </div>
        </EditorialCard>
      </div>

      {/* 最近の活動 + 期限が近いタスク */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 直近の判断 */}
        <EditorialCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
              直近の判断
            </h3>
            <Link
              href={`/clone/${slug}/review/decisions`}
              className="text-[11px] text-gray-500 hover:text-[#1c3550]"
            >
              すべて →
            </Link>
          </div>
          {decisions.length === 0 ? (
            <p className="text-[12px] text-gray-400">まだ記録なし</p>
          ) : (
            <ul className="space-y-3">
              {decisions.map((d) => (
                <li key={d.id} className="text-[12px]">
                  <div className="flex items-center gap-2 text-gray-500 tabular-nums mb-0.5">
                    {formatDateTime(d.occurred_at)}
                    {d.promote_to_core_os && (
                      <Sparkles className="w-2.5 h-2.5 text-[#8a5a1c]" />
                    )}
                  </div>
                  <p className="text-[13px] text-[#1c3550] font-medium leading-snug">
                    {d.theme || (
                      <span className="text-gray-400">
                        {d.conclusion?.slice(0, 40) || "—"}
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </EditorialCard>

        {/* 直近の会話 */}
        <EditorialCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
              直近の会話
            </h3>
            <Link
              href={`/clone/${slug}/logs/conversations`}
              className="text-[11px] text-gray-500 hover:text-[#1c3550]"
            >
              すべて →
            </Link>
          </div>
          {conversations.length === 0 ? (
            <p className="text-[12px] text-gray-400">まだ記録なし</p>
          ) : (
            <ul className="space-y-3">
              {conversations.map((c) => {
                const summary = (c.summary || c.content || "").split(/\r?\n/)[0];
                const excerpt =
                  summary.length > 50 ? `${summary.slice(0, 50)}…` : summary;
                return (
                  <li key={c.id} className="text-[12px]">
                    <div className="flex items-center gap-2 text-gray-500 tabular-nums mb-0.5">
                      <span>{formatDateTime(c.occurred_at)}</span>
                      {c.channel && (
                        <span className="px-1 py-0.5 rounded text-[10px] text-gray-600 bg-gray-100">
                          {c.channel}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-gray-700 leading-snug">
                      {excerpt || <span className="text-gray-400">—</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </EditorialCard>

        {/* 期限が近いタスク */}
        <EditorialCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
              期限が近いタスク
            </h3>
            <Link
              href={`/clone/${slug}/tasks`}
              className="text-[11px] text-gray-500 hover:text-[#1c3550]"
            >
              すべて →
            </Link>
          </div>
          {tasksNearest.length === 0 ? (
            <p className="text-[12px] text-gray-400">期限つきの未完了タスクなし</p>
          ) : (
            <ul className="space-y-2.5">
              {tasksNearest.map((t) => {
                const overdue =
                  t.due_date !== null && t.due_date < today;
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 text-[12px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-[13px] text-[#1c3550] truncate">
                        {t.name}
                      </span>
                    </div>
                    <span
                      className={`tabular-nums flex-shrink-0 ${
                        overdue
                          ? "text-[#8a4538] font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      {t.due_date ? formatDate(t.due_date) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </EditorialCard>
      </div>

      {/* 最下部：tenant role 情報 */}
      <p className="text-[10px] tracking-[0.18em] text-gray-400 text-right">
        {tenant.name} ／ role: {role}
      </p>
    </div>
  );
}
