import { describe, expect, it } from "vitest";
import { applyProjectOrder, moveItem, parseProjectOrder } from "./project-order";

const p = (id: string, created_at: string) => ({ id, created_at });

describe("プロジェクトの並び順", () => {
  it("並べ替えたことがなければ、新しい順のまま", () => {
    const list = [p("a", "2026-09-01"), p("b", "2026-09-03"), p("c", "2026-09-02")];
    expect(applyProjectOrder(list, []).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("並べた順に出し、順の無い新しいものは上に出す", () => {
    const list = [p("a", "2026-09-01"), p("b", "2026-09-02"), p("c", "2026-09-03"), p("new", "2026-09-29")];
    expect(applyProjectOrder(list, ["c", "a", "b"]).map((x) => x.id)).toEqual(["new", "c", "a", "b"]);
  });

  it("もう見えないプロジェクトの順は無視する", () => {
    expect(applyProjectOrder([p("a", "2026-09-01")], ["gone", "a"]).map((x) => x.id)).toEqual(["a"]);
  });

  it("1つ上・下へ動かす（端はそのまま）", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });

  it("読んだ並び順の形がおかしければ空", () => {
    expect(parseProjectOrder(["a", 1, null, "b"])).toEqual(["a", "b"]);
    expect(parseProjectOrder(null)).toEqual([]);
  });
});
