// 表の並べ替え（見出しを押すと 昇順 → 降順 → 元の並び）。純粋な関数だけ。
// 見本の画面は components/guild/look/sns/sort-table.tsx 経由でここを使う（画面ごとに並べ替えを書かない）。

export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir } | null;
export type SortValue = string | number | null | undefined;

/** 見出しを押したときの次の状態。同じ列なら 昇順 → 降順 → 元の並び、別の列なら昇順から */
export function nextSort(current: SortState, key: string): SortState {
  if (current === null || current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}

/** 見出しに付ける印。並んでいない列は空 */
export function sortMark(current: SortState, key: string): "▲" | "▼" | "" {
  if (current === null || current.key !== key) return "";
  return current.dir === "asc" ? "▲" : "▼";
}

function isEmpty(v: SortValue): v is null | undefined | "" {
  return v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));
}

/**
 * 並べ替えた新しい配列を返す（元の配列は変えない）。
 * 値が無い行は昇順でも降順でも一番下。数は数として、文字は日本語の並びで比べる。同じ値は元の順のまま。
 */
export function sortRows<T>(rows: readonly T[], state: SortState, getValue: (row: T, key: string) => SortValue): T[] {
  if (state === null) return [...rows];
  const sign = state.dir === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: getValue(row, state.key) }))
    .sort((a, b) => {
      const ae = isEmpty(a.value);
      const be = isEmpty(b.value);
      if (ae || be) return ae && be ? a.index - b.index : ae ? 1 : -1;
      let c: number;
      if (typeof a.value === "number" && typeof b.value === "number") c = a.value - b.value;
      else c = String(a.value).localeCompare(String(b.value), "ja");
      return c !== 0 ? c * sign : a.index - b.index;
    })
    .map((x) => x.row);
}
