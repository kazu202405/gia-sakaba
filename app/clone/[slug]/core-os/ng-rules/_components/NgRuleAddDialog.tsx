"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle } from "lucide-react";
import { createNgRule, type NgRuleInput } from "../_actions";
import { FieldHint } from "../../_components/FieldHint";
import {
  CORE_OS_ASSIST_EVENT,
  type CoreOsAssistDraftDetail,
} from "../../_components/CoreOsAssistDialog";

interface Props {
  slug: string;
  tenantId: string;
}

const AREA_OPTIONS = [
  "",
  "契約金額",
  "法的判断",
  "税務判断",
  "医療・投資助言",
  "クレーム対応",
  "重大な約束",
  "本人確認",
  "その他",
];

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

const emptyForm: NgRuleInput = {
  area_name: "",
  area: "",
  reason_not_for_ai: "",
  escalation_target: "",
  confirmation_procedure: "",
};

export function NgRuleAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NgRuleInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 見出しの「AIと対話して下書き」が生成した下書きを受け取り、フォームに入れてダイアログを開く。
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CoreOsAssistDraftDetail>).detail;
      if (detail?.section !== "ng-rules" || !detail.draft) return;
      const draft = detail.draft;
      setForm((prev) => {
        const next = { ...prev };
        (Object.keys(prev) as (keyof NgRuleInput)[]).forEach((k) => {
          const v = draft[k as string];
          if (typeof v === "string" && v.trim().length > 0) next[k] = v;
        });
        return next;
      });
      setError(null);
      setOpen(true);
    };
    window.addEventListener(CORE_OS_ASSIST_EVENT, handler);
    return () => window.removeEventListener(CORE_OS_ASSIST_EVENT, handler);
  }, []);

  const reset = () => {
    setForm(emptyForm);
    setError(null);
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };

  const change = <K extends keyof NgRuleInput>(
    key: K,
    value: NgRuleInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createNgRule(slug, tenantId, form);
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
        NG領域を追加
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
                  NG領域を追加
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
                  領域名 <span className="text-[#c0524a]">*</span>
                </label>
                <FieldHint section="ng-rules" field="area_name" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.area_name}
                  onChange={(e) => change("area_name", e.target.value)}
                  placeholder="100万円超の見積提示"
                  className={inputClass + " text-sm font-medium"}
                />
              </div>

              <div>
                <label className={labelClass}>領域カテゴリ</label>
                <select
                  value={form.area ?? ""}
                  onChange={(e) => change("area", e.target.value)}
                  className={inputClass + " bg-white"}
                >
                  {AREA_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a === "" ? "未設定" : a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>AIに任せない理由</label>
                <FieldHint section="ng-rules" field="reason_not_for_ai" />
                <textarea
                  value={form.reason_not_for_ai ?? ""}
                  onChange={(e) => change("reason_not_for_ai", e.target.value)}
                  rows={2}
                  placeholder="判断ミスのリスク・専門資格が必要・信頼を損ねる など"
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>必須エスカレ先</label>
                <FieldHint section="ng-rules" field="escalation_target" />
                <input
                  type="text"
                  value={form.escalation_target ?? ""}
                  onChange={(e) => change("escalation_target", e.target.value)}
                  placeholder="本人 / 顧問税理士 / 弁護士 など"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>確認手順</label>
                <FieldHint section="ng-rules" field="confirmation_procedure" />
                <textarea
                  value={form.confirmation_procedure ?? ""}
                  onChange={(e) =>
                    change("confirmation_procedure", e.target.value)
                  }
                  rows={3}
                  placeholder="この領域に当たった時のエスカレ手順（誰に・何を・いつまでに）"
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
                  disabled={pending || form.area_name.trim().length === 0}
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
