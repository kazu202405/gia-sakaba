"use client";

// 紐付けピッカー（汎用）。
// 親側で候補（既に紐付け済を除外したリスト）を渡し、選んだら server action を呼ぶ。
// クライアント側の検索（label / sublabel に部分一致）で候補を絞り込む。

import { useMemo, useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle, Search } from "lucide-react";

export interface PickerCandidate {
  id: string;
  label: string;
  sublabel?: string | null;
}

interface Props {
  /** トリガーボタンのラベル例：「+ 関連案件を追加」 */
  triggerLabel: string;
  /** モーダルタイトル例：「案件を紐付け」 */
  title: string;
  /** 既に紐付け済みを除外した候補リスト */
  candidates: PickerCandidate[];
  /** 候補が空の時の文言（候補マスター自体が無い場合） */
  emptyMessage?: string;
  /** 候補クリック時に呼ばれる server action ラッパー */
  onSelect: (candidateId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function LinkPickerDialog({
  triggerLabel,
  title,
  candidates,
  emptyMessage,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return candidates;
    return candidates.filter((c) => {
      const haystack = `${c.label} ${c.sublabel ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [candidates, query]);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setQuery("");
    setError(null);
  };

  const handlePick = (candidateId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await onSelect(candidateId);
      if (!res.ok) {
        setError(res.error ?? "紐付けに失敗しました");
        return;
      }
      setOpen(false);
      setQuery("");
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 text-[11px] font-bold tracking-[0.06em] text-[#1c3550] bg-white hover:bg-gray-50 hover:border-[#1c3550] transition-colors"
      >
        <Plus className="w-3 h-3" />
        {triggerLabel}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6"
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
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
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
                  placeholder="検索（名前で絞り込み）"
                  className="block w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="px-5 py-10 text-[12px] text-gray-500 text-center">
                  {emptyMessage ?? "紐付け候補がありません"}
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-5 py-10 text-[12px] text-gray-500 text-center">
                  「{query}」に一致する候補はありません
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.slice(0, 50).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handlePick(c.id)}
                        disabled={pending}
                        className="block w-full text-left px-5 py-2.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
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
                  {filtered.length > 50 && (
                    <li className="px-5 py-2 text-[11px] text-gray-400 text-center">
                      残り {filtered.length - 50} 件は検索で絞り込んでください
                    </li>
                  )}
                </ul>
              )}
            </div>

            {error && (
              <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]"
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {pending && (
              <div className="px-5 py-2 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-500 flex-shrink-0">
                <Loader2 className="w-3 h-3 animate-spin" />
                紐付け中…
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
