"use client";

// /clone/[slug] 配下の一覧行で使う、汎用の削除ボタン（小サイズ）。
// confirm モーダル付き。Server Action を引数で受け取って実行する。
// 各エンティティで個別に DeleteButton を作っていたら冗長なので統一。

import { useState, useTransition } from "react";
import { Trash2, X, Loader2, AlertCircle, AlertTriangle } from "lucide-react";

interface Props {
  /** 削除対象の表示名（モーダルで「○○ を削除します」と表示） */
  itemName: string;
  /** モーダル中央のサブテキスト（任意。例：紐づく〜も削除されます） */
  consequenceText?: string;
  /** 実際の削除処理。Server Action を呼ぶ関数。{ok, error}を返す */
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}

export function RowDeleteButton({
  itemName,
  consequenceText,
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await onConfirm();
      if (!res.ok) {
        setError(res.error ?? "削除に失敗しました");
        return;
      }
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="削除"
        className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-[#8a4538] hover:bg-[#f3e9e6] transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          // このモーダルは行（onClick で編集ダイアログを開く要素）の DOM 子孫として
          // 描画されるため、portal していない。確認モーダル内のクリック/キー操作が
          // 行まで伝播すると「削除したのに編集ダイアログが開く」誤動作になるので、
          // ここで伝播を止める（行の onClick / onKeyDown を発火させない）。
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-md shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
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

            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-bold text-[#1c3550]">{itemName}</span>{" "}
                を削除します。
              </p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                {consequenceText ?? "元に戻すことはできません。"}
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
                  onClick={close}
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
