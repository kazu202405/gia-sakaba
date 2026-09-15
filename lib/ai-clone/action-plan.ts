// AI Clone「今日/明日 何したらいい？」のオンデマンド行動計画。
//
// 背景（project_ai_clone_ondemand_briefing_todo）:
//   夜の CRON 配信（morning-briefing.ts / Slack DM）だけが持っていた
//   「売上行動3件・記念日・期限到来・連絡文の下書き」の掘り起こしロジックを、
//   ユーザーが「今日(明日)何したらいい？」と聞いたときに reply で返せるよう
//   共有モジュール化したもの。
//   LINE は push（配信）のみ課金・reply（発話への返信）は無料無制限なので、
//   この経路に寄せれば通数を食わずに能動提案を出せる。
//
// 構成:
//   * 低レベルのデータ取得関数（売上行動 RPC / 記念日 / 期限タスク / 下書き）は
//     morning-briefing.ts と共有する（DRY）。夜配信はこれらを import して使う。
//   * buildActionPlan() は上記＋「約束未了」「今日片付ける1件」を束ねた
//     オンデマンド専用のオーケストレータ。read-tools の get_action_plan が呼ぶ。

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { occursOn, type Recurrence } from "./dated-reminder";
import {
  fetchRecentConversationLogsForPerson,
  fetchRecentNotesForPerson,
  searchConversationsForChat,
} from "./supabase-db";

// ===========================================================
// 型（morning-briefing と共有）
// ===========================================================

export type ActionRule =
  | "re_touch"
  | "promise_stale"
  | "stalled_deal"
  | "ask_referral";

export interface SalesActionRow {
  person_id: string;
  name: string;
  rule: ActionRule;
  days: number;
  reason: string;
}

// 売上行動に、その相手へ送る連絡メッセージの下書きを添えたもの。
export interface SalesActionWithDraft extends SalesActionRow {
  draft: string | null;
}

export interface DueAnniversary {
  title: string;
  note: string | null;
  milestoneMonth?: number;
}

export interface DueTask {
  id: string;
  name: string;
  due_date: string;
  priority: string | null;
}

// 各ルールが意図する「連絡の種類」。下書き生成プロンプトに渡す。
export const RULE_DRAFT_INTENT: Record<ActionRule, string> = {
  re_touch: "しばらく連絡できていない相手への、軽い近況うかがいの連絡",
  promise_stale: "以前にした約束を果たす（または前に進める）連絡",
  stalled_deal: "止まっている商談の、さりげない進捗確認の連絡",
  ask_referral: "受注後の相手への、自然な紹介のお願いの連絡",
};

// 売上行動の「やること」の言い回し（メッセージ整形用）。
export const RULE_VERB: Record<ActionRule, string> = {
  re_touch: "近況うかがいの連絡を",
  promise_stale: "約束を果たす連絡を",
  stalled_deal: "進捗確認の連絡を",
  ask_referral: "紹介のお願いを",
};

// ===========================================================
// Supabase service client（Cron / tool 経由は auth 文脈なし）
// ===========================================================

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[action-plan] SUPABASE service key 未設定");
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ===========================================================
// 低レベル取得（morning-briefing と共有）
// ===========================================================

// 売上行動の掘り起こし候補（RPC ai_clone_daily_sales_actions / migration 0043）。
//   ① re_touch 重要度S/A × 最終接触30日超 ② stalled_deal 商談済×受注未×14日超
//   ③ ask_referral 受注90日以内×紹介依頼未
export async function fetchSalesActions(
  tenantId: string,
  date: string,
): Promise<SalesActionRow[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("ai_clone_daily_sales_actions", {
    p_tenant_id: tenantId,
    p_today: date,
  });
  if (error) {
    console.error("[action-plan] 売上行動 RPC 失敗:", error.message);
    return [];
  }
  return (data ?? []) as SalesActionRow[];
}

// 3件を「ルール多様性優先」で選ぶ：各ルールから1件ずつ → 残り枠を days 降順で埋める。
export function selectTopThree(rows: SalesActionRow[]): SalesActionRow[] {
  const order: ActionRule[] = [
    "ask_referral",
    "promise_stale",
    "stalled_deal",
    "re_touch",
  ];
  const byRule: Record<ActionRule, SalesActionRow[]> = {
    ask_referral: [],
    promise_stale: [],
    stalled_deal: [],
    re_touch: [],
  };
  for (const r of rows) {
    if (byRule[r.rule]) byRule[r.rule].push(r);
  }
  const picked: SalesActionRow[] = [];
  for (const rule of order) {
    const first = byRule[rule].shift();
    if (first) picked.push(first);
  }
  const rest = order
    .flatMap((rule) => byRule[rule])
    .sort((a, b) => b.days - a.days);
  while (picked.length < 3 && rest.length > 0) {
    picked.push(rest.shift()!);
  }
  return picked.slice(0, 3);
}

