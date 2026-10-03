// 入会時の役職「その他」の承認制（0126）。画面にもDBにも依存しない決まりと文言だけを置き、テスト（approval.test.ts）で見張る。
//
// - 「その他」で申請した人は、オーナーが承認するまで酒場の中を一切見られない（見られるのは申請後の画面だけ）
// - 承認待ち・見送りの判定は DB の sakaba.member_gate_state() 1か所。画面はその結果（sakaba_get_my_gate_status）をここで読む
// - 「承認待ち」という言葉は本人向けの画面には出さない（管理画面ではよい）
// - 文言は五島さん確定（2026-10-03）。ここ1か所に置き、画面はこれを読む

import type { Position } from "./types";

export const OTHER_TITLE_MAX = 40;
export const OTHER_WORK_MAX = 100;

/** DB の sakaba.member_gate_state() が返す、その人の入口の状態 */
export type GateState = "none" | "active" | "suspended" | "pending" | "declined";

const GATE_STATES: readonly GateState[] = ["none", "active", "suspended", "pending", "declined"];

/** DB から受け取った値を状態に直す。読めない値は null（呼ぶ側は、見せない方向ではなく既存の動きのままにする。本当の関門はDB） */
export function parseGateState(value: unknown): GateState | null {
  return typeof value === "string" && (GATE_STATES as readonly string[]).includes(value) ? (value as GateState) : null;
}

/** 酒場の中を見せずに、申請後の画面だけを出す人か。画面の判定はここ1か所 */
export function isHeldOutside(state: GateState | null): state is "pending" | "declined" {
  return state === "pending" || state === "declined";
}

/** この役職は、オーナーの承認が要るか（DB の sakaba._join_guild と同じ決まり） */
export function requiresApproval(position: Position | ""): boolean {
  return position === "other";
}

export const APPROVAL_COPY = {
  /** 役職欄の説明（常に表示） */
  positionHint: "GIAの酒場は、代表・役員・決裁者の方のための場です。",
  /** 「その他」を押したときに出す文 */
  otherNotice: [
    "原則として、代表・役員・決裁者の方にご参加いただいています。",
    "それ以外の方は、お仕事の内容を確認のうえ、ご参加を承認させていただく場合がございます。",
    "役職とお仕事の内容をご記入ください。",
  ],
  titleLabel: "役職（例：営業部長）",
  workLabel: "お仕事の内容（ひとこと）",
  submitLabel: "参加を申請する",
  submittingLabel: "申請中…",
  /** 申請した直後のトースト */
  appliedToast: "申請を受け付けました",
  /** 申請後の画面 */
  pending: {
    title: "参加のお申し込み",
    lines: ["申請を受け付けました。", "内容を確認のうえ、ご参加いただける場合はご連絡します。"],
  },
  /** 見送られた人がログインしたときの画面 */
  declined: {
    title: "ご連絡",
    lines: ["今回はご参加を見送らせていただきました。", "ご理解いただけますと幸いです。"],
  },
} as const;

export type PendingMember = {
  user_id: string;
  display_name: string;
  company_name: string;
  other_position_title: string;
  other_work_summary: string;
  invited_by_name: string;
  applied_at: string;
};

export function parsePendingMembers(value: unknown): PendingMember[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is PendingMember =>
    typeof row === "object" && row !== null
    && typeof (row as PendingMember).user_id === "string"
    && typeof (row as PendingMember).display_name === "string"
    && typeof (row as PendingMember).applied_at === "string");
}

/** 集まりのゲストから入った人は役職を聞いていないので、役職・お仕事の内容が空になる（管理画面での見せ方） */
export function hasApplicationDetail(member: Pick<PendingMember, "other_position_title" | "other_work_summary">): boolean {
  return member.other_position_title.trim() !== "" || member.other_work_summary.trim() !== "";
}
