// 料金の段ごとの回数と上限（0114）。数えるのも止めるのもDB。ここは返り値を読んで画面の言葉にするだけ。

export type PlanKey = "free" | "standard" | "dining" | "exempt";
export type QuotaKind = "intro" | "quest" | "project";
/** limit が null なら無制限 */
export type QuotaSlot = { limit: number | null; used: number };
export type PlanUsage = { plan: PlanKey; resets_at: string } & Record<QuotaKind, QuotaSlot>;

/** 段ごとの上限（null＝無制限）。正本はDBの sakaba.plan_limits（0114）。料金の画面の文言に使い、
 *  plan-usage.test.ts で migration の数と食い違わないか見張る */
export const PLAN_LIMITS: Record<Exclude<PlanKey, "exempt">, Record<QuotaKind, number | null>> = {
  free: { intro: 1, quest: 1, project: 2 },
  standard: { intro: 3, quest: 3, project: 5 },
  dining: { intro: 10, quest: null, project: null },
};

export const PLAN_LABEL: Record<PlanKey, string> = { free: "フリー", standard: "プラス", dining: "ビジネス", exempt: "管理者" };

/** DBが上限で断ったときの印（sakaba.assert_within_plan_limit） */
export const PLAN_LIMIT_ERROR_CODE = "53400";

const plans = new Set<string>(["free", "standard", "dining", "exempt"]);

function parseSlot(raw: unknown): QuotaSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const used = typeof r.used === "number" && Number.isFinite(r.used) ? r.used : null;
  const limit = r.limit === null ? null : typeof r.limit === "number" && Number.isFinite(r.limit) ? r.limit : undefined;
  if (used === null || limit === undefined) return null;
  return { limit, used };
}

/** RPCの返り値を読む。形がおかしければ null（「無制限」と取り違えない） */
export function parsePlanUsage(data: unknown): PlanUsage | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.plan !== "string" || !plans.has(d.plan) || typeof d.resets_at !== "string") return null;
  const intro = parseSlot(d.intro), quest = parseSlot(d.quest), project = parseSlot(d.project);
  if (!intro || !quest || !project) return null;
  return { plan: d.plan as PlanKey, resets_at: d.resets_at, intro, quest, project };
}

/** あと何件か（無制限は null） */
export function remainingOf(slot: QuotaSlot): number | null {
  return slot.limit === null ? null : Math.max(0, slot.limit - slot.used);
}

export function isExhausted(slot: QuotaSlot | null | undefined): boolean {
  return Boolean(slot && slot.limit !== null && slot.used >= slot.limit);
}

const NOUN: Record<QuotaKind, string> = { intro: "つながり申請", quest: "クエスト・集まり", project: "プロジェクト" };

/** 「今月あと2件（プラス：月3件まで）」。無制限なら null（出さない） */
export function quotaLine(kind: QuotaKind, plan: PlanKey, slot: QuotaSlot): string | null {
  const left = remainingOf(slot);
  if (left === null) return null;
  const range = kind === "project" ? `${slot.limit}つまで` : `月${slot.limit}件まで`;
  const head = kind === "project" ? `あと${left}つ作れます` : `今月あと${left}件`;
  return `${head}（${PLAN_LABEL[plan]}：${NOUN[kind]}は${range}）`;
}

/** 使い切ったときの説明 */
export function exhaustedLine(kind: QuotaKind, plan: PlanKey, slot: QuotaSlot): string {
  if (kind === "project") return `${PLAN_LABEL[plan]}では、プロジェクトは${slot.limit}つまでです。おわったものを消すと空きます。`;
  return `${PLAN_LABEL[plan]}の今月の${NOUN[kind]}（${slot.limit}件）を使い切りました。毎月1日に戻ります。`;
}

export function isPlanLimitError(error: { code?: string } | null | undefined): boolean {
  return error?.code === PLAN_LIMIT_ERROR_CODE;
}

/** 名鑑で使える探し方（画面の出し分け。プロフィール自体は全員が見られる） */
export type SearchLevel = "list" | "filter" | "keyword";
export function searchLevelOf(plan: PlanKey | null): SearchLevel {
  if (plan === "dining" || plan === "exempt") return "keyword";
  if (plan === "standard") return "filter";
  return "list";
}