// 1件の売上行動について、その相手の過去ログ・備考・約束を読んで送信メッセージの下書きを作る。
// 失敗時・APIキー未設定時は null（下書きなしで行動だけ出す）。
export async function generateContactDraft(
  tenantId: string,
  action: SalesActionRow,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const [logs, notes] = await Promise.all([
    fetchRecentConversationLogsForPerson(tenantId, action.person_id, 5).catch(
      () => [],
    ),
    fetchRecentNotesForPerson(tenantId, action.person_id, 6).catch(() => []),
  ]);

  const ctxLines: string[] = [];
  for (const l of logs) {
    const day = l.occurredAt ? l.occurredAt.slice(0, 10) : "日付不明";
    const promise = l.nextAction ? `（次の約束: ${l.nextAction}）` : "";
    ctxLines.push(`- ${day}: ${l.summary}${promise}`);
  }
  for (const n of notes) {
    const body = n.content ? `: ${n.content.slice(0, 120)}` : "";
    ctxLines.push(`- [${n.kind}] ${n.title}${body}`);
  }
  const context =
    ctxLines.length > 0 ? ctxLines.join("\n") : "（過去の記録は特になし）";

  try {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `あなたは経営者本人の右腕として、相手に「今すぐ送れる」連絡メッセージの下書きを作ります。
- 目的: ${RULE_DRAFT_INTENT[action.rule]}
- 過去のやり取り・約束・メモを自然に踏まえる（具体的な話題に触れると相手に刺さる）。
- 日本語で2〜4文。丁寧だが固すぎない、押し売りにならないトーン。
- 宛名・署名・件名は付けず、本文だけを出す。絵文字は使わない。
- 記録に無い事実を創作しない。曖昧なら一般的な近況うかがいに留める。`,
        },
        {
          role: "user",
          content: `相手: ${action.name}さん\n状況: ${action.reason}\n\n# この相手の過去の記録\n${context}\n\nこの相手に今送る連絡メッセージの本文を書いてください。`,
        },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[action-plan] 下書き生成失敗:", err);
    return null;
  }
}

// 記念日・日付リマインド（ai_clone_dated_reminder）から「対象日が来る」ものを抽出。
export async function fetchDueAnniversaries(
  tenantId: string,
  date: string,
): Promise<DueAnniversary[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_clone_dated_reminder")
    .select("title, base_date, recurrence, milestone_months, note")
    .eq("tenant_id", tenantId)
    .eq("active", true);
  if (error) {
    console.error("[action-plan] 記念日取得失敗:", error.message);
    return [];
  }
  const out: DueAnniversary[] = [];
  for (const r of (data ?? []) as Array<{
    title: string;
    base_date: string;
    recurrence: Recurrence;
    milestone_months: number[] | null;
    note: string | null;
  }>) {
    const hit = occursOn(r.base_date, r.recurrence, r.milestone_months ?? [], date);
    if (hit) {
      out.push({
        title: r.title,
        note: r.note,
        milestoneMonth: hit.milestoneMonth,
      });
    }
  }
  return out;
}

// 期限が「対象日まで（＝対象日 or 超過）」の未完タスク。古い期限から最大30件。
export async function fetchDueTasks(
  tenantId: string,
  date: string,
): Promise<DueTask[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_clone_task")
    .select("id, name, due_date, priority, status")
    .eq("tenant_id", tenantId)
    .neq("status", "完了")
    .is("deleted_at", null)
    .not("due_date", "is", null)
    .lte("due_date", date)
    .order("due_date", { ascending: true })
    .limit(30);
  if (error) {
    console.error("[action-plan] 期限タスク取得失敗:", error.message);
    return [];
  }
  return (data ?? []).map(
    (t: { id: string; name: string; due_date: string; priority: string | null }) => ({
      id: t.id,
      name: t.name,
      due_date: t.due_date,
      priority: t.priority,
    }),
  );
}

// ===========================================================
// 日付ヘルパー
// ===========================================================

// JST の対象日 YYYY-MM-DD（offsetDays: 0=今日 / 1=明日）
function jstDateStr(offsetDays: number): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 2つの 'YYYY-MM-DD' の日数差（a - b）。
function dateDiffDays(a: string, b: string): number {
  const pa = Date.UTC(
    Number(a.slice(0, 4)),
    Number(a.slice(5, 7)) - 1,
    Number(a.slice(8, 10)),
  );
  const pb = Date.UTC(
    Number(b.slice(0, 4)),
    Number(b.slice(5, 7)) - 1,
    Number(b.slice(8, 10)),
  );
  return Math.round((pa - pb) / (24 * 60 * 60 * 1000));
}

