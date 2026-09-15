"use client";

import { useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { createDecisionLog, type DecisionLogInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

function nowLocalDateTimeString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const buildEmptyForm = (): DecisionLogInput => ({
  occurred_at: nowLocalDateTimeString(),
  theme: "",
  conclusion: "",
  reasoning: "",
  values_emphasized: "",
  reusable_rule: "",
  promote_to_core_os: false,
});

export function DecisionLogAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DecisionLogInput>(buildEmptyForm);
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setForm(buildEmptyForm());
    setError(null);
    setShowOptional(false);
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };

  const change = <K extends keyof DecisionLogInput>(
    key: K,
    value: DecisionLogInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createDecisionLog(slug, tenantId, form);
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
        onClick={() => {
          setForm(buildEmptyForm());
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        判断を記録
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
                  判断を記録
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
                  日時 <span className="text-[#c0524a]">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.occurred_at}
                  onChange={(e) => change("occurred_at", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>判断テーマ</label>
                <input
                  type="text"
                  value={form.theme ?? ""}
                  onChange={(e) => change("theme", e.target.value)}
                  placeholder="○○社の見積、△△の依頼を受けるか"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>結論</label>
                <textarea
                  value={form.conclusion ?? ""}
                  onChange={(e) => change("conclusion", e.target.value)}
                  rows={2}
                  placeholder="どう判断したか"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>判断理由</label>
                <textarea
                  value={form.reasoning ?? ""}
                  onChange={(e) => change("reasoning", e.target.value)}
                  rows={3}
                  placeholder="なぜそう判断したか（後から自分でも辿れるように）"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowOptional((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      showOptional ? "rotate-180" : ""
                    }`}
                  />
                  詳細項目（重視した価値観・次回ルール）
                </button>

                {showOptional && (
                  <div className="mt-3 space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className={labelClass}>
                        重視した価値観
                        <span className="ml-2 font-normal text-gray-400">
                          カンマ・スラッシュ・改行で区切る
                        </span>
                      </label>
                      <input
                        type="text"
                        value={form.values_emphasized ?? ""}
                        onChange={(e) =>
                          change("values_emphasized", e.target.value)
                        }
                        placeholder="長期, 信頼, 速度"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>次回使える判断ルール</label>
                      <textarea
                        value={form.reusable_rule ?? ""}
                        onChange={(e) =>
                          change("reusable_rule", e.target.value)
                        }
                        rows={2}
                        placeholder="この判断から抽出できる、次回も使えるルール"
                        className={inputClass + " resize-y"}
                      />
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={form.promote_to_core_os ?? false}
                  onChange={(e) =>
                    change("promote_to_core_os", e.target.checked)
                  }
                  className="w-4 h-4 accent-[#1c3550]"
                />
                <span className="text-[12px] text-gray-700">
                  Core OS（判断基準）に昇格させたい候補としてマーク
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
                  disabled={pending || form.occurred_at.trim().length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  記録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
