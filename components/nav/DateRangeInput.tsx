"use client";

// 日付範囲（from / to）の自由入力。どちらか片方だけ指定も OK。
// 値は ISO 形式の "YYYY-MM-DD"。空文字 → 未指定。
// 親は URL searchParams を経由して値を渡し、onChange で更新する想定。
//
// from > to の不整合は親側でハンドリング（このコンポーネントは生入力をそのまま渡す）。

import { useEffect, useRef, useState } from "react";
import { Calendar, X } from "lucide-react";

interface Props {
  label?: string;
  /** "YYYY-MM-DD" or null。 */
  from: string | null;
  to: string | null;
  onChange: (range: { from: string | null; to: string | null }) => void;
}

export function DateRangeInput({
  label = "期間",
  from, to, onChange,
}: Props) {
  // 入力中の生の値（debounce 用）。空文字でも保持。
  const [fromLocal, setFromLocal] = useState(from ?? "");
  const [toLocal, setToLocal] = useState(to ?? "");
  const lastSynced = useRef({ from: from ?? "", to: to ?? "" });

  // URL（from/to）変化を反映
  useEffect(() => {
    if ((from ?? "") !== lastSynced.current.from) {
      setFromLocal(from ?? "");
      lastSynced.current.from = from ?? "";
    }
  }, [from]);
  useEffect(() => {
    if ((to ?? "") !== lastSynced.current.to) {
      setToLocal(to ?? "");
      lastSynced.current.to = to ?? "";
    }
  }, [to]);

  // 入力 debounce 400ms（input change のたびに URL push しない）
  useEffect(() => {
    const t = setTimeout(() => {
      const nextFrom = fromLocal === "" ? null : fromLocal;
      const nextTo = toLocal === "" ? null : toLocal;
      if (
        (lastSynced.current.from || "") !== (nextFrom ?? "")
        || (lastSynced.current.to || "") !== (nextTo ?? "")
      ) {
        lastSynced.current.from = nextFrom ?? "";
        lastSynced.current.to = nextTo ?? "";
        onChange({ from: nextFrom, to: nextTo });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLocal, toLocal]);

  const clear = () => {
    setFromLocal("");
    setToLocal("");
    lastSynced.current.from = "";
    lastSynced.current.to = "";
    onChange({ from: null, to: null });
  };

  const hasValue = Boolean(from || to);

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] tracking-[0.18em] text-gray-400 uppercase">
        {label}
      </span>
      <div className="inline-flex items-center gap-1">
        <Calendar className="w-3 h-3 text-gray-400" aria-hidden />
        <input
          type="date"
          value={fromLocal}
          onChange={(e) => setFromLocal(e.target.value)}
          aria-label="開始日"
          className="text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-[#1c3550] font-mono"
        />
        <span className="text-gray-300 text-[11px]">〜</span>
        <input
          type="date"
          value={toLocal}
          onChange={(e) => setToLocal(e.target.value)}
          aria-label="終了日"
          className="text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-[#1c3550] font-mono"
        />
        {hasValue && (
          <button
            type="button"
            onClick={clear}
            aria-label="期間をクリア"
            className="inline-flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
