"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import {
  createDecisionPrinciple,
  type DecisionPrincipleInput,
} from "../_actions";
import { FieldHint } from "../../_components/FieldHint";
import {
  CORE_OS_ASSIST_EVENT,
  type CoreOsAssistDraftDetail,
} from "../../_components/CoreOsAssistDialog";

interface Props {
  slug: string;
  tenantId: string;
}

const PRIORITY_OPTIONS = [
  { value: "", label: "未設定" },
  { value: "高", label: "高" },
  { value: "中", label: "中" },
  { value: "低", label: "低" },
];

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

const emptyForm: DecisionPrincipleInput = {
  name: "",
  category: "",
  rule: "",
  reason: "",
  priority: "",
  exception: "",
  related_values: "",
};

export function DecisionPrincipleAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DecisionPrincipleInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const [pending, startTransition] = useTransition();

  // 見出しの「AIと対話して下書き」が生成した下書きを受け取り、フォームに入れてダイアログを開く。
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CoreOsAssistDraftDetail>).detail;
      if (detail?.section !== "decision-principles" || !detail.draft) return;
      const draft = detail.draft;
      setForm((prev) => {
        const next = { ...prev };
        (Object.keys(prev) as (keyof DecisionPrincipleInput)[]).forEach((k) => {
          const v = draft[k as string];
          if (typeof v === "string" && v.trim().length > 0) next[k] = v;
        });
        return next;
      });
      setShowOptional(true);
      setError(null);
      setOpen(true);
    };
    window.addEventListener(CORE_OS_ASSIST_EVENT, handler);
    return () => window.removeEventListener(CORE_OS_ASSIST_EVENT, handler);
  }, []);

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

  const change = <K extends keyof DecisionPrincipleInput>(
    key: K,
    value: DecisionPrincipleInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createDecisionPrinciple(slug, tenantId, form);
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
        判断基準を追加
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
                  判断基準を追加
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
                  判断名 <span className="text-[#c0524a]">*</span>
                </label>
                <FieldHint section="decision-principles" field="name" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="単発仕事は引き受けない"
                  className={inputClass + " text-sm font-medium"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>カテゴリ</label>
                  <FieldHint section="decision-principles" field="category" />
                  <input
                    type="text"
                    value={form.category ?? ""}
                    onChange={(e) => change("category", e.target.value)}
                    placeholder="案件選定 / 営業 / 採用 など"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>優先度</label>
                  <select
                    value={form.priority ?? ""}
                    onChange={(e) => change("priority", e.target.value)}
                    className={inputClass + " bg-white"}
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>判断ルール</label>
                <FieldHint section="decision-principles" field="rule" />
                <textarea
                  value={form.rule ?? ""}
                  onChange={(e) => change("rule", e.target.value)}
                  rows={3}
                  placeholder="どう判断するか（YES/NOではなく、考え方の道筋）"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>理由</label>
                <FieldHint section="decision-principles" field="reason" />
                <textarea
                  value={form.reason ?? ""}
                  onChange={(e) => change("reason", e.target.value)}
                  rows={2}
                  placeholder="なぜこの判断軸なのか（過去の失敗・大切にしている価値観）"
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
                  詳細項目（例外条件・関連する価値観）
                </button>

                {showOptional && (
                  <div className="mt-3 space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className={labelClass}>例外条件</label>
                      <FieldHint section="decision-principles" field="exception" />
                      <textarea
                        value={form.exception ?? ""}
                        onChange={(e) => change("exception", e.target.value)}
                        rows={2}
                        placeholder="このルールを破ってもいい状況"
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        関連する価値観
                        <span className="ml-2 font-normal text-gray-400">
                          カンマ・スラッシュ・改行で区切る
                        </span>
                      </label>
                      <FieldHint section="decision-principles" field="related_values" />
                      <textarea
                        value={form.related_values ?? ""}
                        onChange={(e) =>
                          change("related_values", e.target.value)
                        }
                        rows={2}
                        placeholder="長期, 信頼, 速度"
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
