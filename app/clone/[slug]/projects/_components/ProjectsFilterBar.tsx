"use client";

// 案件一覧の検索＋フィルタバー。
// URL searchParams（q / status / amount_min / amount_max / due_from / due_to /
// has_action）が真実。並び順はテーブルヘッダー側に任せる。

import { useEffect, useRef, useState } from "react";
import {
  usePathname, useRouter, useSearchParams,
} from "next/navigation";
import { Search, X, Filter, Loader2, Bell } from "lucide-react";
import { MultiSelectDropdown } from "@/components/nav/MultiSelectDropdown";
import { DateRangeInput } from "@/components/nav/DateRangeInput";
import { AmountRangeInput } from "@/components/nav/AmountRangeInput";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "リード", label: "リード" },
  { value: "提案", label: "提案" },
  { value: "進行中", label: "進行中" },
  { value: "受注", label: "受注" },
  { value: "完了", label: "完了" },
  { value: "失注", label: "失注" },
];

function parseCsvParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseNumberParam(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

interface Props {
  filteredCount: number;
  totalCount: number;
}

export function ProjectsFilterBar({ filteredCount, totalCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const statuses = parseCsvParam(searchParams.get("status"));
  const amountMin = parseNumberParam(searchParams.get("amount_min"));
  const amountMax = parseNumberParam(searchParams.get("amount_max"));
  const dueFrom = searchParams.get("due_from");
  const dueTo = searchParams.get("due_to");
  const hasAction = searchParams.get("has_action") === "1";

  const hasActiveFilters =
    q.length > 0
    || statuses.length > 0
    || amountMin !== null
    || amountMax !== null
    || dueFrom !== null
    || dueTo !== null
    || hasAction;

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

  const setMultiParam = (key: string, values: string[]) => {
    if (values.length === 0) setParam(key, null);
    else setParam(key, values.join(","));
  };

  const setAmountRange = (range: { min: number | null; max: number | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (range.min !== null) params.set("amount_min", String(range.min));
    else params.delete("amount_min");
    if (range.max !== null) params.set("amount_max", String(range.max));
    else params.delete("amount_max");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const setDueRange = (range: { from: string | null; to: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (range.from) params.set("due_from", range.from);
    else params.delete("due_from");
    if (range.to) params.set("due_to", range.to);
    else params.delete("due_to");
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
    <section className="bg-white border border-gray-200 rounded-md px-4 sm:px-5 py-3 space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          placeholder="案件名・次のアクションを検索"
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <MultiSelectDropdown
          label="状態"
          options={STATUS_OPTIONS}
          values={statuses}
          onChange={(next) => setMultiParam("status", next)}
        />

        <AmountRangeInput
          label="提案金額"
          min={amountMin}
          max={amountMax}
          unit="万円"
          onChange={setAmountRange}
        />

        <DateRangeInput
          label="期限"
          from={dueFrom}
          to={dueTo}
          onChange={setDueRange}
        />

        <button
          type="button"
          onClick={() => setParam("has_action", hasAction ? null : "1")}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${
            hasAction
              ? "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c] font-bold"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <Bell className="w-3 h-3" aria-hidden />
          次のアクションあり
        </button>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-gray-500 tabular-nums">
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
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#1c3550] transition-colors"
            >
              <Filter className="w-3 h-3" />
              フィルタ解除
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
