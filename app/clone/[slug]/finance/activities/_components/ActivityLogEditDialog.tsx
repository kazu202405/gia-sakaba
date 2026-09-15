"use client";

import { useState, useTransition } from "react";
import { Pencil, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { updateActivityLog, type ActivityLogInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  activityId: string;
  initial: ActivityLogInput;
}

const ACTIVITY_TYPE_OPTIONS = [
  "",
  "初回面談",
  "商談",
  "紹介依頼",
  "会食",
  "現地調査",
  "セミナー",
  "イベント",
  "勉強会",
  "その他",
];

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function ActivityLogEditDialog({
  slug,
  tenantId,
  activityId,
  initial,
}: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ActivityLogInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const hasOptional = Boolean(
    initial.duration_minutes || initial.travel_minutes || initial.cost,
  );
  const [showOptional, setShowOptional] = useState(hasOptional);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setForm(initial);
    setError(null);
    setShowOptional(hasOptional);
  };

  const change = <K extends keyof ActivityLogInput>(
    key: K,
    value: ActivityLogInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateActivityLog(slug, tenantId, activityId, form);
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

          <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span aria-hidden className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm" />
                <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                  活動を編集
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
                  <label className={labelClass}>活動種別</label>
                  <select
                    value={form.activity_type ?? ""}
                    onChange={(e) => change("activity_type", e.target.value)}
                    className={inputClass + " bg-white"}
                  >
                    {ACTIVITY_TYPE_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a === "" ? "未設定" : a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>活動内容</label>
                <textarea
                  value={form.content ?? ""}
                  onChange={(e) => change("content", e.target.value)}
                  rows={3}
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>結果</label>
                <textarea
                  value={form.outcome ?? ""}
                  onChange={(e) => change("outcome", e.target.value)}
                  rows={2}
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>次のアクション</label>
                <input
                  type="text"
                  value={form.next_action ?? ""}
                  onChange={(e) => change("next_action", e.target.value)}
                  className={inputClass}
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
                  詳細項目（時間・移動・費用）
                </button>

                {showOptional && (
                  <div className="mt-3 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>所要時間（分）</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={form.duration_minutes ?? ""}
                          onChange={(e) =>
                            change("duration_minutes", e.target.value)
                          }
                          className={inputClass + " tabular-nums"}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>移動時間（分）</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={form.travel_minutes ?? ""}
                          onChange={(e) =>
                            change("travel_minutes", e.target.value)
                          }
                          className={inputClass + " tabular-nums"}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>費用（円）</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={form.cost ?? ""}
                          onChange={(e) => change("cost", e.target.value)}
                          className={inputClass + " tabular-nums"}
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={pending || form.occurred_date.trim().length === 0}
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
