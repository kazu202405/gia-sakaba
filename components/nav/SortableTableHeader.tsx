"use client";

// テーブル列見出しを「クリックで並び替え」可能にする小さなボタン。
// URL searchParams の `sort` キー（例：`sort=date_desc`）と連動する。
//
// 動作:
//   - 未ソート列をクリック → 該当列の "asc" にする（既定向きを field ごとに指定可）
//   - 既に asc でソート中の列をクリック → "desc" に切り替え
//   - 既に desc の列をクリック → ソート解除（param 削除）
//
// 使い方:
//   <SortableTableHeader field="occurred_at" defaultDir="desc" label="日時" />
//
// 注意:
//   - <Link> ではなく router.push でルーティング更新する（テキストの onClick で挙動が直感的）
//   - 同じ param 名 `sort` を全テーブルで共用する想定。ページ間で重複しない設計。
//   - field 値は呼び出し側で重複しないようユニークに付ける。

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface Props {
  /** sort param の field 名（例：`occurred_at`、`importance`、`due_date`） */
  field: string;
  /** 未ソート → 1回目クリックの向き。デフォルト "asc"。 */
  defaultDir?: "asc" | "desc";
  label: string;
  /** ラベルの揃え方（特に最右列を右寄せにする時など）。 */
  align?: "left" | "right";
}

export function SortableTableHeader({
  field, defaultDir = "asc", label, align = "left",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") ?? "";

  // 現在の状態を判定
  const matchAsc = sort === `${field}_asc`;
  const matchDesc = sort === `${field}_desc`;
  const active = matchAsc || matchDesc;
  const currentDir: "asc" | "desc" | null = matchAsc ? "asc" : matchDesc ? "desc" : null;

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    let next: string | null;
    if (!active) {
      next = `${field}_${defaultDir}`;
    } else if (currentDir === defaultDir) {
      // 反対向きに切り替え
      next = `${field}_${defaultDir === "asc" ? "desc" : "asc"}`;
    } else {
      // ソート解除
      next = null;
    }
    if (next === null) params.delete("sort");
    else params.set("sort", next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase transition-colors ${
        active
          ? "text-[#1c3550] font-bold"
          : "text-gray-500 hover:text-[#1c3550]"
      } ${align === "right" ? "justify-end w-full" : ""}`}
      title={
        active
          ? currentDir === "asc"
            ? `${label}（昇順）。クリックで降順に`
            : `${label}（降順）。クリックで解除`
          : `${label} で並び替え`
      }
    >
      <span>{label}</span>
      {!active && (
        <ChevronsUpDown className="w-3 h-3 opacity-60" aria-hidden />
      )}
      {currentDir === "asc" && <ChevronUp className="w-3 h-3" aria-hidden />}
      {currentDir === "desc" && <ChevronDown className="w-3 h-3" aria-hidden />}
    </button>
  );
}
