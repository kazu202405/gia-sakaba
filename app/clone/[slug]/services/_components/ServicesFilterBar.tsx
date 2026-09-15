"use client";

// サービス一覧の軽量フィルタバー（テキスト検索のみ）。
// サービスは通常少数（10〜30件程度）なので、検索だけで十分という判断。
// 並び順はテーブルヘッダー（SortableTableHeader）側に任せる。

import { useEffect, useRef, useState } from "react";
import {
  usePathname, useRouter, useSearchParams,
} from "next/navigation";
import { Search, X, Filter, Loader2 } from "lucide-react";

interface Props {
  filteredCount: number;
  totalCount: number;
}

export function ServicesFilterBar({ filteredCount, totalCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const hasActiveFilters = q.length > 0;

  const [qLocal, setQLocal] = useState(q);
  const lastSyncedQ = useRef(q);
  useEffect(() => {
    if (q !== lastSyncedQ.current) {
      setQLocal(q);
      lastSyncedQ.current = q;
    }
  }, [q]);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  useEffect(() => {
    if (qLocal === q) return;
    const t = setTimeout(() => {
      lastSyncedQ.current = qLocal;
      setParam("q", qLocal);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  const clearAll = () => {
    setQLocal("");
    lastSyncedQ.current = "";
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <section className="bg-white border border-gray-200 rounded-md px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          placeholder="サービス名・対象者・解決する悩み・料金を検索"
          className="w-full border border-gray-200 rounded pl-8 pr-9 py-2 text-sm bg-white focus:outline-none focus:border-[#1c3550]"
        />
        {qLocal.length > 0 && qLocal !== q && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
        )}
        {qLocal.length > 0 && qLocal === q && (
          <button
            type="button"
            onClick={() => setQLocal("")}
            aria-label="検索文字をクリア"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap">
          {hasActiveFilters ? (
            <>
              <span className="font-bold text-[#1c3550]">{filteredCount}</span>
              <span className="mx-1 text-gray-300">/</span>
              <span>{totalCount}</span>
              <span className="ml-1">件</span>
            </>
          ) : (
            <>
              <span className="font-bold text-[#1c3550]">{totalCount}</span>
              <span className="ml-1">件</span>
            </>
          )}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#1c3550] transition-colors whitespace-nowrap"
          >
            <Filter className="w-3 h-3" />
            検索解除
          </button>
        )}
      </div>
    </section>
  );
}
