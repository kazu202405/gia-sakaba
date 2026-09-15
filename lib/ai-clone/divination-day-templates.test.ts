// 占術セクションの固定辞書が「穴なく」埋まっていることを守るテスト。
//
// 夜ブリーフィングは毎晩自動で飛ぶので、辞書に1つでも穴があると
// その組み合わせの日だけ本文が undefined になって配信される（気づくのが翌朝）。
// 中心星10種 × 通変5種は本人ごとに使う組み合わせが違い、
// 手元の五島さんのケース（調舒星）では50分の5しか通らないため、
// 実行時のスモークでは残り45パターンの穴を発見できない。ここで全数を見る。

import { describe, it, expect } from "vitest";
import {
  PERSONAL_DAY_ADVICE,
  JUNI_UNSEI_DAY_TONE,
  MONTH_BACKGROUND,
  TENCHUU_DAY_NOTE,
} from "./divination-day-templates";

const RELATIONS = ["比和", "印", "食傷", "財", "官鬼"] as const;
const JUDAI = [
  "貫索星", "石門星", "鳳閣星", "調舒星", "禄存星",
  "司禄星", "車騎星", "牽牛星", "龍高星", "玉堂星",
] as const;
const JUNI = [
  "長生", "沐浴", "冠帯", "臨官", "帝旺", "衰",
  "病", "死", "墓", "絶", "胎", "養",
] as const;

describe("占術セクションの固定辞書", () => {
  it("通変5 × 中心星10 = 50パターンが全て埋まっている", () => {
    const seen = new Set<string>();
    for (const r of RELATIONS) {
      for (const j of JUDAI) {
        const t = PERSONAL_DAY_ADVICE[r][j];
        expect(t, `${r}×${j} が未記入`).toBeTruthy();
        expect(t.length, `${r}×${j} が短すぎる`).toBeGreaterThan(20);
        // 同じ文の使い回しは「型に翻訳する」という設計目的を満たさない
        expect(seen.has(t), `${r}×${j} が他と重複`).toBe(false);
        seen.add(t);
      }
    }
    expect(seen.size).toBe(50);
  });

  it("辞書に「明日」を直書きしていない（toTomorrow が効かなくなるため）", () => {
    const all = [
      ...RELATIONS.flatMap((r) => JUDAI.map((j) => PERSONAL_DAY_ADVICE[r][j])),
      ...JUNI.map((j) => JUNI_UNSEI_DAY_TONE[j]),
      TENCHUU_DAY_NOTE,
    ];
    for (const t of all) {
      expect(t.includes("明日"), `「明日」直書き: ${t.slice(0, 20)}…`).toBe(false);
    }
  });

  it("十二運12種・今月の背景5種が埋まっている", () => {
    for (const j of JUNI) expect(JUNI_UNSEI_DAY_TONE[j], j).toBeTruthy();
    for (const r of RELATIONS) expect(MONTH_BACKGROUND[r], r).toBeTruthy();
  });
});
