import { describe, it, expect } from "vitest";
import { tokenizeTaskQuery, normalizeTaskName } from "./supabase-db";

// ───────────────────────────────────────────────────────────────
// タスク照合トークナイザの characterization テスト。
//
// 背景：実運用で「井上ともよしさんに話した、完了で」が
//       「井上ともよしさんへの『補助金の話したい』という約束」に
//       連続部分一致せず complete_task が空振りした。
//       → searchTasksByName にトークン重なりフォールバックを追加した。
//
// 誤完了対策（重要）：当初フォールバックは「最長トークンが当たったタスク」を返したが、
//       「議事録入れた」が無関係タスク『…議事録でいけるか？』に当たって誤完了する事故が出た。
//       そこで searchTasksByName 側で「フォールバックを駆動できるのは “テナントに実在する
//       人物名” と一致するトークンだけ」に絞った（searchPeopleByName でゲート）。
//       人物実在チェックは DB 依存なのでここでは単体テストしない。ここで凍結するのは、
//       その手前の tokenizeTaskQuery が「人を指す特徴トークン」を正しく取り出せること。
// ───────────────────────────────────────────────────────────────

describe("tokenizeTaskQuery", () => {
  it("漢字の連続を特徴トークンとして拾い、助詞で割れない", () => {
    // 「井上」が取れれば、searchPeopleByName でその人を引いてタスク照合できる。
    expect(tokenizeTaskQuery("井上ともよしさんに話した")).toContain("井上");
  });

  it("敬称トークン（さん等）は特徴トークンに混ぜない", () => {
    expect(tokenizeTaskQuery("田中さんに連絡した")).not.toContain("さん");
  });

  it("カタカナの固有名も拾える", () => {
    expect(tokenizeTaskQuery("ウェルテックの価格表送った")).toContain(
      "ウェルテック",
    );
  });

  it("一般語も語としては取れる（が、照合は人物ゲートで弾く設計）", () => {
    // 「議事録」を含む漢字トークンが取れてよい（隣接漢字で「議事録入」等になることはある）。
    // 誤完了を防ぐのは searchTasksByName 側の人物実在ゲート
    // （議事録は人名ではないのでフォールバックを駆動しない）。
    const toks = tokenizeTaskQuery("さっき議事録入れた");
    expect(toks.some((t) => t.includes("議事録"))).toBe(true);
  });
});

describe("normalizeTaskName", () => {
  it("助詞・空白・記号を無視して正規化する", () => {
    expect(normalizeTaskName("井上ともよしさんへの「約束」")).toBe(
      normalizeTaskName("井上ともよしさん へ の 約束"),
    );
  });
});
