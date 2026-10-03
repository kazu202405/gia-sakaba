import { describe, expect, it } from "vitest";
import {
  dueForSave,
  firstDueDate,
  isValidRecurrence,
  nextDueDate,
  recurrenceLabel,
  toDraft,
  toRecurrence,
  validateRecurrenceDraft,
} from "./recurrence";

// DB 側（supabase/migrations/0125 の sakaba.recurrence_next_date）と同じ決まり。
// 2026-10-03 は土曜、2026-10-05 は月曜。

describe("毎週", () => {
  it("基準がその曜日なら +7日", () => {
    expect(nextDueDate("weekly", 1, "2026-10-05", "2026-10-03")).toBe("2026-10-12");
  });
  it("基準が別の曜日なら 基準より後で いちばん近い その曜日", () => {
    // 10/7(水) の次の 月曜 → 10/12
    expect(nextDueDate("weekly", 1, "2026-10-07", "2026-10-03")).toBe("2026-10-12");
    // 10/4(日) の次の 月曜 → 10/5
    expect(nextDueDate("weekly", 1, "2026-10-04", "2026-10-03")).toBe("2026-10-05");
    // 10/5(月) の次の 日曜 → 10/11
    expect(nextDueDate("weekly", 7, "2026-10-05", "2026-10-03")).toBe("2026-10-11");
  });
  it("放置したあとは きょう以降の最初の該当曜日まで進める（きょうも含む）", () => {
    // 基準 9/7(月)、きょう 10/3(土) → 次の月曜は 10/5
    expect(nextDueDate("weekly", 1, "2026-09-07", "2026-10-03")).toBe("2026-10-05");
    // きょうがちょうど月曜
    expect(nextDueDate("weekly", 1, "2026-09-07", "2026-10-05")).toBe("2026-10-05");
    // 基準＋7日 がきょうと同じ日
    expect(nextDueDate("weekly", 1, "2026-09-28", "2026-10-05")).toBe("2026-10-05");
  });
  it("年またぎ", () => {
    expect(nextDueDate("weekly", 5, "2026-12-25", "2026-12-26")).toBe("2027-01-01");
  });
});

describe("毎月◯日", () => {
  it("翌月の◯日", () => {
    expect(nextDueDate("monthly", 25, "2026-10-25", "2026-10-03")).toBe("2026-11-25");
  });
  it("31日は その月の末日に寄せる", () => {
    expect(nextDueDate("monthly", 31, "2026-10-31", "2026-10-03")).toBe("2026-11-30");
    expect(nextDueDate("monthly", 31, "2026-11-30", "2026-10-03")).toBe("2026-12-31");
  });
  it("2月：平年は28日、閏年は29日", () => {
    expect(nextDueDate("monthly", 30, "2027-01-30", "2027-01-01")).toBe("2027-02-28");
    expect(nextDueDate("monthly", 29, "2027-01-29", "2027-01-01")).toBe("2027-02-28");
    expect(nextDueDate("monthly", 30, "2028-01-30", "2028-01-01")).toBe("2028-02-29");
    expect(nextDueDate("monthly", 29, "2028-01-29", "2028-01-01")).toBe("2028-02-29");
  });
  it("基準の日にちに引きずられず 設定の日に戻る（2/28 のあとは 3/31）", () => {
    expect(nextDueDate("monthly", 31, "2027-02-28", "2027-01-01")).toBe("2027-03-31");
  });
  it("12月から翌年1月", () => {
    expect(nextDueDate("monthly", 10, "2026-12-10", "2026-12-01")).toBe("2027-01-10");
  });
  it("放置したあとは きょう以降の最初の該当日まで進める", () => {
    // 基準 7/25、きょう 10/3 → 8/25, 9/25 は過去 → 10/25
    expect(nextDueDate("monthly", 25, "2026-07-25", "2026-10-03")).toBe("2026-10-25");
    // きょうが該当日
    expect(nextDueDate("monthly", 25, "2026-07-25", "2026-10-25")).toBe("2026-10-25");
    // 該当日の翌日なら 翌月へ
    expect(nextDueDate("monthly", 25, "2026-07-25", "2026-10-26")).toBe("2026-11-25");
  });
});

describe("毎月末", () => {
  it("翌月の末日", () => {
    expect(nextDueDate("month_end", null, "2026-10-31", "2026-10-03")).toBe("2026-11-30");
    expect(nextDueDate("month_end", null, "2026-11-30", "2026-10-03")).toBe("2026-12-31");
    expect(nextDueDate("month_end", null, "2026-12-15", "2026-10-03")).toBe("2027-01-31");
  });
  it("2月と閏年", () => {
    expect(nextDueDate("month_end", null, "2027-01-31", "2027-01-01")).toBe("2027-02-28");
    expect(nextDueDate("month_end", null, "2028-01-31", "2028-01-01")).toBe("2028-02-29");
    expect(nextDueDate("month_end", null, "2028-02-29", "2028-02-01")).toBe("2028-03-31");
  });
  it("放置したあとは きょう以降の最初の月末まで進める", () => {
    expect(nextDueDate("month_end", null, "2026-06-30", "2026-10-03")).toBe("2026-10-31");
    expect(nextDueDate("month_end", null, "2026-06-30", "2026-10-31")).toBe("2026-10-31");
  });
});

