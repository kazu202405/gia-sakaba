"use client";

// 一覧の上に置く「しぼりこみ」と「くわしく／かんたん」。
// 件数が増えても 1画面に入る数を増やすための道具。選んだ見え方は その人のブラウザに覚えさせる。

import { useSyncExternalStore } from "react";
import type { ViewMode } from "@/lib/guild/filters";
import { getServerViewMode, getViewMode, setViewMode, subscribeViewMode } from "@/lib/guild/view-mode-store";
import { cn } from "@/lib/utils";

/** 選ぶボタンの列。選んでいるものは 濃紺、そうでなければ 枠だけ */
export function FilterRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="c-muted w-full text-xs sm:w-auto">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "border-2 border-[#1b2a41] px-2.5 py-1.5 text-xs tabular-nums",
            value === o.value ? "bg-[#1b2a41] text-[#fffdf6]" : "bg-[#fffdf6] text-[#1b2a41]",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** 「くわしく／かんたん」。はじめの描画は サーバーと同じ「くわしく」にして、そのあと 覚えていた方に切り替える */
export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribeViewMode, getViewMode, getServerViewMode);
  return [mode, setViewMode];
}

export function ViewModeSwitch({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex gap-3 text-xs" role="group" aria-label="見せ方">
      {(
        [
          { mode: "full", label: "くわしく" },
          { mode: "compact", label: "かんたん" },
        ] as const
      ).map((o) => (
        <button
          key={o.mode}
          type="button"
          aria-pressed={value === o.mode}
          onClick={() => onChange(o.mode)}
          className={cn("py-1", value === o.mode ? "underline underline-offset-4" : "c-muted")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
