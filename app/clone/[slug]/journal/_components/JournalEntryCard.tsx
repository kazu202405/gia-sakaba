"use client";

// 日記の 1 エントリ＝1 日分のカード。カード全体クリックで編集ダイアログが開く。
//
// 編集対象:
//   * content（同日複数投稿は "--- HH:MM" 区切りで結合された 1 本のテキスト）
//   * summary（AI 要約。null も許可）
// entry_date は (tenant_id, entry_date) UNIQUE 制約があるので編集不可。
// 日付を直したい場合は削除→Slack で再投稿する運用にする。

import { useState, useTransition } from "react";
import { X, Loader2, AlertCircle, Trash2, AlertTriangle } from "lucide-react";
import { EditorialCard } from "@/app/admin/_components/EditorialChrome";
import { updateJournalEntry, deleteJournalEntry } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  entryId: string;
  entryDate: string;
  initialContent: string;
  initialSummary: string | null;
}

function formatJpDate(dateStr: string): {
  year: number; month: number; day: number; weekday: string;
} {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getUTCDay()];
  return { year: y, month: m, day: d, weekday };
}

export function JournalEntryCard({
  slug, tenantId, entryId, entryDate, initialContent, initialSummary,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dateParts = formatJpDate(entryDate);

  const reset = () => {
    setContent(initialContent);
    setSummary(initialSummary ?? "");
    setError(null);
    setConfirmDelete(false);
  };

  const close = () => {
    if (pending) return;
    reset();
    setOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateJournalEntry(slug, tenantId, entryId, {
        content,
        summary: summary || null,
      });
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      setOpen(false);
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteJournalEntry(slug, tenantId, entryId);
      if (!res.ok) {
        setError(res.error ?? "削除に失敗しました");
        return;
      }
      setConfirmDelete(false);
      setOpen(false);
    });
  };

  return (
    <>
      {/* カード本体（クリックで編集ダイアログ起動） */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c3550]/40 rounded-md"
      >
        <EditorialCard className="px-5 py-4 hover:border-[#1c3550]/30 hover:bg-gray-50/40 transition-colors">
          <div className="flex items-baseline gap-3 mb-2">
            <div className="font-serif text-[#1c3550]">
              <span className="text-2xl font-bold tabular-nums">{dateParts.day}</span>
              <span className="text-[11px] text-gray-500 ml-1">
                {dateParts.month}月（{dateParts.weekday}）
              </span>
            </div>
            {initialSummary && (
              <p className="text-[12px] text-gray-600 leading-relaxed flex-1">
                {initialSummary}
              </p>
            )}
          </div>
          <pre className="whitespace-pre-wrap font-sans text-[13px] text-gray-700 leading-relaxed">
            {initialContent}
          </pre>
        </EditorialCard>
      </div>

      {/* 編集ダイアログ */}
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

          <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span aria-hidden className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm" />
                <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                  {dateParts.year}年{dateParts.month}月{dateParts.day}日（{dateParts.weekday}）の日記
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

            <form onSubmit={handleSave} className="px-5 py-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                  要約
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="1〜3 行の要約（任意。AI が自動生成したものを上書きできます）"
                  className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                  本文 <span className="text-[#c0524a]">*</span>
                </label>
                <textarea
                  required
                  autoFocus
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={14}
                  className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10 resize-y font-mono"
                />
                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  同じ日に複数回 Slack で送ったものは「--- HH:MM」で区切られています。1 本のテキストとして編集可能。
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]"
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#8a4538] hover:bg-[#f3e9e6] disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  この日の日記を削除
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="px-3 py-2 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={pending || content.trim().length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    保存する
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ（編集ダイアログの上に重ねて表示） */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => !pending && setConfirmDelete(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-md shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 flex items-center gap-3">
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#f3e9e6]"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#8a4538]" />
              </span>
              <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                削除の確認
              </h2>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-bold text-[#1c3550]">
                  {dateParts.year}年{dateParts.month}月{dateParts.day}日
                </span>{" "}
                の日記を削除します。
              </p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                元に戻すことはできません。同じ日に Slack から再投稿すれば新規エントリとして作り直せます。
              </p>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]"
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={pending}
                  className="px-3 py-2 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#8a4538] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#6f372d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
