import { describe, expect, it } from "vitest";
import { isSnoozed, SHARE_NUDGE_SNOOZE_MS, snoozeUntil } from "./share-nudge";

const now = Date.parse("2026-10-01T00:00:00Z");

describe("共有URLの案内を「あとで」で隠す", () => {
  it("押した直後は隠れ、3日たつとまた出る", () => {
    const until = String(snoozeUntil(now));
    expect(isSnoozed(until, now + 1000)).toBe(true);
    expect(isSnoozed(until, now + SHARE_NUDGE_SNOOZE_MS)).toBe(false);
  });
  it("何も保存されていない・壊れた値なら隠さない", () => {
    expect(isSnoozed(null, now)).toBe(false);
    expect(isSnoozed("", now)).toBe(false);
    expect(isSnoozed("abc", now)).toBe(false);
    expect(isSnoozed("Infinity", now)).toBe(false);
  });
  it("遠すぎる未来の値で、永久に隠れない", () => {
    expect(isSnoozed(String(now + SHARE_NUDGE_SNOOZE_MS * 100), now)).toBe(false);
  });
});
