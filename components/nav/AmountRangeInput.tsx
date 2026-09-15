"use client";

// 金額範囲（min / max）の自由入力。単位は万円。
// 内部で円換算した数値を親へ通知する（min=空文字→null）。
// DateRangeInput と同じ debounce 400ms パターン。

import { useEffect, useRef, useState } from "react";
import { Coins, X } from "lucide-react";

interface Props {
  label?: string;
  /** 円単位の数値（null = 未指定）。 */
  min: number | null;
  max: number | null;
  /** 単位ヒント。デフォルト「万円」。 */
  unit?: "万円" | "円";
  onChange: (range: { min: number | null; max: number | null }) => void;
}

// 表示は万円単位。"" / 数字以外 → null
function toDisplay(yen: number | null, unit: "万円" | "円"): string {
  if (yen === null) return "";
  if (unit === "円") return String(yen);
  return String(Math.round(yen / 10000));
}

function fromDisplay(text: string, unit: "万円" | "円"): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return unit === "円" ? Math.round(n) : Math.round(n) * 10000;
}

export function AmountRangeInput({
  label = "金額",
  min, max, unit = "万円", onChange,
}: Props) {
  const [minLocal, setMinLocal] = useState(toDisplay(min, unit));
  const [maxLocal, setMaxLocal] = useState(toDisplay(max, unit));
  const lastSynced = useRef({ min, max });

  useEffect(() => {
    if (min !== lastSynced.current.min) {
      setMinLocal(toDisplay(min, unit));
      lastSynced.current.min = min;
    }
  }, [min, unit]);

  useEffect(() => {
    if (max !== lastSynced.current.max) {
      setMaxLocal(toDisplay(max, unit));
      lastSynced.current.max = max;
    }
  }, [max, unit]);

  useEffect(() => {
    const t = setTimeout(() => {
      const nextMin = fromDisplay(minLocal, unit);
      const nextMax = fromDisplay(maxLocal, unit);
      if (
        nextMin !== lastSynced.current.min
        || nextMax !== lastSynced.current.max
      ) {
        lastSynced.current.min = nextMin;
        lastSynced.current.max = nextMax;
        onChange({ min: nextMin, max: nextMax });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minLocal, maxLocal, unit]);

  const clear = () => {
    setMinLocal("");
    setMaxLocal("");
    lastSynced.current.min = null;
    lastSynced.current.max = null;
    onChange({ min: null, max: null });
  };

  const hasValue = min !== null || max !== null;

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] tracking-[0.18em] text-gray-400 uppercase">
        {label}
      </span>
      <div className="inline-flex items-center gap-1">
        <Coins className="w-3 h-3 text-gray-400" aria-hidden />
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={minLocal}
          onChange={(e) => setMinLocal(e.target.value)}
          placeholder="最小"
          aria-label={`最小${unit}`}
          className="w-16 text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-[#1c3550] font-mono text-right"
        />
        <span className="text-[10px] text-gray-400">{unit}</span>
        <span className="text-gray-300 text-[11px]">〜</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={maxLocal}
          onChange={(e) => setMaxLocal(e.target.value)}
          placeholder="最大"
          aria-label={`最大${unit}`}
          className="w-16 text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-[#1c3550] font-mono text-right"
        />
        <span className="text-[10px] text-gray-400">{unit}</span>
        {hasValue && (
          <button
            type="button"
            onClick={clear}
            aria-label="金額をクリア"
            className="inline-flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
