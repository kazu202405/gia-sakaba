"use client";

import { useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle } from "lucide-react";
import { createWeeklyReview, type WeeklyReviewInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

const emptyForm: WeeklyReviewInput = {
  period: "",
  key_decisions: "",
  progressed_projects: "",
  stuck_projects: "",
  new_decision_rules: "",
  relationship_changes: "",
  next_week_priorities: "",
  promote_to_core_os: "",
};

export function WeeklyReviewAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<WeeklyReviewInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setForm(emptyForm);
    setError(null);
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };

  const change = <K extends keyof WeeklyReviewInput>(
    key: K,
    value: WeeklyReviewInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createWeeklyReview(slug, tenantId, form);
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
        週次レビューを追加
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

          <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm"
                />
                <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                  週次レビューを追加
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
                <label className={labelClass}>
                  対象期間 <span className="text-[#c0524a]">*</span>
                </label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={form.period}
                  onChange={(e) => change("period", e.target.value)}
                  placeholder="例：2026-W19 / 5/12-18 / W19"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>今週の重要判断</label>
                <textarea
                  value={form.key_decisions ?? ""}
                  onChange={(e) => change("key_decisions", e.target.value)}
                  rows={3}
                  placeholder="この一週間で下した主要な判断"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>進んだ案件</label>
                  <textarea
                    value={form.progressed_projects ?? ""}
                    onChange={(e) => change("progressed_projects", e.target.value)}
                    rows={3}
                    placeholder="前進した案件・成果"
                    className={inputClass + " resize-y"}
                  />
                </div>
                <div>
                  <label className={labelClass}>止まっている案件</label>
                  <textarea
                    value={form.stuck_projects ?? ""}
                    onChange={(e) => change("stuck_projects", e.target.value)}
                    rows={3}
                    placeholder="ブロッカー・滞留している案件"
                    className={inputClass + " resize-y"}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>新しく見えた判断基準</label>
                <textarea
                  value={form.new_decision_rules ?? ""}
                  onChange={(e) => change("new_decision_rules", e.target.value)}
                  rows={2}
                  placeholder="今週浮かんだ「ルール化したい気づき」"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>関係性の変化</label>
                <textarea
                  value={form.relationship_changes ?? ""}
                  onChange={(e) => change("relationship_changes", e.target.value)}
                  rows={2}
                  placeholder="新たな出会い・距離が縮まった/遠ざかった人"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>来週の優先タスク</label>
                <textarea
                  value={form.next_week_priorities ?? ""}
                  onChange={(e) => change("next_week_priorities", e.target.value)}
                  rows={3}
                  placeholder="来週やるべきこと（優先順位つき）"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>Core OSに反映すべきこと</label>
                <textarea
                  value={form.promote_to_core_os ?? ""}
                  onChange={(e) => change("promote_to_core_os", e.target.value)}
                  rows={2}
                  placeholder="判断基準・3年計画・KPIなどへ昇格させたい知見"
                  className={inputClass + " resize-y"}
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
                  disabled={pending || form.period.trim().length === 0}
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
