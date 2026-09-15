"use client";

import { useState, useTransition } from "react";
import { Pencil, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { updateToneRule, type ToneRuleInput } from "../_actions";
import { FieldHint } from "../../_components/FieldHint";

interface Props {
  slug: string;
  tenantId: string;
  ruleId: string;
  initial: ToneRuleInput;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function ToneRuleEditDialog({
  slug,
  tenantId,
  ruleId,
  initial,
}: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ToneRuleInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const hasOptional = Boolean(
    initial.confirm_before_proposing || initial.no_pushy_rule,
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

  const change = <K extends keyof ToneRuleInput>(
    key: K,
    value: ToneRuleInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateToneRule(slug, tenantId, ruleId, form);
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
                  口調ルールを編集
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
                  ルール名 <span className="text-[#c0524a]">*</span>
                </label>
                <FieldHint section="tone-rules" field="name" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  className={inputClass + " text-sm font-medium"}
                />
              </div>

              <div>
                <label className={labelClass}>基本の口調</label>
                <FieldHint section="tone-rules" field="base_tone" />
                <textarea
                  value={form.base_tone ?? ""}
                  onChange={(e) => change("base_tone", e.target.value)}
                  rows={2}
                  className={inputClass + " resize-y"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>丁寧さ</label>
                  <FieldHint section="tone-rules" field="politeness" />
                  <input
                    type="text"
                    value={form.politeness ?? ""}
                    onChange={(e) => change("politeness", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>返信の長さ</label>
                  <FieldHint section="tone-rules" field="reply_length" />
                  <input
                    type="text"
                    value={form.reply_length ?? ""}
                    onChange={(e) => change("reply_length", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>NG表現</label>
                <FieldHint section="tone-rules" field="ng_expressions" />
                <textarea
                  value={form.ng_expressions ?? ""}
                  onChange={(e) => change("ng_expressions", e.target.value)}
                  rows={2}
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
                  詳細項目（提案前確認・押し売り回避）
                </button>

                {showOptional && (
                  <div className="mt-3 space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className={labelClass}>提案前に必ず確認すること</label>
                      <FieldHint section="tone-rules" field="confirm_before_proposing" />
                      <textarea
                        value={form.confirm_before_proposing ?? ""}
                        onChange={(e) =>
                          change("confirm_before_proposing", e.target.value)
                        }
                        rows={2}
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>押し売り感を出さないルール</label>
                      <FieldHint section="tone-rules" field="no_pushy_rule" />
                      <textarea
                        value={form.no_pushy_rule ?? ""}
                        onChange={(e) => change("no_pushy_rule", e.target.value)}
                        rows={2}
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
