"use client";

// 判断事例の追加ダイアログ。
// ショート版（5項目）が既定、「ロング版に切り替え」で追加5項目も入力可。
// AI 補完は Phase 3 以降。ここでは純粋に手入力フォームのみ。

import { useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { createDecisionCase, type DecisionCaseInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

const emptyForm: DecisionCaseInput = {
  event: "",
  insight: "",
  action: "",
  outcome: "",
  takeaway: "",
  intent: "",
  boundary: "",
  reflection: "",
  reusable_when: "",
  emotion: "",
  capture_mode: "short",
  occurred_at: "",
};

export function CaseAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DecisionCaseInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [longMode, setLongMode] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setForm(emptyForm);
    setError(null);
    setLongMode(false);
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };

  const change = <K extends keyof DecisionCaseInput>(
    key: K,
    value: DecisionCaseInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createDecisionCase(slug, tenantId, {
        ...form,
        capture_mode: longMode ? "long" : "short",
      });
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
        事例を記録
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
                  事例を記録
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
              {/* ── 必須：出来事 ──────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                  何があった？ <span className="text-[#c0524a]">*</span>
                </label>
                <textarea
                  required
                  autoFocus
                  value={form.event}
                  onChange={(e) => change("event", e.target.value)}
                  rows={3}
                  placeholder="今日こんな相談があった、こういう状況だった、など"
                  className={inputClass + " resize-y text-sm"}
                />
              </div>

              {/* ── ショート版 残り4項目 ───────────────── */}
              <div>
                <label className={labelClass}>本当は何が問題と思った？</label>
                <textarea
                  value={form.insight ?? ""}
                  onChange={(e) => change("insight", e.target.value)}
                  rows={2}
                  placeholder="表面の悩みじゃなく、本質的にここがネックだった、など"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>何と言った／何をした？</label>
                <textarea
                  value={form.action ?? ""}
                  onChange={(e) => change("action", e.target.value)}
                  rows={2}
                  placeholder="実際の発言・行動・指示など"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>どうなった？</label>
                <textarea
                  value={form.outcome ?? ""}
                  onChange={(e) => change("outcome", e.target.value)}
                  rows={2}
                  placeholder="相手や状況の変化、結果（短期で OK）"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>
                  一言で言うと？
                  <span className="ml-2 font-normal text-gray-400">
                    （学び・原則化候補）
                  </span>
                </label>
                <input
                  type="text"
                  value={form.takeaway ?? ""}
                  onChange={(e) => change("takeaway", e.target.value)}
                  placeholder="例：不安が大きい人にはまず安心を渡す方が早い"
                  className={inputClass}
                />
              </div>

              {/* ── ロング版切替 ──────────────────────── */}
              <div>
                <button
                  type="button"
                  onClick={() => setLongMode((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      longMode ? "rotate-180" : ""
                    }`}
                  />
                  ロング版（判断意図・境界線・反省・再利用条件・感情）
                </button>

                {longMode && (
                  <div className="mt-3 space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className={labelClass}>なぜその対応にした？</label>
                      <textarea
                        value={form.intent ?? ""}
                        onChange={(e) => change("intent", e.target.value)}
                        rows={2}
                        placeholder="判断の意図・狙い"
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>どこまで対応すべきと思った？</label>
                      <textarea
                        value={form.boundary ?? ""}
                        onChange={(e) => change("boundary", e.target.value)}
                        rows={2}
                        placeholder="ここからは専門家／有料／本人課題、などの線引き"
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>今なら何を変える？</label>
                      <textarea
                        value={form.reflection ?? ""}
                        onChange={(e) => change("reflection", e.target.value)}
                        rows={2}
                        placeholder="やり直すならここ、という反省点"
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>どんな人・状況なら使える？</label>
                      <textarea
                        value={form.reusable_when ?? ""}
                        onChange={(e) =>
                          change("reusable_when", e.target.value)
                        }
                        rows={2}
                        placeholder="再利用できる条件（汎化）"
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        その時の感情
                        <span className="ml-2 font-normal text-gray-400">
                          （参考情報・AIの応答には再現させない）
                        </span>
                      </label>
                      <input
                        type="text"
                        value={form.emotion ?? ""}
                        onChange={(e) => change("emotion", e.target.value)}
                        placeholder="例：もどかしさ／嬉しさ／違和感"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── 日時（任意、空なら now()） ────────── */}
              <div>
                <label className={labelClass}>
                  発生日時
                  <span className="ml-2 font-normal text-gray-400">
                    （空なら現在時刻）
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={form.occurred_at ?? ""}
                  onChange={(e) => change("occurred_at", e.target.value)}
                  className={inputClass + " font-mono text-[13px]"}
                />
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
                  disabled={pending || form.event.trim().length === 0}
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
