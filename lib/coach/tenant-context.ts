// 紹介コーチ ⇄ 右腕AI 連携：テナント（22DB）の Memory 層を読み込んで
// system prompt に差し込むコンテキスト文字列を組み立てる。
//
// 設計方針（2026-05-31）:
//   - 連携 ON かつ owner テナントを持つ会員のときだけ呼ぶ。
//   - 経営者ペルソナ（Executive AI Clone）は被せない。コーチ人格は維持し、
//     材料として「本人の人脈・会話・タスク」= Memory 層だけを渡す。
//   - Core OS（理念/KPI/判断基準）は個人会員では空のことが多く、
//     紹介コーチの相談には不要なので読み込まない。
//   - Phase 1 は「読むだけ」。書き込み（会話ログ化/名刺/タスク）は Phase 2。
//
// データ源は右腕AIのデータ層（lib/ai-clone/supabase-db.ts）をそのまま再利用。
// service_role で読むため、tenantId 境界はコード側で必ず効いている。

import {
  searchPeopleByName,
  fetchRecentConversationLogsForPerson,
  fetchRecentNotesForPerson,
  findOpenTasks,
  searchConversationsForChat,
  fetchReferralWeeklyKpi,
  fetchServicesForTenant,
} from "@/lib/ai-clone/supabase-db";

// 「山口さん」「田中氏」「鈴木様」等を本文から抽出（敬称ベース）。
function extractPersonNames(text: string): string[] {
  const pattern = /([一-龠ぁ-んァ-ヴー々a-zA-Z]+)(さん|氏|様|くん|ちゃん|先生|社長)/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m[1].length >= 2) found.add(m[1]);
  }
  return Array.from(found);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + "…";
}

