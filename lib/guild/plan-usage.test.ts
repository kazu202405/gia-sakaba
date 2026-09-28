import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exhaustedLine, isExhausted, isPlanLimitError, parsePlanUsage, PLAN_LIMITS, quotaLine, remainingOf, searchLevelOf } from "./plan-usage";

const raw = {
  plan: "standard",
  resets_at: "2026-10-01T00:00:00+09:00",
  intro: { limit: 3, used: 1 },
  quest: { limit: 3, used: 3 },
  project: { limit: null, used: 7 },
};

describe("料金の段の使用状況", () => {
  it("返り値を読む・形がおかしければ null（無制限と取り違えない）", () => {
    expect(parsePlanUsage(raw)?.intro).toEqual({ limit: 3, used: 1 });
    expect(parsePlanUsage({ ...raw, plan: "gold" })).toBeNull();
    expect(parsePlanUsage({ ...raw, intro: { used: 1 } })).toBeNull();
    expect(parsePlanUsage({ ...raw, quest: { limit: "3", used: 0 } })).toBeNull();
    expect(parsePlanUsage(null)).toBeNull();
  });

  it("残り・使い切り", () => {
    expect(remainingOf({ limit: 3, used: 1 })).toBe(2);
    expect(remainingOf({ limit: 1, used: 4 })).toBe(0);
    expect(remainingOf({ limit: null, used: 9 })).toBeNull();
    expect(isExhausted({ limit: 3, used: 3 })).toBe(true);
    expect(isExhausted({ limit: null, used: 99 })).toBe(false);
    expect(isExhausted(null)).toBe(false);
  });

  it("画面の言葉", () => {
    expect(quotaLine("intro", "free", { limit: 1, used: 0 })).toBe("今月あと1件（フリー：つながり申請は月1件まで）");
    expect(quotaLine("project", "standard", { limit: 5, used: 3 })).toBe("あと2つ作れます（プラス：プロジェクトは5つまで）");
    expect(quotaLine("quest", "dining", { limit: null, used: 3 })).toBeNull();
    expect(exhaustedLine("intro", "dining", { limit: 10, used: 10 })).toContain("ビジネス");
  });

  it("DBが上限で断ったことを見分ける", () => {
    expect(isPlanLimitError({ code: "53400" })).toBe(true);
    expect(isPlanLimitError({ code: "23505" })).toBe(false);
    expect(isPlanLimitError(null)).toBe(false);
  });
});

describe("名鑑の探し方", () => {
  it("フリーは一覧だけ・プラスは絞り込み・ビジネスと管理者はキーワードまで・読めなければ一覧だけ", () => {
    expect(searchLevelOf("free")).toBe("list");
    expect(searchLevelOf("standard")).toBe("filter");
    expect(searchLevelOf("dining")).toBe("keyword");
    expect(searchLevelOf("exempt")).toBe("keyword");
    expect(searchLevelOf(null)).toBe("list");
  });
});

describe("画面の数とDBの上限", () => {
  it("料金の画面に出す数が migration 0114 の plan_limits と同じ", () => {
    const sql = readFileSync("supabase/migrations/0114_sakaba_plan_limits.sql", "utf8");
    const block = sql.slice(sql.indexOf("insert into sakaba.plan_limits"));
    const rows = Object.fromEntries([...block.matchAll(/\('(free|standard|dining|exempt)', (\w+), (\w+), (\w+)\)/g)]
      .map((m) => [m[1], [m[2], m[3], m[4]].map((v) => v === "null" ? null : Number(v))]));
    expect(Object.keys(rows).sort()).toEqual(["dining", "exempt", "free", "standard"]);
    for (const plan of ["free", "standard", "dining"] as const) {
      const [intro, quest, project] = rows[plan];
      expect({ intro, quest, project }).toEqual(PLAN_LIMITS[plan]);
    }
    expect(rows.exempt).toEqual([null, null, null]);
  });
});
