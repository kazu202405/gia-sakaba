"use client";

import { useState, useTransition } from "react";
import { Pencil, X, Loader2, AlertCircle } from "lucide-react";
import { updateMonthlyReview, type MonthlyReviewInput } from "../_actions";

// initial 型は page.tsx から string で渡してもらう
// （number 列を string で受け取って textarea 互換にするため）
export interface MonthlyReviewEditInitial {
  target_month: string;
  revenue: string;
  expense: string;
  top_people: string;
  top_projects: string;
  high_margin_projects: string;
  low_margin_projects: string;
  activities_to_reduce: string;
  activities_to_increase: string;
  improvement_actions: string;
}

interface Props {
  slug: string;
  tenantId: string;
  reviewId: string;
  initial: MonthlyReviewEditInitial;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

function toNumOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function MonthlyReviewEditDialog({
  slug,
  tenantId,
  reviewId,
  initial,
}: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MonthlyReviewEditInitial>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setForm(initial);
    setError(null);
  };

  const change = <K extends keyof MonthlyReviewEditInitial>(
    key: K,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: MonthlyReviewInput = {
      target_month: form.target_month,
      revenue: toNumOrNull(form.revenue),
      expense: toNumOrNull(form.expense),
      top_people: form.top_people,
      top_projects: form.top_projects,
      high_margin_projects: form.high_margin_projects,
      low_margin_projects: form.low_margin_projects,
      activities_to_reduce: form.activities_to_reduce,
      activities_to_increase: form.activities_to_increase,
      improvement_actions: form.improvement_actions,
    };
    startTransition(async () => {
      const res = await updateMonthlyReview(slug, tenantId, reviewId, payload);
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

          <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm"
                />
                <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                  月次レビューを編集
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
                  対象月 <span className="text-[#c0524a]">*</span>
                </label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={form.target_month}
                  onChange={(e) => change("target_month", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>売上（円）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.revenue}
                    onChange={(e) => change("revenue", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>経費（円）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.expense}
                    onChange={(e) => change("expense", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>時間を使った上位人物</label>
                  <textarea
                    value={form.top_people}
                    onChange={(e) => change("top_people", e.target.value)}
                    rows={2}
                    className={inputClass + " resize-y"}
                  />
                </div>
                <div>
                  <label className={labelClass}>時間を使った上位案件</label>
                  <textarea
                    value={form.top_projects}
                    onChange={(e) => change("top_projects", e.target.value)}
                    rows={2}
                    className={inputClass + " resize-y"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>利益率が高い案件</label>
                  <textarea
                    value={form.high_margin_projects}
                    onChange={(e) =>
                      change("high_margin_projects", e.target.value)
                    }
                    rows={2}
                    className={inputClass + " resize-y"}
                  />
                </div>
                <div>
                  <label className={labelClass}>利益率が低い案件</label>
                  <textarea
                    value={form.low_margin_projects}
                    onChange={(e) =>
                      change("low_margin_projects", e.target.value)
                    }
                    rows={2}
                    className={inputClass + " resize-y"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>減らすべき活動</label>
                  <textarea
                    value={form.activities_to_reduce}
                    onChange={(e) =>
                      change("activities_to_reduce", e.target.value)
                    }
                    rows={2}
                    className={inputClass + " resize-y"}
                  />
                </div>
                <div>
                  <label className={labelClass}>増やすべき活動</label>
                  <textarea
                    value={form.activities_to_increase}
                    onChange={(e) =>
                      change("activities_to_increase", e.target.value)
                    }
                    rows={2}
                    className={inputClass + " resize-y"}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>来月の改善アクション</label>
                <textarea
                  value={form.improvement_actions}
                  onChange={(e) =>
                    change("improvement_actions", e.target.value)
                  }
                  rows={3}
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
                  disabled={pending || form.target_month.trim().length === 0}
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
