// AI Clone の「翌日分」ブリーフィング。
//
// 仕様（2026-05-31 更新：占い → 売上行動3件 へ差し替え）:
//   * 毎日 JST 19:00（前日夜）に Vercel Cron から /api/briefing 経由で叩かれる。
//     Vercel 無料プランは cron が1日1回までなので、配信枠はこの1本のみ。
//     → 内容は「翌日（明日）やるべき売上行動3件」。前夜のうちに翌日の動きを渡す。
//   * ai_clone_tenants.morning_briefing_enabled = true のテナントだけを対象。
//   * 各テナントの owner_user_id → tenant_members.slack_user_id を解決して Slack DM。
//
// 【2026-07-29 現在の配信内容】ユーザー指示により *売上行動3件セクションは停止中*。
//   いま出るのは：記念日・節目 ／ 期限リマインド ／ 隔週の紹介ふりかえり ／
//   月曜のコーチの問い ／ 占術（明日はどんな日か・一般＋あなた向け）。
//   売上行動を戻すときは deliverToTenant 内の「▼▼▼ 2026-07-29 停止」ブロック2箇所と
//   冒頭 import のコメントを外すだけでよい（整形関数は残置してある）。
//
// 中身（思想: project_ai_clone_uridashi_hakkutsu_concept）:
//   右腕AI＝記憶AI。「忘れている売上行動」を3件思い出させる。
//   候補抽出は RPC ai_clone_daily_sales_actions（migration 0043）が3ルールで行う:
//     ① re_touch     重要度S/A × 最終接触30日超 → 近況うかがい
//     ② stalled_deal 商談済 × 受注未 × 14日超   → 進捗確認
//     ③ ask_referral 受注90日以内 × 紹介依頼未   → 紹介のお願い
//   売上行動セクションは配信の看板。記念日・期限リマインドの有無に関係なく毎回出す。
//   候補ゼロの夜は「明日の段取り（未完タスク）」でこの枠を埋める（リマインド済みは除外）。
//
// 旧仕様（占術ブリーフィング）は廃止。占術エンジン（lib/divination）は
//   社内鑑定（admin/divination）の資産として残置し、ここからは呼ばない。

import { WebClient } from "@slack/web-api";
import { createClient } from "@supabase/supabase-js";
import {
  fetchReferralWeeklyKpi,
  type ReferralWeeklyKpi,
  searchConversationsForChat,
} from "./supabase-db";
import {
  // ▼▼ 2026-07-29 売上行動セクション停止中（復活時はこの3つも戻す）▼▼
  // fetchSalesActions,
  // selectTopThree,
  // generateContactDraft,
  fetchDueAnniversaries,
  fetchDueTasks,
  RULE_VERB,
  type SalesActionWithDraft,
  type DueAnniversary,
  type DueTask,
} from "./action-plan";
import { loadWorksheet } from "@/lib/coach/worksheet-storage";
import { buildDivinationBlocks } from "./divination-briefing";

// ===========================================================
// 型
// ===========================================================

export interface MorningBriefingDelivery {
  tenantSlug: string;
  ok: boolean;
  reason?: string;
}

export interface MorningBriefingResult {
  date: string; // 配信対象日（＝翌日）のJST日付 YYYY-MM-DD
  generatedAt: string;
  deliveries: MorningBriefingDelivery[];
}

// 売上行動・記念日・期限タスク・下書きの型と取得ロジックは action-plan.ts に集約。
// 夜配信はそれらを import して使う（オンデマンド get_action_plan と共有）。

interface FallbackTask {
  id: string;
  name: string;
  due_date: string | null;
  priority: string | null;
}

// ===========================================================
// エントリ：全テナント走査して配信
// ===========================================================

export async function runMorningBriefing(): Promise<MorningBriefingResult> {
  // 前日19時(JST)に「翌日分」を配信する。翌日のJST日付を対象日にする。
  const date = formatJSTDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const targets = await listMorningBriefingTargets();
  const deliveries: MorningBriefingDelivery[] = [];

  for (const t of targets) {
    const res = await deliverToTenant(t, date);
    deliveries.push(res);
  }

  return {
    date,
    generatedAt: new Date().toISOString(),
    deliveries,
  };
}

