"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle } from "lucide-react";
import { createFaq, type FaqInput } from "../_actions";
import { FieldHint } from "../../_components/FieldHint";
import {
  CORE_OS_ASSIST_EVENT,
  type CoreOsAssistDraftDetail,
} from "../../_components/CoreOsAssistDialog";

interface Props {
  slug: string;
  tenantId: string;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

const emptyForm: FaqInput = {
  question: "",
  base_answer: "",
  supplement: "",
  caveat: "",
  requires_final_check: false,
};

export function FaqAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FaqInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 見出しの「AIと対話して下書き」が生成した下書きを受け取り、フォームに入れてダイアログを開く。
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CoreOsAssistDraftDetail>).detail;
      if (detail?.section !== "faq" || !detail.draft) return;
      const draft = detail.draft;
      setForm((prev) => {
        const next = { ...prev };
        (Object.keys(prev) as (keyof FaqInput)[]).forEach((k) => {
          const v = draft[k as string];
          if (typeof v === "string" && v.trim().length > 0) {
            (next as Record<string, unknown>)[k] = v;
          }
        });
        return next;
      });
      setError(null);
      setOpen(true);
    };
    window.addEventListener(CORE_OS_ASSIST_EVENT, handler);
    return () => window.removeEventListener(CORE_OS_ASSIST_EVENT, handler);
  }, []);

  const reset = () => {
    setForm(emptyForm);
    setError(null);
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };

  const change = <K extends keyof FaqInput>(key: K, value: FaqInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createFaq(slug, tenantId, form);
      if (!res.ok) {
        setError(res.error ?? "登録に失敗しました");
        return;
      }
      setOpen(false);
      reset();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        FAQを追加
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
                  FAQを追加
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
                  placeholder="他社との違いは何ですか？"
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
                  placeholder="標準で返したい回答（あなたの言葉で）"
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
                  placeholder="もう一段聞かれたら追加で出す情報"
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
                  placeholder="この回答を返す時に気をつけること"
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
                  登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
