import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APPROVAL_COPY,
  hasApplicationDetail,
  isHeldOutside,
  parseGateState,
  parsePendingMembers,
  requiresApproval,
} from "./approval";
import { notificationText, type NotificationContext } from "./notifications";
import type { GuildNotification } from "./types";

describe("役職「その他」の承認制：入口の状態", () => {
  it("承認待ち・見送りだけが、酒場の中を見られない。会員・停止中・まだ会員でない人は今まで通り", () => {
    expect(isHeldOutside("pending")).toBe(true);
    expect(isHeldOutside("declined")).toBe(true);
    for (const state of ["active", "suspended", "none", null] as const) expect(isHeldOutside(state)).toBe(false);
  });

  it("DB の返す値だけを状態として読む（知らない値は null＝今までの動きのまま）", () => {
    expect(parseGateState("pending")).toBe("pending");
    expect(parseGateState("active")).toBe("active");
    expect(parseGateState("PENDING")).toBeNull();
    expect(parseGateState(null)).toBeNull();
    expect(parseGateState({})).toBeNull();
  });

  it("承認が要る役職は「その他」だけ（代表・役員・決裁者・未選択は要らない）", () => {
    expect(requiresApproval("other")).toBe(true);
    for (const p of ["ceo", "officer", "decider", ""] as const) expect(requiresApproval(p)).toBe(false);
  });
});

describe("役職「その他」の承認制：文言（五島さん確定）", () => {
  it("確定文言をそのまま使う", () => {
    expect(APPROVAL_COPY.positionHint).toBe("GIAの酒場は、代表・役員・決裁者の方のための場です。");
    expect(APPROVAL_COPY.otherNotice).toEqual([
      "原則として、代表・役員・決裁者の方にご参加いただいています。",
      "それ以外の方は、お仕事の内容を確認のうえ、ご参加を承認させていただく場合がございます。",
      "役職とお仕事の内容をご記入ください。",
    ]);
    expect(APPROVAL_COPY.titleLabel).toBe("役職（例：営業部長）");
    expect(APPROVAL_COPY.workLabel).toBe("お仕事の内容（ひとこと）");
    expect(APPROVAL_COPY.submitLabel).toBe("参加を申請する");
    expect(APPROVAL_COPY.pending.lines).toEqual(["申請を受け付けました。", "内容を確認のうえ、ご参加いただける場合はご連絡します。"]);
    expect(APPROVAL_COPY.declined.lines).toEqual(["今回はご参加を見送らせていただきました。", "ご理解いただけますと幸いです。"]);
  });

  it("本人向けの文言に「承認待ち」を出さない", () => {
    const texts = [
      APPROVAL_COPY.positionHint, ...APPROVAL_COPY.otherNotice, APPROVAL_COPY.submitLabel, APPROVAL_COPY.submittingLabel,
      APPROVAL_COPY.appliedToast, APPROVAL_COPY.pending.title, ...APPROVAL_COPY.pending.lines,
      APPROVAL_COPY.declined.title, ...APPROVAL_COPY.declined.lines,
    ];
    for (const text of texts) expect(text).not.toContain("承認待ち");
  });
});

describe("役職「その他」の承認制：管理画面の申請", () => {
  const row = {
    user_id: "u1", display_name: "山田", company_name: "山田商店",
    other_position_title: "営業部長", other_work_summary: "広告の営業", invited_by_name: "鈴木", applied_at: "2026-10-03T00:00:00Z",
  };

  it("DBの返す配列だけを読む（壊れた行は落とす）", () => {
    expect(parsePendingMembers([row, { user_id: 1 }, null])).toEqual([row]);
    expect(parsePendingMembers(null)).toEqual([]);
  });

  it("ゲストから入った人は役職・お仕事が空（入力なしと見せる）", () => {
    expect(hasApplicationDetail(row)).toBe(true);
    expect(hasApplicationDetail({ other_position_title: " ", other_work_summary: "" })).toBe(false);
  });

  it("おしらせ member_pending は管理画面の申請欄へ飛ぶ", () => {
    const n: GuildNotification = {
      id: "n1", user_id: "owner", kind: "member_pending", actor_id: "u1", quest_id: null, intro_request_id: null,
      intro_status: null, changed_fields: [], read_at: null, created_at: "2026-10-03",
    };
    const ctx: NotificationContext = { name: () => "メンバー", questTitle: () => "", intro: () => undefined };
    expect(notificationText(n, ctx)).toEqual({ text: "参加の申請が 届きました", href: "/guild/master#master-pending-members-title" });
  });
});

// 画面側の見張り：ソースが、承認待ち・見送りの判定を1か所（approval.ts）に頼っていること。
// 見張り自身がコメントや文字列に落とされないよう、読むのは実際に使う呼び出しの形（`isHeldOutside(`・`requiresApproval(`）だけ。
describe("役職「その他」の承認制：画面が判定を1か所に頼っている", () => {
  const read = (p: string) => readFileSync(p, "utf-8");

  it("layout は DB の入口の状態を読み、申請後の画面に切り替える", () => {
    const src = read("app/guild/layout.tsx");
    expect(src).toContain('rpc("sakaba_get_my_gate_status"');
    expect(src).toContain("isHeldOutside(gate)");
    expect(src).toContain("<ApprovalGate");
  });

  it("入会フォームは requiresApproval で出し分け、他の経路の役職判定を持たない", () => {
    const src = read("components/guild/join-form.tsx");
    expect(src).toContain("requiresApproval(draft.position)");
    expect(src).not.toMatch(/position\s*===\s*["']other["']/);
  });

  it("管理画面の承認・見送りは DB の関数を通し、見送るは uiConfirm（赤）を通る", () => {
    const src = read("components/guild/live-pending-members.tsx");
    expect(src).toContain('rpc("sakaba_decide_pending_member"');
    expect(src).toMatch(/uiConfirm\(\{[\s\S]*?okLabel: "見送る",\s*danger: true/);
    expect(src).toContain("lockRef.current = true");
  });
});
