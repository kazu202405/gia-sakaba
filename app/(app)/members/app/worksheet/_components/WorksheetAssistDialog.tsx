"use client";

// 紹介設計ワークシート「コーチと磨く」ダイアログ。
// 開くと現状記入を /api/coach/worksheet-assist に送り、コーチが「深掘りの問い2つ＋改善案」を返す。
// 本人が改善案を編集して「採用」→ onApply で親フォームの値を更新（既存の自動保存に乗る）。
// 書き込みはここではしない（採用後の onChange 経由で保存される）。

import { useState, useTransition } from "react";
import { Sparkles, X, Loader2, AlertCircle, Check } from "lucide-react";

interface Props {
  fieldId: string;
  fieldLabel: string;
  currentValue: string;
  onApply: (text: string) => void;
}

export function WorksheetAssistDialog({
  fieldId,
  fieldLabel,
  currentValue,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/coach/worksheet-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fieldId, currentValue }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          questions?: string[];
          draft?: string;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "生成に失敗しました");
          return;
        }
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setDraft(typeof data.draft === "string" ? data.draft : "");
        setLoaded(true);
      } catch {
        setError("通信に失敗しました。少し待って再試行してください。");
      }
    });
  };

  const openAndGenerate = () => {
    setOpen(true);
    setError(null);
    setLoaded(false);
    setQuestions([]);
    setDraft("");
    generate();
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openAndGenerate}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11.5px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
      >
        <Sparkles className="h-3.5 w-3.5" />
        コーチと磨く
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center sm:p-6"
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">
                  コーチと磨く：{fieldLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                aria-label="閉じる"
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {pending && !loaded && (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  コーチが読んでいます…
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loaded && (
                <>
                  {questions.length > 0 && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                      <p className="mb-1.5 text-[11px] font-bold tracking-wider text-gray-500">
                        コーチからの問い
                      </p>
                      <ul className="space-y-1 text-[13px] leading-relaxed text-slate-700">
                        {questions.map((q, i) => (
                          <li key={i}>・{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-700">
                      改善案（編集できます）
                    </label>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={4}
                      className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-gray-400 focus:bg-white focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={generate}
                  disabled={pending}
                  className="rounded-md px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
                >
                  {pending ? "生成中…" : "作り直す"}
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={pending || !draft.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-xs font-bold tracking-[0.06em] text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  この案を採用
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
