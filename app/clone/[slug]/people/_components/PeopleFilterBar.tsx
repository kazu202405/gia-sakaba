"use client";

// 人物一覧の検索＋フィルタバー。
// URL searchParams（q / importance / temperature / met_context / referrer /
// referrer_q / has_action）が真実。並び順はテーブルヘッダー（SortableTableHeader）側に任せる。

import { useEffect, useRef, useState } from "react";
import {
  usePathname, useRouter, useSearchParams,
} from "next/navigation";
import { Search, X, Filter, Loader2, Bell } from "lucide-react";
import { MultiSelectDropdown } from "@/components/nav/MultiSelectDropdown";

/** referrer multi-select に混ぜる sentinel 値。「(紹介元なし)」を意味する。
 *  page.tsx 側ではこの値を検出して is null フィルタに変換する。 */
export const REFERRER_NONE_SENTINEL = "__none__";

const IMPORTANCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "S", label: "S 最重要" },
  { value: "A", label: "A 重要" },
  { value: "B", label: "B 通常" },
  { value: "C", label: "C 参考" },
];
const TEMPERATURE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "熱い", label: "熱い" },
  { value: "様子見", label: "様子見" },
  { value: "冷えてる", label: "冷えてる" },
];

function parseCsvParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

interface MetContextOption {
  value: string;
  count: number;
}

export interface ReferrerOption {
  id: string;          // person_id
  name: string;
  count: number;       // この人が紹介した人数
  companyName?: string | null;
}

export interface CommunityOption {
  id: string;          // community_id
  name: string;
  count: number;       // 所属人数
}

interface Props {
  filteredCount: number;
  totalCount: number;
  /** met_context のユニーク値一覧（page.tsx で集計して渡す） */
  metContextOptions: MetContextOption[];
  /** industry のユニーク値一覧 */
  industryOptions: MetContextOption[];
  /** 会（コミュニティ）の一覧（所属人数バッジ付き） */
  communityOptions: CommunityOption[];
  /** 紹介元として誰かを紹介したことがある人物の一覧（紹介人数バッジ付き） */
  referrerOptions: ReferrerOption[];
  /** referrer_q にマッチした紹介元の一覧（プレビュー用、上限あり）。
   *  page.tsx 側で referrerOptions を referrer_q で client 絞り込みした結果を渡す。 */
  referrerNameMatches: ReferrerOption[];
}

