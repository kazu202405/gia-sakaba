"use client";

// 見本の表の共通部品。見出しを押すと 昇順 → 降順 → 元の並び。今の向きは ▲▼ で見せる。
// 並べ替えの計算は lib/guild/look/sns-sort.ts（画面ごとに書かない）。

import { useState } from "react";
import { nextSort, sortMark, sortRows, type SortState, type SortValue } from "@/lib/guild/look/sns-sort";

export type SortColumn<T> = {
  key: string;
  label: string;
  /** 並べる値（画面に出す値と同じ計算で）。無い列は操作ボタンだけの列として並べ替えの対象外 */
  value?: (row: T) => SortValue;
  render: (row: T) => React.ReactNode;
};

export function SortTable<T>({ caption, columns, rows, rowKey, pendingRows }: {
  caption: string;
  columns: readonly SortColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  /** 並べ替えの対象にしない行（「追加中…」の仮の行）。いつも一番下 */
  pendingRows?: React.ReactNode;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const sorted = sortRows(rows, sort, (row, key) => columns.find((c) => c.key === key)?.value?.(row));
  const ariaSort = (key: string) => (sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none");

  return (
    <div className="sn-table-wrap">
      <table className="sn-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={c.value ? ariaSort(c.key) : undefined}>
                {c.value ? (
                  <button type="button" className="sn-th-btn" onClick={() => setSort((cur) => nextSort(cur, c.key))}>
                    {c.label}
                    <span className="sn-th-mark" aria-hidden>{sortMark(sort, c.key)}</span>
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => <td key={c.key}>{c.render(row)}</td>)}
            </tr>
          ))}
          {pendingRows}
        </tbody>
      </table>
    </div>
  );
}