describe("最初の該当日（しめきりが空のとき入れる日）", () => {
  it("毎週：きょうがその曜日ならきょう、そうでなければ次の その曜日", () => {
    expect(firstDueDate("weekly", 6, "2026-10-03")).toBe("2026-10-03"); // 土曜
    expect(firstDueDate("weekly", 1, "2026-10-03")).toBe("2026-10-05"); // 月曜
    expect(firstDueDate("weekly", 5, "2026-10-03")).toBe("2026-10-09"); // 金曜
  });
  it("毎月◯日：今月まだなら今月、すぎていたら来月", () => {
    expect(firstDueDate("monthly", 25, "2026-10-03")).toBe("2026-10-25");
    expect(firstDueDate("monthly", 3, "2026-10-03")).toBe("2026-10-03");
    expect(firstDueDate("monthly", 1, "2026-10-03")).toBe("2026-11-01");
    expect(firstDueDate("monthly", 31, "2026-11-03")).toBe("2026-11-30");
    expect(firstDueDate("monthly", 10, "2026-12-20")).toBe("2027-01-10");
  });
  it("毎月末：今月の末日", () => {
    expect(firstDueDate("month_end", null, "2026-10-03")).toBe("2026-10-31");
    expect(firstDueDate("month_end", null, "2026-10-31")).toBe("2026-10-31");
    expect(firstDueDate("month_end", null, "2028-02-10")).toBe("2028-02-29");
  });
  it("1月のきょう（前の月＝去年12月）でも壊れない", () => {
    expect(firstDueDate("monthly", 20, "2027-01-05")).toBe("2027-01-20");
    expect(firstDueDate("month_end", null, "2027-01-05")).toBe("2027-01-31");
  });
});

describe("入力と言い方", () => {
  it("種類と日にちの組み合わせ", () => {
    expect(isValidRecurrence("weekly", 7)).toBe(true);
    expect(isValidRecurrence("weekly", 8)).toBe(false);
    expect(isValidRecurrence("weekly", null)).toBe(false);
    expect(isValidRecurrence("monthly", 31)).toBe(true);
    expect(isValidRecurrence("monthly", 32)).toBe(false);
    expect(isValidRecurrence("monthly", 0)).toBe(false);
    expect(isValidRecurrence("month_end", null)).toBe(true);
    expect(isValidRecurrence("month_end", 3)).toBe(false);
  });
  it("不正な組み合わせは計算しない", () => {
    expect(() => nextDueDate("weekly", 9, "2026-10-01", "2026-10-01")).toThrow();
  });
  it("一覧の印の言い方", () => {
    expect(recurrenceLabel("weekly", 1)).toBe("毎週月曜");
    expect(recurrenceLabel("weekly", 7)).toBe("毎週日曜");
    expect(recurrenceLabel("monthly", 25)).toBe("毎月25日");
    expect(recurrenceLabel("month_end", null)).toBe("毎月末");
    expect(recurrenceLabel(null, null)).toBe("");
    expect(recurrenceLabel(undefined, undefined)).toBe("");
  });
  it("画面の入力 ⇄ 保存する値", () => {
    expect(toRecurrence({ choice: "", weekday: "1", monthDay: "1" })).toBeNull();
    expect(toRecurrence({ choice: "weekly", weekday: "3", monthDay: "9" })).toEqual({ kind: "weekly", day: 3 });
    expect(toRecurrence({ choice: "monthly", weekday: "3", monthDay: "9" })).toEqual({ kind: "monthly", day: 9 });
    expect(toRecurrence({ choice: "month_end", weekday: "3", monthDay: "9" })).toEqual({ kind: "month_end", day: null });
    // 保存済みが無いときは しめきり（きょう）の曜日・日にちが初期値
    expect(toDraft(null, null, "2026-10-03")).toEqual({ choice: "", weekday: "6", monthDay: "3" });
    expect(toDraft("monthly", 25, "2026-10-03")).toEqual({ choice: "monthly", weekday: "6", monthDay: "25" });
    expect(toDraft("weekly", 2, "2026-10-03")).toEqual({ choice: "weekly", weekday: "2", monthDay: "3" });
  });
  it("入力チェック", () => {
    expect(validateRecurrenceDraft({ choice: "", weekday: "", monthDay: "" })).toBeNull();
    expect(validateRecurrenceDraft({ choice: "weekly", weekday: "", monthDay: "" })).not.toBeNull();
    expect(validateRecurrenceDraft({ choice: "monthly", weekday: "1", monthDay: "32" })).not.toBeNull();
    expect(validateRecurrenceDraft({ choice: "monthly", weekday: "1", monthDay: "31" })).toBeNull();
    expect(validateRecurrenceDraft({ choice: "month_end", weekday: "", monthDay: "" })).toBeNull();
  });
  it("保存するしめきり：入っていればそのまま、空でくり返しありなら最初の該当日", () => {
    expect(dueForSave("2026-10-20", { kind: "weekly", day: 1 }, "2026-10-03")).toBe("2026-10-20");
    expect(dueForSave("", { kind: "weekly", day: 1 }, "2026-10-03")).toBe("2026-10-05");
    expect(dueForSave("", null, "2026-10-03")).toBeNull();
  });
});
