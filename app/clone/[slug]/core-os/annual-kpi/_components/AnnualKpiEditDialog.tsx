"use client";

import { useState, useTransition } from "react";
import { Pencil, X, Loader2, AlertCircle } from "lucide-react";
import { updateAnnualKpi, type AnnualKpiInput } from "../_actions";
import { FieldHint } from "../../_components/FieldHint";

interface Props {
  slug: string;
  tenantId: string;
  kpiId: string;
  initial: AnnualKpiInput;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function AnnualKpiEditDialog({
  slug,
  tenantId,
  kpiId,
  initial,
}: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AnnualKpiInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setForm(initial);
    setError(null);
  };

  const change = <K extends keyof AnnualKpiInput>(
    key: K,
    value: AnnualKpiInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateAnnualKpi(slug, tenantId, kpiId, form);
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

          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span aria-hidden className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm" />
                <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                  KPIを編集
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
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                    年度 <span className="text-[#c0524a]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fiscal_year}
                    onChange={(e) => change("fiscal_year", e.target.value)}
                    className={inputClass + " text-sm font-medium tabular-nums"}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    KPI名 <span className="text-[#c0524a]">*</span>
                  </label>
                  <FieldHint section="annual-kpi" field="title" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={form.title}
                    onChange={(e) => change("title", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_110px] gap-3">
                <div>
                  <label className={labelClass}>目標値</label>
                  <FieldHint section="annual-kpi" field="target_value" />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={form.target_value ?? ""}
                    onChange={(e) => change("target_value", e.target.value)}
                    className={inputClass + " tabular-nums"}
                  />
                </div>
                <div>
                  <label className={labelClass}>単位</label>
                  <input
                    type="text"
                    value={form.unit ?? ""}
                    onChange={(e) => change("unit", e.target.value)}
                    className={inputClass}
                  />
                </div>
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
                    form.fiscal_year.trim().length === 0 ||
                    form.title.trim().length === 0
                  }
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
