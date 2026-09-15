"use client";

import { useState, useTransition } from "react";
import { Pencil, X, Loader2, AlertCircle } from "lucide-react";
import { updateFaq, type FaqInput } from "../_actions";
import { FieldHint } from "../../_components/FieldHint";

interface Props {
  slug: string;
  tenantId: string;
  faqId: string;
  initial: FaqInput;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function FaqEditDialog({ slug, tenantId, faqId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FaqInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setForm(initial);
    setError(null);
  };

  const change = <K extends keyof FaqInput>(key: K, value: FaqInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateFaq(slug, tenantId, faqId, form);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
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
        aria-label="編集"
        className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-[#1c3550] hover:bg-gray-100 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
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

          <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span aria-hidden className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm" />
                <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                  FAQを編集
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

            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                  質問 <span className="text-[#c0524a]">*</span>
                </label>
                <FieldHint section="faq" field="question" />
                <textarea
                  required
                  autoFocus
                  value={form.question}
                  onChange={(e) => change("question", e.target.value)}
                  rows={2}
                  className={inputClass + " text-sm font-medium resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>基本回答</label>
                <FieldHint section="faq" field="base_answer" />
                <textarea
                  value={form.base_answer ?? ""}
                  onChange={(e) => change("base_answer", e.target.value)}
                  rows={4}
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>補足</label>
                <FieldHint section="faq" field="supplement" />
                <textarea
                  value={form.supplement ?? ""}
                  onChange={(e) => change("supplement", e.target.value)}
                  rows={2}
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>注意点</label>
                <FieldHint section="faq" field="caveat" />
                <textarea
                  value={form.caveat ?? ""}
                  onChange={(e) => change("caveat", e.target.value)}
                  rows={2}
                  className={inputClass + " resize-y"}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={form.requires_final_check ?? false}
                  onChange={(e) =>
                    change("requires_final_check", e.target.checked)
                  }
                  className="w-4 h-4 accent-[#1c3550]"
                />
                <span className="text-[12px] text-gray-700">
                  返答前に必ず本人の最終確認を取る
                </span>
              </label>

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
                  type="submit"
                  disabled={pending || form.question.trim().length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
