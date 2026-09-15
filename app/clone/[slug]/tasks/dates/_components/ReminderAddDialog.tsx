"use client";

import { useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle } from "lucide-react";
import { createDatedReminder, type DatedReminderInput } from "../_actions";
import type { Recurrence } from "@/lib/ai-clone/dated-reminder";

interface Props {
  slug: string;
  tenantId: string;
}

const RECURRENCE_OPTIONS: Array<{ value: Recurrence; label: string; hint: string }> = [
  { value: "none", label: "単発", hint: "その日に1回だけ" },
  { value: "yearly", label: "毎年", hint: "誕生日・記念日・周年" },
  { value: "monthly", label: "毎月", hint: "毎月この日" },
  { value: "milestone", label: "節目", hint: "開始日から◯ヶ月後だけ" },
];

// 節目プリセット（4ヶ月も含む）
const MILESTONE_PRESETS = [1, 2, 3, 4, 6, 12];

const labelClass = "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

const emptyForm: DatedReminderInput = {
  title: "",
  base_date: "",
  recurrence: "yearly",
  milestone_months: [],
  note: "",
};

export function ReminderAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DatedReminderInput>(emptyForm);
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
  const change = <K extends keyof DatedReminderInput>(
    key: K,
    value: DatedReminderInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const toggleMonth = (n: number) => {
    setForm((prev) => {
      const has = prev.milestone_months.includes(n);
      return {
        ...prev,
        milestone_months: has
          ? prev.milestone_months.filter((m) => m !== n)
          : [...prev.milestone_months, n].sort((a, b) => a - b),
      };
    });
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createDatedReminder(slug, tenantId, form);
      if (!res.ok) {
        setError(res.error ?? "登録に失敗しました");
        return;
      }
      setOpen(false);
      reset();
    });
  };

  const baseDateLabel = form.recurrence === "milestone" ? "開始日・基準日" : "日付";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        日付を追加
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-add-title"
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
                  id="reminder-add-title"
                  className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]"
                >
                  日付を追加
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
                  タイトル <span className="text-[#c0524a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.title}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder="○○社 サービス開始 / 田中さん 誕生日"
                  className={inputClass + " text-sm font-medium"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{baseDateLabel} <span className="text-[#c0524a]">*</span></label>
                  <input
                    type="date"
                    required
                    value={form.base_date}
                    onChange={(e) => change("base_date", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>繰り返し</label>
                  <select
                    value={form.recurrence}
                    onChange={(e) =>
                      change("recurrence", e.target.value as Recurrence)
                    }
                    className={inputClass + " bg-white"}
                  >
                    {RECURRENCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}（{o.hint}）
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.recurrence === "milestone" && (
                <div className="rounded-md border border-[#e6d3a3] bg-[#fbf9f3] px-4 py-3">
                  <label className={labelClass}>
                    通知する節目（基準日から何ヶ月後）<span className="text-[#c0524a]">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MILESTONE_PRESETS.map((n) => {
                      const on = form.milestone_months.includes(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => toggleMonth(n)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            on
                              ? "bg-[#1c3550] text-white border-[#1c3550]"
                              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {n}ヶ月
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">
                    選んだ節目の日が来る前夜に通知します（例：3ヶ月・6ヶ月）。
                  </p>
                </div>
              )}

              <div>
                <label className={labelClass}>メモ（任意）</label>
                <input
                  type="text"
                  value={form.note ?? ""}
                  onChange={(e) => change("note", e.target.value)}
                  placeholder="何を伝えるか・なぜ大事かの一言"
                  className={inputClass}
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
                  disabled={pending || form.title.trim().length === 0}
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