// ===========================================================
// テナント解決
// ===========================================================

interface MorningBriefingTarget {
  tenantId: string;
  tenantSlug: string;
  ownerUserId: string | null;
  ownerBirthday: string | null;   // ai_clone_tenants.owner_birthday（占術セクション用）
  ownerBirthHour: number | null;  // ai_clone_tenants.owner_birth_hour（任意）
}

async function listMorningBriefingTargets(): Promise<MorningBriefingTarget[]> {
  // Cron 経由なので auth セッションなし。service role キーで RLS を回避する。
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ai_clone_tenants")
    .select(
      "id, slug, owner_user_id, owner_birthday, owner_birth_hour, morning_briefing_enabled",
    )
    .eq("morning_briefing_enabled", true);

  if (error) {
    console.error("[morning-briefing] テナント取得失敗:", error.message);
    return [];
  }

  return (data ?? []).map(
    (row: {
      id: string;
      slug: string;
      owner_user_id: string | null;
      owner_birthday: string | null;
      owner_birth_hour: number | null;
    }) => ({
      tenantId: row.id,
      tenantSlug: row.slug,
      ownerUserId: row.owner_user_id,
      ownerBirthday: row.owner_birthday,
      ownerBirthHour: row.owner_birth_hour,
    }),
  );
}

async function resolveSlackUserId(
  tenantId: string,
  ownerUserId: string | null,
): Promise<string | null> {
  const supabase = getServiceClient();
  if (supabase && ownerUserId) {
    const { data } = await supabase
      .from("ai_clone_tenant_members")
      .select("slack_user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", ownerUserId)
      .maybeSingle();
    if (data?.slack_user_id) return data.slack_user_id;
  }
  // フォールバック：env の SLACK_CEO_USER_ID（goshima 専用、本番運用前提では tenant_members 側を必ず埋める）
  return process.env.SLACK_CEO_USER_ID || null;
}

// ===========================================================
// 候補抽出（RPC）＋ フォールバック
// ===========================================================

// 候補ゼロのときの受け皿：未完タスクのプールを期限昇順で取得（最大12件）。
// 実際に出す3件は pickFallbackWindow が日替わりで選ぶ（毎晩同じ顔ぶれを避ける）。
async function fetchFallbackTasks(tenantId: string): Promise<FallbackTask[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_clone_task")
    .select("id, name, due_date, priority, status")
    .eq("tenant_id", tenantId)
    .neq("status", "完了")
    .is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(12);
  if (error) {
    console.error("[morning-briefing] フォールバックタスク取得失敗:", error.message);
    return [];
  }
  return (data ?? []) as FallbackTask[];
}

// 「明日の段取り」に出す最大3件を選ぶ。最も期限が近い1件は常にピン留めし、
// 残り枠は日替わりでローテーション（タスクが4件以上あれば連夜で中身が変わる）。
// 状態を持たず date のみから決めるので、再現性があり migration 不要。
function pickFallbackWindow(pool: FallbackTask[], date: string): FallbackTask[] {
  if (pool.length <= 3) return pool;
  const pinned = pool[0]; // 最も期限が近い1件は毎晩出す
  const rest = pool.slice(1);
  const [y, m, d] = date.split("-").map(Number);
  const dayIdx = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  const start = dayIdx % rest.length;
  const second = rest[start];
  const third = rest[(start + 1) % rest.length];
  return [pinned, second, third];
}

