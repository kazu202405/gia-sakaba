"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { createToneRule, type ToneRuleInput } from "../_actions";
import { FieldHint } from "../../_components/FieldHint";
import {
  CORE_OS_ASSIST_EVENT,
  type CoreOsAssistDraftDetail,
} from "../../_components/CoreOsAssistDialog";

interface Props {
  slug: string;
  tenantId: string;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

const emptyForm: ToneRuleInput = {
  name: "",
  base_tone: "",
  politeness: "",
  ng_expressions: "",
  reply_length: "",
  confirm_before_proposing: "",
  no_pushy_rule: "",
};

export function ToneRuleAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ToneRuleInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const [pending, startTransition] = useTransition();

  // 見出しの「AIと対話して下書き」が生成した下書きを受け取り、フォームに入れてダイアログを開く。
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CoreOsAssistDraftDetail>).detail;
      if (detail?.section !== "tone-rules" || !detail.draft) return;
      const draft = detail.draft;
      setForm((prev) => {
        const next = { ...prev };
        (Object.keys(prev) as (keyof ToneRuleInput)[]).forEach((k) => {
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
      const res = await createToneRule(slug, tenantId, form);
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
        口調ルールを追加
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
                  口調ルールを追加
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
                  placeholder="社長の標準口調 / 商談時の口調 など"
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
                  placeholder="フランクで温かい、要点は短く、冗長な装飾はしない"
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
                    placeholder="です・ます調 / 過度な敬語は避ける"
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
                    placeholder="3〜5行が目安、長文は要点だけ太字"
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
                  placeholder="「素晴らしい」「ぜひぜひ」「させていただきます」など使わない言葉"
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
                        placeholder="相手の現状認識・予算感・意思決定者・期待値"
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
                        placeholder="3度断られたら追わない / 期日を切らない / 価値だけ伝えて判断は委ねる"
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
