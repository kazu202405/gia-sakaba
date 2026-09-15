"use client";

// 複数人物選択ピッカー（ダイアログ内 in-place 選択用）。
// LinkPickerDialog は1件選択即時 server action だが、こちらは選択を state で保持し、
// 親フォームの submit 時にまとめて反映する用途。

import { useMemo, useState } from "react";
import { Plus, X, Search } from "lucide-react";

export interface PersonCandidate {
  id: string;
  label: string;
  sublabel: string | null;
}

interface Props {
  candidates: PersonCandidate[];
  value: string[]; // 選択中の person_id 配列
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function PersonMultiPicker({
  candidates,
  value,
  onChange,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // 高速検索のために id→候補マップを作る
  const byId = useMemo(() => {
    const m = new Map<string, PersonCandidate>();
    for (const c of candidates) m.set(c.id, c);
    return m;
  }, [candidates]);

  // 選択済みの chip 表示用
  const selected = useMemo(
    () =>
      value
        .map((id) => byId.get(id))
        .filter((c): c is PersonCandidate => Boolean(c)),
    [value, byId],
  );

  // モーダル内の候補：未選択 + 検索フィルタ
  const filteredCandidates = useMemo(() => {
    const selectedSet = new Set(value);
    const unselected = candidates.filter((c) => !selectedSet.has(c.id));
    const q = query.trim().toLowerCase();
    if (q.length === 0) return unselected;
    return unselected.filter((c) => {
      const hay = `${c.label} ${c.sublabel ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [candidates, value, query]);

  const add = (id: string) => {
    if (value.includes(id)) return;
    onChange([...value, id]);
  };

  const remove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selected.length === 0 && (
          <span className="text-[12px] text-gray-400">未選択</span>
        )}
        {selected.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-[#1c3550]/5 border border-[#1c3550]/20 text-[12px] text-[#1c3550]"
          >
            <span>{p.label}</span>
            <button
              type="button"
              onClick={() => remove(p.id)}
              disabled={disabled}
              className="inline-flex items-center justify-center w-4 h-4 rounded text-[#1c3550]/60 hover:text-[#1c3550] hover:bg-[#1c3550]/10 disabled:opacity-40"
              aria-label={`${p.label}を削除`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-gray-300 text-[11px] font-bold tracking-[0.06em] text-[#1c3550] bg-white hover:bg-gray-50 hover:border-[#1c3550] disabled:opacity-40 transition-colors"
        >
          <Plus className="w-3 h-3" />
          人物を追加
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm"
                />
                <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                  人物を選ぶ
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="検索（名前 / 会社で絞り込み）"
                  className="block w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="px-5 py-10 text-[12px] text-gray-500 text-center">
                  人物マスターに登録がありません
                </p>
              ) : filteredCandidates.length === 0 ? (
                <p className="px-5 py-10 text-[12px] text-gray-500 text-center">
                  {value.length > 0 && query.length === 0
                    ? "全員選択済みです"
                    : `「${query}」に一致する人物はいません`}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredCandidates.slice(0, 50).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => add(c.id)}
                        className="block w-full text-left px-5 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <p className="text-sm text-[#1c3550] font-medium leading-snug">
                          {c.label}
                        </p>
                        {c.sublabel && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {c.sublabel}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                  {filteredCandidates.length > 50 && (
                    <li className="px-5 py-2 text-[11px] text-gray-400 text-center">
                      残り {filteredCandidates.length - 50} 件は検索で絞り込んでください
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-gray-500">
                選択中: {value.length}人
              </span>
              <button
                type="button"
                onClick={close}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-[#1c3550] hover:bg-[#0f2238] transition-colors"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
