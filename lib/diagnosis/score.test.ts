import { describe, it, expect } from "vitest";
import { DIMENSIONS, type DimensionKey } from "./questions";
import { scoreDiagnosis, rankFor, type Answers } from "./score";

// ファネル全問を一律 points 点で埋める（前提チェックは未回答＝既定3=フラグ無し）
function uniform(points: number): Answers {
  const a: Answers = {};
  for (const dim of DIMENSIONS) {
    for (const q of dim.questions) a[q.id] = points;
  }
  return a;
}

function withDimension(
  key: DimensionKey,
  points: number,
  other: number
): Answers {
  const a: Answers = {};
  for (const dim of DIMENSIONS) {
    for (const q of dim.questions) a[q.id] = dim.key === key ? points : other;
  }
  return a;
}

describe("rankFor", () => {
  it("S/A/B/C の境界を判定する", () => {
    expect(rankFor(100)).toBe("S");
    expect(rankFor(85)).toBe("S");
    expect(rankFor(84)).toBe("A");
    expect(rankFor(70)).toBe("A");
    expect(rankFor(69)).toBe("B");
    expect(rankFor(50)).toBe("B");
    expect(rankFor(49)).toBe("C");
    expect(rankFor(0)).toBe("C");
  });
});

describe("scoreDiagnosis", () => {
  it("ファネル全問満点なら総合100・ランクS", () => {
    const r = scoreDiagnosis(uniform(3));
    expect(r.total).toBe(100);
    expect(r.rank).toBe("S");
    expect(r.dimensions.every((d) => d.score === 100)).toBe(true);
  });

  it("ファネル全問0点なら総合0・ランクC", () => {
    const r = scoreDiagnosis(uniform(0));
    expect(r.total).toBe(0);
    expect(r.rank).toBe("C");
  });

  it("最低スコアの項目がボトルネックになる", () => {
    const r = scoreDiagnosis(withDimension("closing", 0, 3));
    expect(r.bottleneck.key).toBe("closing");
    expect(r.recommendedServices.length).toBeGreaterThan(0);
  });

  it("単価フラグ：pricing 回答が低いと active になる", () => {
    const a = uniform(3);
    a["pricing-1"] = 0; // 最安級
    const r = scoreDiagnosis(a);
    expect(r.pricing.active).toBe(true);
  });

  it("供給ゲート：捌けていない×集客は十分 → 需要>供給 と判定", () => {
    // 全項目満点（集客=S）＋ capacity-1 を逼迫に
    const a = uniform(3);
    a["capacity-1"] = 0; // よくある（断る/待たせる）
    const r = scoreDiagnosis(a);
    expect(r.supply.active).toBe(true);
    expect(r.supply.message).toContain("需要 > 供給");
  });

  it("前提チェック未回答ならフラグは立たない", () => {
    const r = scoreDiagnosis(uniform(2));
    expect(r.pricing.active).toBe(false);
    expect(r.supply.active).toBe(false);
  });

  it("おすすめ施策は最大6件・ボトルネックの施策を含む", () => {
    const r = scoreDiagnosis(withDimension("awareness", 0, 3));
    expect(r.recommendedServices.length).toBeLessThanOrEqual(6);
    expect(r.recommendedServices).toContain("SNS運用設計");
  });
});
