"use client";

// 人物フィルタ用 typeahead（入力で絞り込み＋候補リストから選択）。
// /admin/divination の SubjectPicker と似ているが、こちらは「フィルタ用途」なので
// 親が候補配列を渡してくる前提（DB 検索なし、純クライアント絞り込み）。
// 親は `value` に person_id を保持し、`onChange(personId | null)` を実装する。
//
// UX:
//   - 入力で候補リストの substring 絞り込み（ラベル + サブラベル両方を対象）
//   - 候補クリックで選択 → input には選択中の名前を表示、入力解除でリセット
//   - X ボタンで選択クリア
//   - 外側クリック / Esc で閉じる

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";

export interface PersonOption {
  id: string;
  label: string;
  sublabel?: string | null;
}

interface Props {
  candidates: PersonOption[];
  /** 選択中の person_id。null/空文字なら未選択。 */
  value: string | null;
  /** 選択変更通知。null を渡されたら解除。 */
  onChange: (next: string | null) => void;
  /** バーラベル（例：「人物」）。 */
  label?: string;
  placeholder?: string;
}

export function PersonFilterTypeahead({
  candidates, value, onChange,
  label = "人物",
  placeholder = "名前で検索 / 候補から選択",
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (value ? candidates.find((c) => c.id === value) ?? null : null),
    [value, candidates],
  );

  // 外側クリック / Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 候補の substring 絞り込み（label + sublabel 両方）。
  const filtered = useMemo(() => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return candidates.slice(0, 50);
    return candidates
      .filter((c) =>
        c.label.toLowerCase().includes(trimmed)
        || (c.sublabel ?? "").toLowerCase().includes(trimmed),
      )
      .slice(0, 50);
  }, [input, candidates]);

  const pick = (opt: PersonOption) => {
    onChange(opt.id);
    setInput("");
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setInput("");
  };

  return (
    <div
      ref={containerRef}
      className="inline-flex items-center gap-1.5 relative"
    >
      <span className="text-[10px] tracking-[0.18em] text-gray-400 uppercase">
        {label}
      </span>

      {selected ? (
        // 選択済み表示：チップ風で名前 + ✕
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded border bg-[#1c3550] border-[#1c3550] text-white text-[11px] font-bold max-w-[14rem]">
          <span className="truncate">{selected.label}</span>
          <button
            type="button"
            onClick={clear}
            aria-label="人物フィルタを解除"
            className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded hover:bg-white/20 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        // 未選択：input ボックス
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-44 sm:w-56 pl-7 pr-7 py-1 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:border-[#1c3550]"
          />
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
      )}

      {/* dropdown */}
      {open && !selected && (
        <div className="absolute z-30 top-full left-[3rem] mt-1 w-64 bg-white border border-gray-200 rounded shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-gray-500 text-center">
              一致する人物がいません
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                  >
                    <div className="truncate font-medium text-[#1c3550]">
                      {c.label}
                    </div>
                    {c.sublabel && (
                      <div className="truncate text-[10px] text-gray-400">
                        {c.sublabel}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