export function PeopleFilterBar({
  filteredCount, totalCount, metContextOptions, industryOptions, communityOptions,
  referrerOptions, referrerNameMatches,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const importances = parseCsvParam(searchParams.get("importance"));
  const temperatures = parseCsvParam(searchParams.get("temperature"));
  const metContexts = parseCsvParam(searchParams.get("met_context"));
  const industries = parseCsvParam(searchParams.get("industry"));
  const communities = parseCsvParam(searchParams.get("community"));
  const referrers = parseCsvParam(searchParams.get("referrer"));
  const referrerQ = searchParams.get("referrer_q") ?? "";
  const hasAction = searchParams.get("has_action") === "1";

  const hasActiveFilters =
    q.length > 0
    || importances.length > 0
    || temperatures.length > 0
    || metContexts.length > 0
    || industries.length > 0
    || communities.length > 0
    || referrers.length > 0
    || referrerQ.length > 0
    || hasAction;

  const [qLocal, setQLocal] = useState(q);
  const lastSyncedQ = useRef(q);
  useEffect(() => {
    if (q !== lastSyncedQ.current) {
      setQLocal(q);
      lastSyncedQ.current = q;
    }
  }, [q]);

  const [referrerQLocal, setReferrerQLocal] = useState(referrerQ);
  const lastSyncedReferrerQ = useRef(referrerQ);
  useEffect(() => {
    if (referrerQ !== lastSyncedReferrerQ.current) {
      setReferrerQLocal(referrerQ);
      lastSyncedReferrerQ.current = referrerQ;
    }
  }, [referrerQ]);

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

  useEffect(() => {
    if (qLocal === q) return;
    const t = setTimeout(() => {
      lastSyncedQ.current = qLocal;
      setParam("q", qLocal);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  useEffect(() => {
    if (referrerQLocal === referrerQ) return;
    const t = setTimeout(() => {
      lastSyncedReferrerQ.current = referrerQLocal;
      setParam("referrer_q", referrerQLocal);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referrerQLocal]);

  const clearAll = () => {
    setQLocal("");
    lastSyncedQ.current = "";
    setReferrerQLocal("");
    lastSyncedReferrerQ.current = "";
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
          placeholder="名前・よみがな・会社名・役職・業種を検索"
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
          label="重要度"
          options={IMPORTANCE_OPTIONS}
          values={importances}
          onChange={(next) => setMultiParam("importance", next)}
        />

        <MultiSelectDropdown
          label="温度感"
          options={TEMPERATURE_OPTIONS}
          values={temperatures}
          onChange={(next) => setMultiParam("temperature", next)}
        />

        {industryOptions.length > 0 && (
          <MultiSelectDropdown
            label="業種"
            options={industryOptions.map((o) => ({
              value: o.value,
              label: o.value,
              sublabel: o.count > 1 ? `${o.count}名` : null,
            }))}
            values={industries}
            onChange={(next) => setMultiParam("industry", next)}
            minWidth="12rem"
          />
        )}

        {metContextOptions.length > 0 && (
          <MultiSelectDropdown
            label="出会った場所"
            options={metContextOptions.map((o) => ({
              value: o.value,
              label: o.value,
              sublabel: o.count > 1 ? `${o.count}名` : null,
            }))}
            values={metContexts}
            onChange={(next) => setMultiParam("met_context", next)}
            minWidth="14rem"
          />
        )}

        {communityOptions.length > 0 && (
          <MultiSelectDropdown
            label="所属（会）"
            options={communityOptions.map((o) => ({
              value: o.id,
              label: o.name,
              sublabel: o.count > 0 ? `${o.count}名` : null,
            }))}
            values={communities}
            onChange={(next) => setMultiParam("community", next)}
            minWidth="14rem"
            searchPlaceholder="会の名前で検索"
          />
        )}

        {/* 紹介元 multi-select。先頭に「(紹介元なし)」を仮想オプションで混ぜ、
            自分で開拓した人だけ見たい場合と特定の紹介者で絞る場合を 1 つのコントロールに集約。 */}
        <MultiSelectDropdown
          label="紹介元"
          options={[
            {
              value: REFERRER_NONE_SENTINEL,
              label: "(紹介元なし)",
              sublabel: "自分で開拓した人だけ",
              isVirtual: true,
            },
            ...referrerOptions.map((o) => ({
              value: o.id,
              label: o.name,
              sublabel:
                o.count > 1
                  ? `${o.count}名紹介`
                  : o.companyName
                    ? o.companyName
                    : null,
            })),
          ]}
          values={referrers}
          onChange={(next) => setMultiParam("referrer", next)}
          minWidth="14rem"
          searchPlaceholder="名前・会社名で検索"
        />

        {/* 紹介元テキスト検索：ドロップダウンと併用可能。
            入力した文字列が紹介元（referrer）の名前/会社名に部分一致する人を全部拾う。
            ドロップダウンで個別選択した referrer ID と OR で合成される（page.tsx 側）。 */}
        <div className="inline-flex items-center gap-1.5 relative">
          <span className="text-[10px] tracking-[0.18em] text-gray-400 uppercase">
            紹介元名
          </span>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={referrerQLocal}
              onChange={(e) => setReferrerQLocal(e.target.value)}
              placeholder="紹介元名で検索"
              className="w-44 sm:w-52 pl-7 pr-7 py-1 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:border-[#1c3550]"
            />
            {referrerQLocal.length > 0 && referrerQLocal !== referrerQ && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 animate-spin" />
            )}
            {referrerQLocal.length > 0 && referrerQLocal === referrerQ && (
              <button
                type="button"
                onClick={() => setReferrerQLocal("")}
                aria-label="紹介元名検索をクリア"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 次のアクションありトグル（要対応の人を絞る） */}
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

      {/* 紹介元テキスト検索のマッチプレビュー。
          referrer_q が確定（debounce 後の URL 値）された時のみ表示。
          マッチが多すぎる時は先頭 12 件 + 残り N 件 で省略表示。 */}
      {referrerQ.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1 border-t border-gray-100">
          <span className="text-gray-500">
            「<span className="font-semibold text-[#1c3550]">{referrerQ}</span>」にマッチ：
          </span>
          {referrerNameMatches.length === 0 ? (
            <span className="text-gray-400">
              該当する紹介元はいません（紹介実績のある人物のみ対象）
            </span>
          ) : (
            <>
              {referrerNameMatches.slice(0, 12).map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#fbf3e3] border border-[#e6d3a3] text-[#8a5a1c]"
                >
                  <span className="font-medium">{m.name}</span>
                  {m.companyName && (
                    <span className="text-[10px] text-[#a37b3b]">{m.companyName}</span>
                  )}
                  <span className="text-[10px] tabular-nums">
                    {m.count}名
                  </span>
                </span>
              ))}
              {referrerNameMatches.length > 12 && (
                <span className="text-gray-500">
                  ほか {referrerNameMatches.length - 12} 名
                </span>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
