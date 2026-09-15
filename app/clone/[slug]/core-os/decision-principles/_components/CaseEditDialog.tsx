"use client";

// 判断事例の編集ダイアログ。
// CaseAddDialog と同じ構成で、initial を受け取って updateDecisionCase を呼ぶ。
// controlledOpen mode で行クリックから開く想定（CaseRow がラップする）。

import { useState, useTransition } from "react";
import { Pencil, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { updateDecisionCase, type DecisionCaseInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  caseId: string;
  initial: DecisionCaseInput;
  /** 親が open 状態を制御する時に渡す。指定があれば内蔵 Pencil ボタンは出さない。 */
  controlledOpen?: boolean;
  onControlledClose?: () => void;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function CaseEditDialog({
  slug, tenantId, caseId, initial,
  controlledOpen, onControlledClose,
}: Props) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) {
      if (!v) onControlledClose?.();
    } else {
      setInternalOpen(v);
    }
  };

  const [form, setForm] = useState<DecisionCaseInput>(initial);
  const [error, setError] = useState<string | null>(null);
  // 既存事例がロング項目を持っていれば最初から展開
  const hasLongInitially = Boolean(
    initial.intent || initial.boundary || initial.reflection
    || initial.reusable_when || initial.emotion
    || initial.capture_mode === "long",
  );
  const [longMode, setLongMode] = useState(hasLongInitially);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setForm(initial);
    setError(null);
    setLongMode(hasLongInitially);
  };

  const change = <K extends keyof DecisionCaseInput>(
    key: K,
    value: DecisionCaseInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateDecisionCase(slug, tenantId, caseId, {
        ...form,
        capture_mode: longMode ? "long" : "short",
      });
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      setOpen(false);
    });
  };

  return (
    <>
      {!isControlled && (
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
      )}

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
                  事例を編集
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
                  何があった？ <span className="text-[#c0524a]">*</span>
                </label>
                <textarea
                  required
                  value={form.event}
                  onChange={(e) => change("event", e.target.value)}
                  rows={3}
                  className={inputClass + " resize-y text-sm"}
                />
              </div>

              <div>
                <label className={labelClass}>本当は何が問題と思った？</label>
                <textarea
                  value={form.insight ?? ""}
                  onChange={(e) => change("insight", e.target.value)}
                  rows={2}
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>何と言った／何をした？</label>
                <textarea
                  value={form.action ?? ""}
                  onChange={(e) => change("action", e.target.value)}
                  rows={2}
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>どうなった？</label>
                <textarea
                  value={form.outcome ?? ""}
                  onChange={(e) => change("outcome", e.target.value)}
                  rows={2}
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>一言で言うと？</label>
                <input
                  type="text"
                  value={form.takeaway ?? ""}
                  onChange={(e) => change("takeaway", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setLongMode((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      longMode ? "rotate-180" : ""
                    }`}
                  />
                  ロング版（判断意図・境界線・反省・再利用条件・感情）
                </button>

                {longMode && (
                  <div className="mt-3 space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className={labelClass}>なぜその対応にした？</label>
                      <textarea
                        value={form.intent ?? ""}
                        onChange={(e) => change("intent", e.target.value)}
                        rows={2}
                        className={inputClass + " resize-y"}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>どこまで対応すべきと思った？</label>
                      <textarea
                        value={form.boundary ?? ""}
                        onChange={(e) => change("boundary", e.target.value)}
                        rows={2}
                        className={inputClass + " resize-y"}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>今なら何を変える？</label>
                      <textarea
                        value={form.reflection ?? ""}
                        onChange={(e) => change("reflection", e.target.value)}
                        rows={2}
                        className={inputClass + " resize-y"}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>どんな人・状況なら使える？</label>
                      <textarea
                        value={form.reusable_when ?? ""}
                        onChange={(e) =>
                          change("reusable_when", e.target.value)
                        }
                        rows={2}
                        className={inputClass + " resize-y"}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        その時の感情
                        <span className="ml-2 font-normal text-gray-400">
                          （AIの応答には再現させない）
                        </span>
                      </label>
                      <input
                        type="text"
                        value={form.emotion ?? ""}
                        onChange={(e) => change("emotion", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>発生日時</label>
                <input
                  type="datetime-local"
                  value={form.occurred_at ?? ""}
                  onChange={(e) => change("occurred_at", e.target.value)}
                  className={inputClass + " font-mono text-[13px]"}
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
                  disabled={pending || form.event.trim().length === 0}
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
