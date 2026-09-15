"use client";

// 多値選択ドロップダウン。ボタンを押すとチェックボックス付きリストが開き、
// 複数のオプションを ON/OFF できる。URL searchParams にはカンマ区切りで保存する
// 想定（[呼び出し側]で values.join(",") して URL に書く）。
//
// 設計判断:
//   - 開閉は内部 state。外側クリック / Escape で閉じる。
//   - 「すべて」項目は持たず、values が空なら自動的に「すべて」扱い（表示も「すべて」）。
//   - 選択数が増えても可視性を保つため、ボタン表示は label と件数バッジに圧縮。
//   - options が6件以上ある場合、上部に検索入力が自動表示される（明示的に
//     searchable=true/false で制御も可）。
//   - 「(紹介元なし)」のような仮想オプションを使う時は呼び出し側で sentinel 値
//     （例：__none__）を options に混ぜ、isVirtual=true を立てて区切り線を入れる。
//     filter ロジックで sentinel を検出して別 SQL を当てる（呼び出し側責任）。
//
// 使い方例:
//   <MultiSelectDropdown
//     label="状態"
//     options={[{value:"未着手", label:"未着手"}, ...]}
//     values={statusList}
//     onChange={(next) => setParam("status", next.join(","))}
//   />

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** 任意のサブテキスト（例：会社名）。1行に薄文字で添える。 */
  sublabel?: string | null;
  /**
   * 仮想オプション扱い（「(なし)」「(未指定)」など）。
   * UI 上で他の項目と区切り線で分離される（独立した特殊オプションとして見せる）。
   */
  isVirtual?: boolean;
}

interface Props {
  /** ボタン左に出すラベル（例：「状態」）。 */
  label: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
  /** values=[] のときのボタン表示。デフォルト「すべて」。 */
  emptyText?: string;
  /** ドロップダウンの最小幅。 */
  minWidth?: string;
  /**
   * 検索入力の表示制御。指定なしは自動（options.length > 5 で表示）。
   * 強制的に出したい/隠したい時に boolean を渡す。
   */
  searchable?: boolean;
  /** 検索入力の placeholder。 */
  searchPlaceholder?: string;
}

export function MultiSelectDropdown({
  label, options, values, onChange,
  emptyText = "すべて", minWidth = "12rem",
  searchable, searchPlaceholder = "検索...",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const showSearch = searchable ?? options.length > 5;

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

  // 開いた直後にフォーカスを当てる。検索があれば検索 input、なければ先頭項目に。
  // 閉じたタイミングで検索クエリをリセット（次回開いたら全件表示）。
  useEffect(() => {
    if (open) {
      if (showSearch) searchInputRef.current?.focus();
      else firstItemRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [open, showSearch]);

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const clear = () => {
    onChange([]);
    setOpen(false);
  };

  // 検索フィルタ：label + sublabel + value を横断 substring 検索（大文字小文字無視）
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => {
      const text = `${o.label} ${o.sublabel ?? ""} ${o.value}`.toLowerCase();
      return text.includes(q);
    });
  }, [options, query]);

  // 仮想オプションを先頭に、通常オプションを後ろに（順序維持）
  const virtualOpts = filteredOptions.filter((o) => o.isVirtual);
  const normalOpts = filteredOptions.filter((o) => !o.isVirtual);

  const hasSelection = values.length > 0;

  // ボタンの表示テキスト
  let display: string;
  if (!hasSelection) {
    display = emptyText;
  } else if (values.length === 1) {
    display = options.find((o) => o.value === values[0])?.label ?? values[0];
  } else {
    display = `${values.length}件選択中`;
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1.5">
      <span className="text-[10px] tracking-[0.18em] text-gray-400 uppercase">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors max-w-[14rem] ${
          hasSelection
            ? "bg-[#1c3550] border-[#1c3550] text-white font-bold"
            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <span className="truncate">{display}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg overflow-hidden"
          style={{ minWidth }}
        >
          {showSearch && (
            <div className="relative border-b border-gray-100 px-2 py-1.5 bg-gray-50/50">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-6 pr-6 py-1 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:border-[#1c3550]"
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="検索文字をクリア"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-gray-500 text-center">
              一致する候補がありません
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {/* 仮想オプション（先頭） */}
              {virtualOpts.map((opt) => {
                const checked = values.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => toggle(opt.value)}
                      className="w-full text-left px-2.5 py-1.5 text-[12px] italic text-gray-700 hover:bg-gray-50 flex items-center gap-2 focus:outline-none focus:bg-gray-50"
                    >
                      <span
                        className={`flex-shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded border transition-colors ${
                          checked
                            ? "bg-[#1c3550] border-[#1c3550] text-white"
                            : "bg-white border-gray-300"
                        }`}
                        aria-hidden
                      >
                        {checked && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                      </span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  </li>
                );
              })}

              {/* 仮想と通常の区切り線 */}
              {virtualOpts.length > 0 && normalOpts.length > 0 && (
                <li
                  aria-hidden
                  className="my-1 border-t border-gray-100"
                  role="separator"
                />
              )}

              {/* 通常オプション */}
              {normalOpts.map((opt, idx) => {
                const checked = values.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      ref={idx === 0 && virtualOpts.length === 0 ? firstItemRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => toggle(opt.value)}
                      className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-gray-50 flex items-center gap-2 focus:outline-none focus:bg-gray-50"
                    >
                      <span
                        className={`flex-shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded border transition-colors ${
                          checked
                            ? "bg-[#1c3550] border-[#1c3550] text-white"
                            : "bg-white border-gray-300"
                        }`}
                        aria-hidden
                      >
                        {checked && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="truncate text-[10px] text-gray-400">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {hasSelection && (
            <div className="border-t border-gray-100 px-2 py-1">
              <button
                type="button"
                onClick={clear}
                className="text-[10px] text-gray-500 hover:text-[#1c3550]"
              >
                クリア
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