// n 日前の JST 日付 YYYY-MM-DD。
function isoDaysAgoJST(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// JST の今日 / 今月初日。
function todayJST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function monthStartJST(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

// 1人物名 → 会話ログ + Notes を要約ブロック化（conversation.ts の buildPersonDigest を踏襲）。
async function buildPersonDigest(
  tenantId: string,
  name: string,
): Promise<string | null> {
  const candidates = await searchPeopleByName(tenantId, name).catch(() => []);
  if (candidates.length === 0) return null;
  const person = candidates[0];

  const [logs, notes] = await Promise.all([
    fetchRecentConversationLogsForPerson(tenantId, person.id, 5).catch(() => []),
    fetchRecentNotesForPerson(tenantId, person.id, 8).catch(() => []),
  ]);

  const label =
    candidates.length > 1
      ? `${name}さん（同名${candidates.length}人。最新の1人で要約）`
      : `${name}さん`;

  const logsBlock = logs.length
    ? logs
        .map((l) => {
          const head = `- ${l.occurredAt ? l.occurredAt.slice(0, 10) : "日付不明"}：${l.summary}`;
          const body = l.content ? `\n  内容：${truncate(l.content, 300)}` : "";
          const next = l.nextAction ? `\n  次：${truncate(l.nextAction, 150)}` : "";
          return head + body + next;
        })
        .join("\n")
    : "（過去の会話記録なし）";

  const notesBlock = notes.length
    ? notes
        .map(
          (n) =>
            `- [${n.kind}] ${n.date || "日付不明"} ${n.title}${
              n.content ? `：${truncate(n.content, 150)}` : ""
            }`,
        )
        .join("\n")
    : "（紐付くメモなし）";

  return `### ${label}\n#### 過去の接点\n${logsBlock}\n#### 関連メモ\n${notesBlock}`;
}

// 連携 ON のときの追加コンテキストを返す。材料が皆無なら null。
export async function buildCoachTenantContext(
  tenantId: string,
  userMessage: string,
): Promise<string | null> {
  const personNames = extractPersonNames(userMessage);

  const [openTasks, digests, recentConvos, referralKpi, services] =
    await Promise.all([
    findOpenTasks(tenantId, 15).catch(() => []),
    Promise.all(personNames.map((n) => buildPersonDigest(tenantId, n))),
    // 直近3週間の会話ログ（名前を出していなくても「最近の接点」を見せる）。
    // 設計（ワークシート）×現場（最近会った相手）の突き合わせコーチングの材料。
    searchConversationsForChat(tenantId, {
      dateFrom: isoDaysAgoJST(21),
      limit: 6,
    }).catch(() => []),
    // 今月の紹介KPI（頼んだ/与えた/生まれた）。設計→行動→結果を一本で見るため。
    fetchReferralWeeklyKpi(tenantId, monthStartJST(), todayJST()).catch(
      () => null,
    ),
    // サービス・商品。価値設計のレンズで USP/買う理由/紹介の一言 を磨く材料。
    fetchServicesForTenant(tenantId, 8).catch(() => []),
  ]);

  const personSection = digests
    .filter((d): d is string => d !== null)
    .join("\n\n");

  // 最近接点を持った相手（人物リンクのある会話ログのみ）。
  const recentSection = recentConvos
    .filter((c) => (c.person_names?.length ?? 0) > 0)
    .map((c) => {
      const who = c.person_names.join("・");
      const day = c.occurred_at ? c.occurred_at.slice(0, 10) : "日付不明";
      const next = c.next_action
        ? ` ／ 次の約束: ${truncate(c.next_action, 80)}`
        : "";
      return `- ${day} ${who}：${truncate(c.summary ?? "", 80)}${next}`;
    })
    .join("\n");

  const taskSection = openTasks.length
    ? openTasks
        .slice(0, 15)
        .map((t) => {
          const meta: string[] = [];
          if (t.status) meta.push(t.status);
          if (t.priority) meta.push(`優先度:${t.priority}`);
          if (t.dueDate) meta.push(`期限:${t.dueDate}`);
          const tail = meta.length ? `（${meta.join(" / ")}）` : "";
          return `- ${t.name}${tail}`;
        })
        .join("\n")
    : "";

  const kpiSection = referralKpi
    ? `- 紹介を頼んだ: ${referralKpi.asked}回 ／ 与えた: ${referralKpi.gave}回 ／ 生まれた: ${referralKpi.born}件（今月）`
    : "";

  // サービス・商品。価値設計（USP/買う理由/紹介の一言）を磨く材料。
  const serviceSection = services
    .map((s) => {
      const bits: string[] = [];
      if (s.targetAudience) bits.push(`対象:${truncate(s.targetAudience, 40)}`);
      if (s.problemSolved) bits.push(`悩み:${truncate(s.problemSolved, 40)}`);
      if (s.offering) bits.push(`提供:${truncate(s.offering, 40)}`);
      if (s.pricing) bits.push(`料金:${truncate(s.pricing, 30)}`);
      if (s.goodFit) bits.push(`向く相手:${truncate(s.goodFit, 30)}`);
      const meta = bits.length ? `\n  ${bits.join(" / ")}` : "";
      return `- ${s.name}${meta}`;
    })
    .join("\n");

  if (
    !personSection &&
    !taskSection &&
    !recentSection &&
    !kpiSection &&
    !serviceSection
  )
    return null;

  const blocks: string[] = [];
  if (serviceSection) {
    blocks.push(
      `## あなたのサービス・商品（右腕AIの記録より）\n${serviceSection}`,
    );
  }
  if (kpiSection) {
    blocks.push(`## 今月の紹介の数字（右腕AIの記録より）\n${kpiSection}`);
  }
  if (recentSection) {
    blocks.push(
      `## 最近あなたが接点を持った相手（右腕AIの会話ログ・直近3週間）\n${recentSection}`,
    );
  }
  if (taskSection) {
    blocks.push(`## あなたの未完タスク（右腕AIの記録より）\n${taskSection}`);
  }
  if (personSection) {
    blocks.push(`## 相談に登場した人物の記録（右腕AIより）\n${personSection}`);
  }
  return blocks.join("\n\n");
}