// YYYY-MM-DD を deltaDays 日ずらして返す。
function shiftDateStr(date: string, deltaDays: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + deltaDays * 24 * 60 * 60 * 1000);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 「紹介お願いしましたか？」の隔週リマインドを出す日か。
// 毎日聞くと鬱陶しいので、月曜かつ隔週（epoch からの週数が偶数）のときだけ true。
// ≒ 2週間に1回。epoch(1970-01-01)が木曜なので月曜上で週数パリティが隔週に並ぶ。
function isBiweeklyReferralDay(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  if (new Date(t).getUTCDay() !== 1) return false; // 月曜のみ
  const weeks = Math.floor(t / (7 * 24 * 60 * 60 * 1000));
  return weeks % 2 === 0;
}

// 月曜か（date=配信対象日）。週次コーチレビューの発火日。
function isMondayJST(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1;
}

// 週次コーチレビュー：オーナーの紹介設計（ワークシート）から1項目 × 直近の接点1人を選び、
// 「○○さんに『設計』は伝えた？反応は？」を Slack に投げる。設計×現場のPDCAを習慣化する。
// worksheet に記入があり、直近3週間に人物リンク付き会話ログがあるテナントだけ対象。
async function buildCoachReviewBlocks(
  tenantId: string,
  ownerUserId: string | null,
  date: string,
): Promise<any[]> {
  if (!ownerUserId) return [];
  const supabase = getServiceClient();
  if (!supabase) return [];

  const worksheet = (await loadWorksheet(supabase, ownerUserId).catch(
    () => ({}),
  )) as Record<string, string>;

  // 突き合わせに使う設計項目（優先順）。記入済みのものだけ対象。
  const DESIGN: { id: string; label: string }[] = [
    { id: "ws01_02", label: "ストーリー" },
    { id: "ws02_04", label: "USP" },
    { id: "ws01_05", label: "紹介しやすい一言" },
    { id: "ws02_07", label: "あなたから買う理由" },
    { id: "ws01_08", label: "まとめの一言" },
  ];
  const filled = DESIGN.filter((e) => (worksheet[e.id] ?? "").trim().length > 0);
  if (filled.length === 0) return [];

  const recent = await searchConversationsForChat(tenantId, {
    dateFrom: shiftDateStr(date, -21),
    limit: 5,
  }).catch(() => []);
  const contact = recent.find((c) => (c.person_names?.length ?? 0) > 0);
  if (!contact) return [];
  const who = contact.person_names[0];

  // 週ごとに対象設計項目をローテーション（毎週同じ問いにしない）。
  const [y, m, d] = date.split("-").map(Number);
  const weeks = Math.floor(Date.UTC(y, m - 1, d) / (7 * 24 * 60 * 60 * 1000));
  const el = filled[weeks % filled.length];
  const raw = (worksheet[el.id] ?? "").trim();
  const value = raw.length > 120 ? raw.slice(0, 120) + "…" : raw;

  return [
    {
      type: "header",
      text: { type: "plain_text", text: "🎓 今週のコーチの問い" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*${who}さん* に、あなたの「${el.label}」＝\n> ${value}\nは伝えられましたか？ 反応はどうでしたか？\n\n` +
          `うまくいかなければ、コーチで一緒に磨けます → https://gia2018.com/members/app/coach`,
      },
    },
  ];
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
// 1テナント配信
// ===========================================================

async function deliverToTenant(
  t: MorningBriefingTarget,
  date: string,
): Promise<MorningBriefingDelivery> {
  const slackUserId = await resolveSlackUserId(t.tenantId, t.ownerUserId);
  if (!slackUserId) {
    return {
      tenantSlug: t.tenantSlug,
      ok: false,
      reason: "Slack User ID 未解決（tenant_members.slack_user_id も env も無い）",
    };
  }

  const slack = getSlackClient();
  if (!slack) {
    return { tenantSlug: t.tenantSlug, ok: false, reason: "SLACK_BOT_TOKEN 未設定" };
  }

  // 記念日・節目 / 期限到来タスク を並列取得
  const [anniversaries, dueTasks] = await Promise.all([
    fetchDueAnniversaries(t.tenantId, date),
    fetchDueTasks(t.tenantId, date),
  ]);

  // ▼▼▼ 2026-07-29 売上行動3件セクションを停止（ユーザー指示でコメントアウト）▼▼▼
  // 復活させるときは (A) ここの取得 (B) 下の actionBlocks 生成 (C) 冒頭 import の
  // fetchSalesActions / selectTopThree / generateContactDraft の3ブロックを戻すだけでよい。
  // 整形関数（buildActionsMessage / buildFallbackMessage）と取得ヘルパは残置してある。
  // const actionsRaw = await fetchSalesActions(t.tenantId, date);
  // const actions = selectTopThree(actionsRaw);
  // // 各行動の相手について、過去ログ・備考・約束を読んで連絡文の下書きを並列生成。
  // const actionsWithDrafts: SalesActionWithDraft[] = await Promise.all(
  //   actions.map(async (a) => ({
  //     ...a,
  //     draft: await generateContactDraft(t.tenantId, a),
  //   })),
  // );
  // ▲▲▲ ここまで ▲▲▲

  const blocks: any[] = [];
  if (anniversaries.length > 0) {
    blocks.push(...buildAnniversaryBlocks(date, anniversaries));
  }
  if (dueTasks.length > 0) {
    if (blocks.length > 0) blocks.push({ type: "divider" });
    blocks.push(...buildTaskReminderBlocks(date, dueTasks, t.tenantSlug));
  }

  // ▼▼▼ 2026-07-29 売上行動3件セクションを停止（ユーザー指示でコメントアウト）▼▼▼
  // 元の仕様：売上行動は配信の看板で、記念日・リマインドの有無に関係なく必ず枠を出す。
  //   候補あり → 3件＋下書き／候補なし → 未完タスクで「明日の段取り」を埋める。
  //   リマインドで既に出したタスクはフォールバックから除外して二重掲載を防ぐ。
  // let actionBlocks: any[];
  // if (actionsWithDrafts.length > 0) {
  //   actionBlocks = buildActionsMessage(date, actionsWithDrafts);
  // } else {
  //   const shownTaskIds = new Set(dueTasks.map((task) => task.id));
  //   const pool = (await fetchFallbackTasks(t.tenantId)).filter(
  //     (task) => !shownTaskIds.has(task.id),
  //   );
  //   const fallbackTasks = pickFallbackWindow(pool, date);
  //   actionBlocks = buildFallbackMessage(date, fallbackTasks);
  // }
  // if (blocks.length > 0) blocks.push({ type: "divider" });
  // blocks.push(...actionBlocks);
  // ▲▲▲ ここまで ▲▲▲

  // 売上行動セクションを止めたので、以降のセクションは「先頭かもしれない」。
  // 何も無いところに divider を置くと Slack で線だけが浮くため、
  // 既に中身があるときだけ区切りを入れて追記する。
  let outBlocks: any[] = blocks;
  const appendSection = (section: any[]) => {
    if (section.length === 0) return;
    outBlocks =
      outBlocks.length > 0
        ? [...outBlocks, { type: "divider" }, ...section]
        : [...section];
  };

  // 隔週だけ「最近、紹介お願いしましたか？」の鏡を添える（頼んだ＝隔週／与えた＝測るだけ）。
  if (isBiweeklyReferralDay(date)) {
    const from = shiftDateStr(date, -14);
    const kpi = await fetchReferralWeeklyKpi(t.tenantId, from, date).catch(
      () => null,
    );
    if (kpi) appendSection(buildReferralNudgeBlocks(kpi));
  }

  // 週次（月曜）コーチレビュー：設計×現場の問いを向こうから1問。
  if (isMondayJST(date)) {
    const coachBlocks = await buildCoachReviewBlocks(
      t.tenantId,
      t.ownerUserId,
      date,
    );
    appendSection(coachBlocks);
  }

  // 占術セクション（明日はどんな日か：一般＋本人向け）を末尾に添える。
  // owner_birthday 未設定なら空配列。
  // 占術側の失敗（AI・計算）がブリーフィング全体を落とさないよう try/catch で隔離する。
  try {
    appendSection(
      await buildDivinationBlocks(
        { birthday: t.ownerBirthday, birthHour: t.ownerBirthHour },
        date,
      ),
    );
  } catch (err) {
    console.error("[morning-briefing] 占術セクション生成失敗（スキップ）:", err);
  }

  // 全セクションが空なら送らない（売上行動を止めたので起こり得る）。
  // 中身のない DM を毎晩飛ばすより黙っている方がよい。
  if (outBlocks.length === 0) {
    return { tenantSlug: t.tenantSlug, ok: true, reason: "配信内容なし（送信スキップ）" };
  }

  try {
    await slack.chat.postMessage({
      channel: slackUserId,
      text: `🌙 明日（${date}）のブリーフィング`,
      mrkdwn: true,
      blocks: outBlocks,
    });
    return { tenantSlug: t.tenantSlug, ok: true };
  } catch (err) {
    console.error("[morning-briefing] Slack 送信失敗:", err);
    return {
      tenantSlug: t.tenantSlug,
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

// ===========================================================
// メッセージ整形
// ===========================================================

// RULE_VERB は action-plan.ts から import（売上行動の言い回し）。

function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function buildActionsMessage(
  date: string,
  actions: SalesActionWithDraft[],
): any[] {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🎯 明日 ${dateLabel(date)} ／ やるべき売上行動3つ`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "忘れている売上行動を掘り起こしました。各件に送信メッセージの下書きを添えています。確認のうえ送ってください。",
        },
      ],
    },
  ];

  actions.forEach((a, i) => {
    let text =
      `*${i + 1}. ${a.name}さん*  ${a.reason}\n` + `→ ${RULE_VERB[a.rule]}`;
    if (a.draft) {
      // Slack mrkdwn の引用は各行頭に "> " が要る
      const quoted = a.draft
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      text += `\n\n*下書き*\n${quoted}`;
    }
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text },
    });
  });

  return blocks;
}

function buildAnniversaryBlocks(date: string, items: DueAnniversary[]): any[] {
  const lines = items.map((a) => {
    const ms = a.milestoneMonth ? `（${a.milestoneMonth}ヶ月）` : "";
    const note = a.note ? `  — ${a.note}` : "";
    return `・*${a.title}*${ms}${note}`;
  });
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🎂 明日 ${dateLabel(date)} ／ 記念日・節目`,
      },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: lines.join("\n") },
    },
  ];
}

