import { describe, expect, it } from "vitest";
import { formatScheduleLong, formatScheduleShort, fromJstInputValue, toJstInputValue } from "./gathering-schedule";

describe("日程の日時（日本時間）", () => {
  it("保存された日時を日本時間で見せる（UTCの日付をまたいでもずれない）", () => {
    // 2026-10-02 22:30 UTC ＝ 日本時間 10/3(土) 07:30
    expect(formatScheduleShort("2026-10-02T22:30:00Z")).toBe("10/3(土) 07:30");
    expect(formatScheduleLong("2026-10-02T22:30:00Z")).toBe("10月3日（土）07:30");
  });

  it("入力欄との行き来で日時が変わらない", () => {
    const iso = fromJstInputValue("2026-10-03T19:00");
    expect(iso).toBe("2026-10-03T19:00:00+09:00");
    expect(toJstInputValue(iso!)).toBe("2026-10-03T19:00");
    expect(toJstInputValue("2026-10-03T10:00:00Z")).toBe("2026-10-03T19:00");
  });

  it("形のおかしい入力は null", () => {
    expect(fromJstInputValue("")).toBeNull();
    expect(fromJstInputValue("2026-10-03")).toBeNull();
    expect(fromJstInputValue("2026-13-40T99:99")).toBeNull();
  });
});
