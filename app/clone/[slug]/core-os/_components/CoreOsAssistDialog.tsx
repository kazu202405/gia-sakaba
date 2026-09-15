"use client";

// Core OS「AIと対話して下書き」ダイアログ。
// 数問に答える → /api/clone/coreos-assist で下書き(JSON)生成 → onApply で親フォームに反映。
// 書き込みはせず、親フォームの欄を埋めるだけ（本人が確認して保存ボタンで確定）。

import { useState, useTransition } from "react";
import { Sparkles, X, Loader2, AlertCircle } from "lucide-react";
import {
  getAssistConfig,
  type AssistableSection,
} from "@/lib/ai-clone/coreOsAssist";

interface Props {
  slug: string;
  section: AssistableSection;
}

// 下書き生成時に飛ばすイベント名。各フォームが listen して自分の section の下書きを反映する。
// ボタン（見出しカード）とフォーム（別カード）を疎結合にするため window イベントで橋渡し。
export const CORE_OS_ASSIST_EVENT = "coreos-assist-draft";
export interface CoreOsAssistDraftDetail {
  section: string;
  draft: Record<string, string>;
}

const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function CoreOsAssistDialog({ slug, section }: Props) {
  const config = getAssistConfig(section);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!config) return null;

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };

  const generate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/clone/coreos-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, section, answers }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          draft?: Record<string, string>;
          error?: string;
        };
        if (!res.ok || !data.draft) {
          setError(data.error ?? "下書きの生成に失敗しました");
          return;
        }
        window.dispatchEvent(
          new CustomEvent<CoreOsAssistDraftDetail>(CORE_OS_ASSIST_EVENT, {
            detail: { section, draft: data.draft },
          }),
        );
        setOpen(false);
        setAnswers({});
      } catch {
        setError("通信に失敗しました。少し待って再試行してください。");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-[#e6d3a3] bg-[#fbf7ee] px-3 py-1.5 text-[12px] font-bold text-[#7a5618] transition-colors hover:bg-[#f7efdd]"
      >
        <Sparkles className="h-3.5 w-3.5" />
        AIと対話して下書き
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
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-[#c08a3e]" />
                <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                  {config.title}
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
              <p className="text-[12px] leading-relaxed text-gray-500">
                いくつかの質問に答えると、AIがこのセクションの下書きを作ります。出来た下書きはフォームに入るので、修正して保存してください。
              </p>

              {config.questions.map((q) => (
                <div key={q.key}>
                  <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-700">
                    {q.label}
                  </label>
                  <textarea
                    value={answers[q.key] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                    }
                    rows={2}
                    placeholder={q.placeholder}
                    className={inputClass + " resize-y"}
                  />
                </div>
              ))}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] px-3 py-2 text-[12px] text-[#8a4538]"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="rounded-md px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={generate}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#1c3550] px-4 py-2 text-xs font-bold tracking-[0.06em] text-white transition-colors hover:bg-[#0f2238] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  下書きを作る
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