// ===========================================================
// 約束未了（会話ログの next_action 残り）
// ===========================================================

export interface OpenPromise {
  person: string | null;
  promise: string;
  occurredAt: string;
  daysAgo: number;
}

// 直近 lookbackDays 日の会話ログから「次の約束（next_action）」が残っているものを拾う。
// 「○○さんに連絡していますか？」の想起源。完了管理の仕組みは持たないので、
// 新しい順に最大 limit 件をそのまま返し、本人に思い出させる材料にする。
async function fetchOpenPromises(
  tenantId: string,
  today: string,
  lookbackDays = 30,
  limit = 5,
): Promise<OpenPromise[]> {
  const from = (() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - lookbackDays);
    return d.toISOString().slice(0, 10);
  })();

  const rows = await searchConversationsForChat(tenantId, {
    dateFrom: from,
    limit: 30,
  }).catch(() => []);

  const out: OpenPromise[] = [];
  for (const r of rows) {
    const promise = (r.next_action ?? "").trim();
    if (!promise) continue;
    const occurred = r.occurred_at ? r.occurred_at.slice(0, 10) : today;
    out.push({
      person: r.person_names[0] ?? null,
      promise,
      occurredAt: occurred,
      daysAgo: Math.max(0, dateDiffDays(today, occurred)),
    });
    if (out.length >= limit) break;
  }
  return out;
}

// ===========================================================
// オンデマンド行動計画（get_action_plan が呼ぶ）
// ===========================================================

export interface ActionPlan {
  date: string; // 対象日 YYYY-MM-DD
  dayLabel: "今日" | "明日";
  salesActions: Array<{
    name: string;
    reason: string;
    rule: ActionRule;
    verb: string;
    draft: string | null;
  }>;
  dueTasks: Array<{
    name: string;
    due_date: string;
    priority: string | null;
    overdueDays: number; // 対象日 - 期限（正=超過 / 0以下=まだ）
  }>;
  staleTaskCount: number; // 3日以上滞留している期限切れの件数
  anniversaries: DueAnniversary[];
  openPromises: OpenPromise[];
  quickWin: { name: string; due_date: string | null; priority: string | null } | null;
}

interface BuildActionPlanOptions {
  // 売上行動に連絡文の下書きを添えるか。オンデマンドの即答では既定 false
  // （下書きは OpenAI 追加呼び出しで遅くなるため、本人が望んだ時だけ別途生成）。
  withDrafts?: boolean;
}

export async function buildActionPlan(
  tenantId: string,
  day: "today" | "tomorrow" = "today",
  opts: BuildActionPlanOptions = {},
): Promise<ActionPlan> {
  const offset = day === "tomorrow" ? 1 : 0;
  const date = jstDateStr(offset);
  const dayLabel: "今日" | "明日" = day === "tomorrow" ? "明日" : "今日";

  // 4系統を並列取得
  const [actionsRaw, dueTasksRaw, anniversaries, openPromises] =
    await Promise.all([
      fetchSalesActions(tenantId, date),
      fetchDueTasks(tenantId, date),
      fetchDueAnniversaries(tenantId, date),
      fetchOpenPromises(tenantId, date),
    ]);

  const top = selectTopThree(actionsRaw);
  const salesActions = await Promise.all(
    top.map(async (a) => ({
      name: a.name,
      reason: a.reason,
      rule: a.rule,
      verb: RULE_VERB[a.rule],
      draft: opts.withDrafts ? await generateContactDraft(tenantId, a) : null,
    })),
  );

  const dueTasks = dueTasksRaw.map((t) => ({
    name: t.name,
    due_date: t.due_date,
    priority: t.priority,
    overdueDays: dateDiffDays(date, t.due_date),
  }));
  const staleTaskCount = dueTasks.filter((t) => t.overdueDays >= 3).length;

  // 「今日片付ける1件」：溜まる前に促す。期限が来ている中で最も急ぐ1件
  //   （= 最古の期限）。期限超過が無ければ対象日ちょうど期限のもの。
  const quickWin =
    dueTasks.length > 0
      ? {
          name: dueTasks[0].name,
          due_date: dueTasks[0].due_date,
          priority: dueTasks[0].priority,
        }
      : null;

  return {
    date,
    dayLabel,
    salesActions,
    dueTasks,
    staleTaskCount,
    anniversaries,
    openPromises,
    quickWin,
  };
}
