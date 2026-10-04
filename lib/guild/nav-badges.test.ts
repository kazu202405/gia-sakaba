import { describe, expect, it } from "vitest";
import type { GuildNotification, NotificationKind } from "./types";
import { countNavBadges, formatBadge } from "./nav-badges";

const note = (kind: NotificationKind, read_at: string | null = null): GuildNotification => ({
  id: `${kind}-${read_at}`,
  user_id: "me",
  kind,
  actor_id: "a",
  quest_id: null,
  intro_request_id: null,
  intro_status: null,
  changed_fields: [],
  read_at,
  created_at: "2026-10-03",
});

describe("countNavBadges", () => {
  it("未読だけを、開いた先のメニューごとに数える", () => {
    const badges = countNavBadges([
      note("quest_applied"),
      note("quest_updated"),
      note("intro_progress"),
      note("intro_progress"),
      note("consult_request"),
    ]);
    expect(badges).toEqual({ guild: 2, quests: 2, master: 1, total: 5 });
  });

  it("既読は数えない", () => {
    expect(countNavBadges([note("quest_applied", "2026-10-03"), note("feedback_report", "2026-10-03")]))
      .toEqual({ guild: 0, quests: 0, master: 0, total: 0 });
  });

  it("管理者あての種類は管理者のメニューにだけ数える（会員のメニューには出さない）", () => {
    const badges = countNavBadges([note("consult_request"), note("feedback_report"), note("member_pending")]);
    expect(badges.master).toBe(3);
    expect(badges.guild).toBe(0);
    expect(badges.quests).toBe(0);
  });

  it("知らせが無ければ全部 0（他人の入会やクエストでは増えようがない）", () => {
    expect(countNavBadges([])).toEqual({ guild: 0, quests: 0, master: 0, total: 0 });
  });
});

describe("formatBadge", () => {
  it("0 や不正な値は出さない", () => {
    expect(formatBadge(0)).toBeNull();
    expect(formatBadge(-1)).toBeNull();
    expect(formatBadge(Number.NaN)).toBeNull();
  });
  it("1〜99 はそのまま、100 以上は 99+", () => {
    expect(formatBadge(1)).toBe("1");
    expect(formatBadge(99)).toBe("99");
    expect(formatBadge(100)).toBe("99+");
    expect(formatBadge(5000)).toBe("99+");
  });
});
