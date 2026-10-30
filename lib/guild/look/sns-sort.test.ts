import { describe, expect, it } from "vitest";
import { nextSort, sortMark, sortRows } from "./sns-sort";

type Row = { id: string; name: string | null; n: number | null };
const get = (r: Row, key: string) => (key === "name" ? r.name : r.n);
const rows: Row[] = [
  { id: "a", name: "さとう", n: 3 },
  { id: "b", name: null, n: 10 },
  { id: "c", name: "あおき", n: null },
  { id: "d", name: "やまもと", n: 2 },
  { id: "e", name: "", n: 2 },
];
const ids = (list: Row[]) => list.map((r) => r.id);

describe("見出しを押したときの切り替え", () => {
  it("昇順 → 降順 → 元の並び → 昇順", () => {
    const s1 = nextSort(null, "name");
    expect(s1).toEqual({ key: "name", dir: "asc" });
    const s2 = nextSort(s1, "name");
    expect(s2).toEqual({ key: "name", dir: "desc" });
    expect(nextSort(s2, "name")).toBeNull();
  });
  it("別の列を押したら、その列の昇順から", () => {
    expect(nextSort({ key: "name", dir: "desc" }, "n")).toEqual({ key: "n", dir: "asc" });
  });
  it("▲▼の印は、並んでいる列だけ", () => {
    expect(sortMark({ key: "name", dir: "asc" }, "name")).toBe("▲");
    expect(sortMark({ key: "name", dir: "desc" }, "name")).toBe("▼");
    expect(sortMark({ key: "name", dir: "asc" }, "n")).toBe("");
    expect(sortMark(null, "name")).toBe("");
  });
});

describe("並べ替え", () => {
  it("並べないときは元の順のまま（元の配列は変えない）", () => {
    const copy = [...rows];
    expect(ids(sortRows(rows, null, get))).toEqual(["a", "b", "c", "d", "e"]);
    expect(rows).toEqual(copy);
  });
  it("文字は日本語の並び。値が無い行は昇順でも降順でも一番下", () => {
    expect(ids(sortRows(rows, { key: "name", dir: "asc" }, get))).toEqual(["c", "a", "d", "b", "e"]);
    expect(ids(sortRows(rows, { key: "name", dir: "desc" }, get))).toEqual(["d", "a", "c", "b", "e"]);
  });
  it("数は数として比べる。値が無い行は下。同じ値は元の順", () => {
    expect(ids(sortRows(rows, { key: "n", dir: "asc" }, get))).toEqual(["d", "e", "a", "b", "c"]);
    expect(ids(sortRows(rows, { key: "n", dir: "desc" }, get))).toEqual(["b", "a", "d", "e", "c"]);
  });
  it("数は文字の並びにならない（9 は 10 より小さい）", () => {
    const r: Row[] = [{ id: "x", name: null, n: 10 }, { id: "y", name: null, n: 9 }];
    expect(ids(sortRows(r, { key: "n", dir: "asc" }, get))).toEqual(["y", "x"]);
  });
});
