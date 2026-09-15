"use client";

// /clone/[slug]/services 追加ダイアログ。people / projects と同パターン。

import { useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { createService, type ServiceInput } from "../_actions";
import { ReferralReadinessSection } from "./ReferralReadinessSection";

interface Props {
  slug: string;
  tenantId: string;
}

const emptyForm: ServiceInput = {
  name: "",
  target_audience: "",
  problem_solved: "",
  offering: "",
  pricing: "",
  onboarding_flow: "",
  faq_text: "",
  good_fit: "",
  bad_fit: "",
  usp: "",
  buying_reason: "",
  referral_one_liner: "",
};

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function ServiceAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ServiceInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setForm(emptyForm);
    setError(null);
    setShowOptional(false);
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };

  const change = <K extends keyof ServiceInput>(
    key: K,
    value: ServiceInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createService(slug, tenantId, form);
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
        サービスを追加
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-add-title"
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
              <div className="flex items-center gap-3 min-w-0">
                <span
                  aria-hidden
                  className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm flex-shrink-0"
                />
                <h2
                  id="service-add-title"
                  className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]"
                >
                  サービスを追加
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
                  サービス名 <span className="text-[#c0524a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="経営者向けコーチング"
                  className={inputClass + " text-sm font-medium"}
                />
              </div>

              <div>
                <label className={labelClass}>対象者</label>
                <input
                  type="text"
                  value={form.target_audience ?? ""}
                  onChange={(e) => change("target_audience", e.target.value)}
                  placeholder="売上1〜5億の創業期経営者"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>料金</label>
                <input
                  type="text"
                  value={form.pricing ?? ""}
                  onChange={(e) => change("pricing", e.target.value)}
                  placeholder="月額50,000円〜"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>解決する悩み</label>
                <textarea
                  value={form.problem_solved ?? ""}
                  onChange={(e) => change("problem_solved", e.target.value)}
                  rows={2}
                  placeholder="判断疲れで本来の戦略思考に時間が取れない"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>提供内容</label>
                <textarea
                  value={form.offering ?? ""}
                  onChange={(e) => change("offering", e.target.value)}
                  rows={3}
                  placeholder="月2回の1on1セッション・テキスト相談・経営判断のフレームワーク提供"
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
                  詳細項目（導入の流れ・FAQ・向き不向き）
                </button>

                {showOptional && (
                  <div className="mt-3 space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className={labelClass}>導入の流れ</label>
                      <textarea
                        value={form.onboarding_flow ?? ""}
                        onChange={(e) =>
                          change("onboarding_flow", e.target.value)
                        }
                        rows={2}
                        placeholder="無料相談 → ご契約 → 初回ヒアリング → 月2回セッション開始"
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>FAQ・よくある質問</label>
                      <textarea
                        value={form.faq_text ?? ""}
                        onChange={(e) => change("faq_text", e.target.value)}
                        rows={3}
                        placeholder="Q. 途中解約は可能？ A. ..."
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>提案に向く相手</label>
                      <textarea
                        value={form.good_fit ?? ""}
                        onChange={(e) => change("good_fit", e.target.value)}
                        rows={2}
                        placeholder="意思決定スピードを上げたい・自分の判断軸を言語化したい"
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        提案しない方がいい相手
                      </label>
                      <textarea
                        value={form.bad_fit ?? ""}
                        onChange={(e) => change("bad_fit", e.target.value)}
                        rows={2}
                        placeholder="即答・即解決を求める方・実行は他人任せの方"
                        className={inputClass + " resize-y"}
                      />
                    </div>
                  </div>
                )}
              </div>

              <ReferralReadinessSection form={form} onChange={change} />

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
                  disabled={pending || form.name.trim().length === 0}
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