// 期限リマインド。直近（明日〜2日超過）は個別に出すが、3日以上の滞留は
// 毎日個別に鳴らさず「◯件たまっています、棚卸しを」の1行に集約する。
// 鳴りっぱなし＝学習性無力感を避け、リスケ/完了/削除の行動へ促すため。
function buildTaskReminderBlocks(
  date: string,
  tasks: DueTask[],
  slug: string,
): any[] {
  const recent = tasks.filter((t) => dateDiffDays(date, t.due_date) <= 2);
  const stale = tasks.filter((t) => dateDiffDays(date, t.due_date) >= 3);

  const lines: string[] = [];
  for (const t of recent.slice(0, 5)) {
    const over = dateDiffDays(date, t.due_date); // date(明日) - 期限
    const when = over <= 0 ? "期限：明日" : `⚠️ ${over}日超過`;
    const pri = t.priority ? `  〔優先度:${t.priority}〕` : "";
    lines.push(`・*${t.name}*  ${when}${pri}`);
  }

  // 3日以上の滞留は集約。毎晩同じ超過タスクを羅列して鳴らし続けない。
  // 頻度は毎晩のままだが、放置日数で督促のトーンを進める（同じ文の繰り返しを避ける）。
  if (stale.length > 0) {
    const oldest = Math.max(
      ...stale.map((t) => dateDiffDays(date, t.due_date)),
    );
    const url = `https://gia2018.com/clone/${slug}/tasks`;
    let head: string;
    let nudge: string;
    if (oldest >= 14) {
      head = `🗂️ 期限切れが *${stale.length}件*、最古は *${oldest}日* 放置です。`;
      nudge =
        "2週間動いていないものは、思い切って一括で「やめる」のも立派な整理です。";
    } else if (oldest >= 7) {
      head = `🗂️ 期限切れ *${stale.length}件* が1週間以上たまっています（最古 ${oldest}日超過）。`;
      nudge = "そろそろ決めましょう。やる・リスケ・やめるを1件ずつ。";
    } else {
      head = `🗂️ 期限切れが *${stale.length}件* たまっています（最古 ${oldest}日超過）。`;
      nudge = "「やる・リスケ・やめる」を決めて棚卸しを。";
    }
    lines.push(
      `${lines.length > 0 ? "\n" : ""}${head} → <${url}|期限管理を開く>\n` +
        `${nudge}\n` +
        `_このトークで「○○やめる」「○○を金曜まで」と返しても整理できます。_`,
    );
  }

  if (lines.length === 0) return [];

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🔔 明日 ${dateLabel(date)} ／ 期限リマインド`,
      },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: lines.join("\n") },
    },
  ];
}

// 隔週の紹介ふりかえり。直近2週間の 頼んだ/与えた/生まれた を映し、
// 「止まっている方」（頼んだ or 与えた が0）を軽く促す。両方動いていれば急かさず肯定する。
// 頻度は隔週固定なので、頼んだ・与えた両方を見ても鬱陶しさは増えない（1メッセージが賢くなるだけ）。
function buildReferralNudgeBlocks(kpi: ReferralWeeklyKpi): any[] {
  const stat = `この2週間：紹介を頼んだ *${kpi.asked}回* ／ 与えた *${kpi.gave}回* ／ 生まれた *${kpi.born}件*`;
  let line: string;
  if (kpi.asked === 0 && kpi.gave === 0) {
    line =
      "最近、紹介を頼むのも・誰かを紹介するのも記録がありません。どちらか1つでいいので、今週どこかで動いてみては。紹介は「頼んだ数 × 与えた数」で生まれます。";
  } else if (kpi.asked === 0) {
    line =
      "最近、紹介をお願いしましたか？ この2週間は記録がありません。今週どこかで、温かい相手1人にだけ紹介を頼んでみては。";
  } else if (kpi.gave === 0) {
    line =
      "最近、誰かを誰かに紹介しましたか？ 与える人にこそ、紹介は返ってきます。今週1人、繋いでみては。";
  } else {
    line = "いい流れです。頼んだ分・与えた分だけ、紹介は生まれます。";
  }
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "🤝 隔週ふりかえり ／ 紹介" },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `${stat}\n\n${line}` },
    },
  ];
}

function buildFallbackMessage(date: string, tasks: FallbackTask[]): any[] {
  if (tasks.length === 0) {
    return [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🌱 明日 ${dateLabel(date)} ／ 掘り起こし候補なし`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "明日は売上の掘り起こし候補がありません。\n" +
            "新規接点づくり・種まきに使える日です。会いたい人に連絡してみては。",
        },
      },
    ];
  }

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🗒️ 明日 ${dateLabel(date)} ／ 明日の段取り`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `掘り起こし候補が今日はないので、未完タスクから${tasks.length}件出しました。`,
        },
      ],
    },
  ];

  tasks.forEach((t, i) => {
    const meta: string[] = [];
    if (t.priority) meta.push(`優先度:${t.priority}`);
    if (t.due_date) meta.push(`期限:${t.due_date}`);
    const tail = meta.length ? `  （${meta.join(" / ")}）` : "";
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${i + 1}. ${t.name}*${tail}` },
    });
  });

  return blocks;
}

// ===========================================================
// クライアントヘルパー
// ===========================================================

function getSlackClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new WebClient(token);
}

// Cron 経由は auth 文脈なしなので、service role キーで読む。
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[morning-briefing] SUPABASE service key 未設定");
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function formatJSTDate(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
