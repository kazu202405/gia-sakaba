"use client";

// 会話ログ一覧の検索＋フィルタバー。
// URL searchParams（q / channel / importance / person / date_from / date_to）を
// 真実とし、各操作で router.push して Server Component のクエリを更新する。
// 検索テキストは debounce 300ms、日付は debounce 400ms。チップ/ドロップダウンは即時反映。
// 並び順はテーブルヘッダー（SortableTableHeader）側に移譲したため、ここからは削除。

import { useEffect, useRef, useState } from "react";
import {
  usePathname, useRouter, useSearchParams,
} from "next/navigation";
import { Search, X, Filter, Loader2 } from "lucide-react";
import { MultiSelectDropdown } from "@/components/nav/MultiSelectDropdown";
import { PersonFilterTypeahead } from "@/components/nav/PersonFilterTypeahead";
import { DateRangeInput } from "@/components/nav/DateRangeInput";

const CHANNEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Slack", label: "Slack" },
  { value: "LINE", label: "LINE" },
  { value: "Email", label: "Email" },
  { value: "対面", label: "対面" },
  { value: "電話", label: "電話" },
  { value: "その他", label: "その他" },
];
const IMPORTANCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "S", label: "S 最重要" },
  { value: "A", label: "A 重要" },
  { value: "B", label: "B 通常" },
  { value: "C", label: "C 参考" },
];

/** カンマ区切り URL param を配列にパース。空要素は除く。 */
function parseCsvParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export interface PersonCandidate {
  id: string;
  label: string;
  sublabel?: string | null;
}

interface Props {
  /** 人物フィルタ用の候補一覧。 */
  peopleCandidates: PersonCandidate[];
  /** フィルタ適用後の件数（page.tsx から SSR 結果を渡す）。 */
  filteredCount: number;
  /** テナント内の総会話件数。 */
  totalCount: number;
}

export function ConversationFilterBar({
  peopleCandidates, filteredCount, totalCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const channels = parseCsvParam(searchParams.get("channel"));
  const importances = parseCsvParam(searchParams.get("importance"));
  const personId = searchParams.get("person") ?? "";
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  const hasActiveFilters =
    q.length > 0
    || channels.length > 0
    || importances.length > 0
    || personId !== ""
    || dateFrom !== null
    || dateTo !== null;

  // 検索ボックスのローカル state。URL とは debounce で同期する。
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

  const setDateRange = (range: { from: string | null; to: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (range.from) params.set("date_from", range.from);
    else params.delete("date_from");
    if (range.to) params.set("date_to", range.to);
    else params.delete("date_to");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // テキスト検索の debounce push
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
    // sort は URL から消さない（ヘッダー側で管理）
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <section className="bg-white border border-gray-200 rounded-md px-4 sm:px-5 py-3 space-y-3">
      {/* テキスト検索 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          placeholder="要約・本文・次のアクションを検索"
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

      {/* フィルタ群（チャンネル＝多値 / 重要度＝多値 / 期間＝自由入力 / 人物＝typeahead） */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <MultiSelectDropdown
          label="チャンネル"
          options={CHANNEL_OPTIONS}
          values={channels}
          onChange={(next) => setMultiParam("channel", next)}
        />

        <MultiSelectDropdown
          label="重要度"
          options={IMPORTANCE_OPTIONS}
          values={importances}
          onChange={(next) => setMultiParam("importance", next)}
        />

        <DateRangeInput
          label="期間"
          from={dateFrom}
          to={dateTo}
          onChange={setDateRange}
        />

        <PersonFilterTypeahead
          candidates={peopleCandidates.map((p) => ({
            id: p.id,
            label: p.label,
            sublabel: p.sublabel ?? null,
          }))}
          value={personId || null}
          onChange={(next) => setParam("person", next)}
        />

        {/* 件数と一括クリア */}
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
