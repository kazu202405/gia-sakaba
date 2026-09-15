"use client";

// 詳細ページ右上の「削除」ボタン。
// 不可逆操作なので必ず confirm モーダルで意図確認を挟む。
// 削除成功時は一覧 (/clone/[slug]/people) に router.push で戻る。

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { deletePerson } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  personId: string;
  personName: string;
}

export function PersonDeleteButton({
  slug,
  tenantId,
  personId,
  personName,
}: Props) {
  const router = useRouter();
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
      const res = await deletePerson(slug, tenantId, personId);
      if (!res.ok) {
        setError(res.error ?? "削除に失敗しました");
        return;
      }
      router.push(`/clone/${slug}/people`);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#d8c4be] text-xs font-medium text-[#8a4538] bg-white hover:bg-[#fbf1ee] transition-colors"
      >
        <Trash2 className="w-3 h-3" />
        削除
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="person-delete-title"
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
              <div className="flex items-center gap-3 min-w-0">
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#f3e9e6]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#8a4538]" />
                </span>
                <h2
                  id="person-delete-title"
                  className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]"
                >
                  人物を削除
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
                <span className="font-bold text-[#1c3550]">{personName}</span>{" "}
                を削除します。
              </p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                この人物に紐づく人物メモ・関連リンクもすべて削除されます。元に戻すことはできません。
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
