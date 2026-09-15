"use client";

import { useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle } from "lucide-react";
import { createRevenue, type RevenueInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
}

const PAYMENT_STATUS_OPTIONS = ["", "未入金", "一部入金", "入金済"];

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const buildEmptyForm = (): RevenueInput => ({
  occurred_date: todayString(),
  customer: "",
  amount: "",
  expected_paid_date: "",
  payment_status: "未入金",
  memo: "",
});

export function RevenueAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RevenueInput>(buildEmptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setForm(buildEmptyForm());
    setError(null);
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };

  const change = <K extends keyof RevenueInput>(
    key: K,
    value: RevenueInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createRevenue(slug, tenantId, form);
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
        売上を追加
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
                  売上を追加
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                    日付 <span className="text-[#c0524a]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.occurred_date}
                    onChange={(e) => change("occurred_date", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                    金額（円）<span className="text-[#c0524a]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    inputMode="numeric"
                    value={form.amount}
                    onChange={(e) => change("amount", e.target.value)}
                    placeholder="500000"
                    className={inputClass + " tabular-nums"}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>顧客</label>
                <input
                  type="text"
                  value={form.customer ?? ""}
                  onChange={(e) => change("customer", e.target.value)}
                  placeholder="株式会社○○"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>入金予定日</label>
                  <input
                    type="date"
                    value={form.expected_paid_date ?? ""}
                    onChange={(e) =>
                      change("expected_paid_date", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>入金状態</label>
                  <select
                    value={form.payment_status ?? ""}
                    onChange={(e) => change("payment_status", e.target.value)}
                    className={inputClass + " bg-white"}
                  >
                    {PAYMENT_STATUS_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p === "" ? "未設定" : p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>備考</label>
                <textarea
                  value={form.memo ?? ""}
                  onChange={(e) => change("memo", e.target.value)}
                  rows={2}
                  placeholder="案件名・請求書No・補足"
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
                  disabled={
                    pending ||
                    form.occurred_date.trim().length === 0 ||
                    form.amount.trim().length === 0
                  }
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
