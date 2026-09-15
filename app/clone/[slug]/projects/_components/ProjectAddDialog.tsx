"use client";

// /clone/[slug]/projects 追加ダイアログ。people と同パターン（モーダル + 折り畳み詳細項目）。

import { useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { createProject, type ProjectInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
}

const emptyForm: ProjectInput = {
  name: "",
  status: "",
  proposal_amount: "",
  contract_amount: "",
  headcount: "",
  unit_price: "",
  revenue_total: "",
  cost_total: "",
  hours_invested: "",
  next_action: "",
  pending_decision: "",
  due_date: "",
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "未設定" },
  { value: "リード", label: "リード" },
  { value: "提案", label: "提案" },
  { value: "受注", label: "受注" },
  { value: "進行中", label: "進行中" },
  { value: "完了", label: "完了" },
  { value: "失注", label: "失注" },
];

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function ProjectAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProjectInput>(emptyForm);
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

  const change = <K extends keyof ProjectInput>(
    key: K,
    value: ProjectInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createProject(slug, tenantId, form);
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
        案件を追加
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-add-title"
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
                  id="project-add-title"
                  className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]"
                >
                  案件を追加
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
                  案件名 <span className="text-[#c0524a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="○○社 営業支援システム"
                  className={inputClass + " text-sm font-medium"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>ステータス</label>
                  <select
                    value={form.status ?? ""}
                    onChange={(e) => change("status", e.target.value)}
                    className={inputClass + " bg-white"}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>期限</label>
                  <input
                    type="date"
                    value={form.due_date ?? ""}
                    onChange={(e) => change("due_date", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>提案金額（円）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.proposal_amount ?? ""}
                    onChange={(e) => change("proposal_amount", e.target.value)}
                    placeholder="500000"
                    className={inputClass + " tabular-nums"}
                  />
                </div>
                <div>
                  <label className={labelClass}>受注金額（円）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.contract_amount ?? ""}
                    onChange={(e) => change("contract_amount", e.target.value)}
                    placeholder="450000"
                    className={inputClass + " tabular-nums"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>人数（空欄なら関連人物の数）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.headcount ?? ""}
                    onChange={(e) => change("headcount", e.target.value)}
                    placeholder="関連人物から自動"
                    className={inputClass + " tabular-nums"}
                  />
                </div>
                <div>
                  <label className={labelClass}>単価（円/人）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.unit_price ?? ""}
                    onChange={(e) => change("unit_price", e.target.value)}
                    placeholder="500000"
                    className={inputClass + " tabular-nums"}
                  />
                </div>
              </div>
              {form.headcount && form.unit_price && (
                <p className="-mt-2 text-[12px] text-[#1c3550]">
                  概算売上：
                  <span className="font-bold tabular-nums">
                    ¥
                    {(
                      (Number(form.headcount) || 0) *
                      (Number(form.unit_price) || 0)
                    ).toLocaleString("ja-JP")}
                  </span>
                  <span className="text-gray-400">（人数 × 単価）</span>
                </p>
              )}

              <div>
                <label className={labelClass}>次のアクション</label>
                <input
                  type="text"
                  value={form.next_action ?? ""}
                  onChange={(e) => change("next_action", e.target.value)}
                  placeholder="来週までに見積提示"
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
                  詳細項目（売上・原価・時間など）
                </button>

                {showOptional && (
                  <div className="mt-3 space-y-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>売上合計（円）</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={form.revenue_total ?? ""}
                          onChange={(e) =>
                            change("revenue_total", e.target.value)
                          }
                          placeholder="0"
                          className={inputClass + " tabular-nums"}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>原価・経費（円）</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={form.cost_total ?? ""}
                          onChange={(e) => change("cost_total", e.target.value)}
                          placeholder="0"
                          className={inputClass + " tabular-nums"}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>投下時間（h）</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          value={form.hours_invested ?? ""}
                          onChange={(e) =>
                            change("hours_invested", e.target.value)
                          }
                          placeholder="0"
                          className={inputClass + " tabular-nums"}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>判断待ち</label>
                      <textarea
                        value={form.pending_decision ?? ""}
                        onChange={(e) =>
                          change("pending_decision", e.target.value)
                        }
                        rows={2}
                        placeholder="先方判断待ち / 社内決裁中 など"
                        className={inputClass + " resize-y"}
                      />
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
