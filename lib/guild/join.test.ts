import { describe, expect, it } from "vitest";
import type { Invite, Quest, QuestApplication } from "./types";
import {
  checkInvite,
  gatheringApplyResult,
  inviteErrorText,
  isExecutive,
  pendingGatheringApplications,
  validateJoin,
} from "./join";
import { invites, questApplications, quests } from "./mock-data";

const invite = (patch: Partial<Invite> = {}): Invite => ({
  code: "ABC",
  created_by: "master",
  max_uses: 10,
  used: 0,
  expires_at: "2026-12-31",
  ...patch,
});

describe("招待リンク", () => {
  const today = "2026-09-15";

  it("無い・見つからない・期限切れ・人数に達した を分けて返す", () => {
    expect(checkInvite([invite()], null, today)).toEqual({ ok: false, reason: "missing" });
    expect(checkInvite([invite()], "  ", today)).toEqual({ ok: false, reason: "missing" });
    expect(checkInvite([invite()], "XYZ", today)).toEqual({ ok: false, reason: "not_found" });
    expect(checkInvite([invite({ expires_at: "2026-09-14" })], "ABC", today)).toEqual({ ok: false, reason: "expired" });
    expect(checkInvite([invite({ used: 10 })], "ABC", today)).toEqual({ ok: false, reason: "used_up" });
  });

  it("期限の当日・期限なしは使える。大文字小文字と前後の空白は気にしない", () => {
    expect(checkInvite([invite({ expires_at: today })], "abc ", today).ok).toBe(true);
    expect(checkInvite([invite({ expires_at: null })], "ABC", today).ok).toBe(true);
  });

  it("原因ごとに 文言が違う", () => {
    const texts = Object.values(inviteErrorText);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("見本データ：GIA-2026 は使え、OLD-2025 は期限切れ", () => {
    expect(checkInvite(invites, "GIA-2026", today).ok).toBe(true);
    expect(checkInvite(invites, "OLD-2025", today)).toEqual({ ok: false, reason: "expired" });
  });
});

describe("入会の入力", () => {
  const ok = { display_name: "山田 太郎", company_name: "山田商店", position: "ceo" as const, show_company: true };

  it("名前・会社名・役職がそろえば エラーなし", () => {
    expect(validateJoin(ok)).toEqual({});
  });

  it("空・空白だけ・長すぎ・役職の未選択を それぞれの欄で知らせる", () => {
    expect(Object.keys(validateJoin({ ...ok, display_name: "  ", company_name: "", position: "" }))).toEqual([
      "display_name",
      "company_name",
      "position",
    ]);
    expect(validateJoin({ ...ok, display_name: "あ".repeat(31) }).display_name).toContain("30字");
  });

  it("経営者は 代表・役員・決裁者", () => {
    expect(isExecutive("ceo")).toBe(true);
    expect(isExecutive("officer")).toBe(true);
    expect(isExecutive("decider")).toBe(true);
    expect(isExecutive("other")).toBe(false);
  });
});

describe("限定の集まりへの申し込み", () => {
  it("前に承認されていれば そのまま参加、はじめてなら 承認待ち", () => {
    expect(gatheringApplyResult({ gathering_approved_at: "2026-09-01" })).toBe("joined");
    expect(gatheringApplyResult({ gathering_approved_at: null })).toBe("pending");
  });

  it("承認待ちは、募集中の限定の集まりで まだ承認していない申し込みだけ（古い順）", () => {
    const qs = [
      { id: "g", members_only: true, status: "open" } as Quest,
      { id: "closed", members_only: true, status: "completed" } as Quest,
      { id: "normal", members_only: false, status: "open" } as Quest,
    ];
    const app = (quest_id: string, user_id: string, patch: Partial<QuestApplication> = {}): QuestApplication => ({
      quest_id,
      user_id,
      message: "",
      status: "applied",
      approved_at: null,
      created_at: "2026-09-10",
      ...patch,
    });
    const apps = [
      app("g", "late", { created_at: "2026-09-12" }),
      app("g", "early"),
      app("g", "approved", { approved_at: "2026-09-11" }),
      app("g", "cancelled", { status: "withdrawn" }),
      app("closed", "x"),
      app("normal", "y"),
    ];
    expect(pendingGatheringApplications(qs, apps).map((a) => a.user_id)).toEqual(["early", "late"]);
  });

  it("見本データ：承認待ちは 石井さん・長谷川さん", () => {
    expect(pendingGatheringApplications(quests, questApplications).map((a) => a.user_id)).toEqual([
      "p-ishii",
      "p-hasegawa",
    ]);
  });
});
