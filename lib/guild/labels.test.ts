import { describe, expect, it } from "vitest";
import { formatJstDate } from "./labels";

describe("formatJstDate", () => {
  it("日時を日本時間の日付にする（UTCでは前の日でも、日本では次の日）", () => {
    expect(formatJstDate("2026-10-09T23:30:00+00:00")).toBe("10月10日");
    expect(formatJstDate("2026-10-10T05:00:00Z")).toBe("10月10日");
  });
});
