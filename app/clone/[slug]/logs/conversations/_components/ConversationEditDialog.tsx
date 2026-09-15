"use client";

// 会話ログ編集ダイアログ。AddDialog の構成を踏襲、initial 受け取り、updateConversation を呼ぶ。

import { useState, useTransition } from "react";
import { Pencil, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { updateConversation, type ConversationInput } from "../_actions";
import { PersonMultiPicker, type PersonCandidate } from "./PersonMultiPicker";

interface Props {
  slug: string;
  tenantId: string;
  conversationId: string;
  initial: ConversationInput;
  /** ピッカー用の人物マスター候補一覧（親 page.tsx から渡す） */
  peopleCandidates: PersonCandidate[];
  /**
   * controlled モード。
   * 指定すると内蔵の Pencil ボタンは出さず、open を親が制御する。
   * 行クリックでダイアログを開きたい時に使う。
   */
  controlledOpen?: boolean;
  /** controlledOpen=true の時にダイアログを閉じる通知。 */
  onControlledClose?: () => void;
}

const CHANNEL_OPTIONS = ["", "Slack", "LINE", "Email", "対面", "電話", "その他"];
const IMPORTANCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "未設定" },
  { value: "S", label: "S（最重要）" },
  { value: "A", label: "A（重要）" },
  { value: "B", label: "B（通常）" },
  { value: "C", label: "C（参考）" },
];

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function ConversationEditDialog({
  slug,
  tenantId,
  conversationId,
  initial,
  peopleCandidates,
  controlledOpen,
  onControlledClose,
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
  const [form, setForm] = useState<ConversationInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const hasOptionalValues = Boolean(initial.usage_tags);
  const [showOptional, setShowOptional] = useState(hasOptionalValues);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setForm(initial);
    setError(null);
    setShowOptional(hasOptionalValues);
  };

  const change = <K extends keyof ConversationInput>(
    key: K,
    value: ConversationInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateConversation(slug, tenantId, conversationId, form);
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
                  会話を編集
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                    日時 <span className="text-[#c0524a]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.occurred_at}
                    onChange={(e) => change("occurred_at", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>チャンネル</label>
                  <select
                    value={form.channel ?? ""}
                    onChange={(e) => change("channel", e.target.value)}
                    className={inputClass + " bg-white"}
                  >
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c === "" ? "未設定" : c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>重要度</label>
                <select
                  value={form.importance ?? ""}
                  onChange={(e) => change("importance", e.target.value)}
                  className={inputClass + " bg-white"}
                >
                  {IMPORTANCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>関連人物</label>
                <PersonMultiPicker
                  candidates={peopleCandidates}
                  value={form.person_ids ?? []}
                  onChange={(next) => change("person_ids", next)}
                  disabled={pending}
                />
              </div>

              <div>
                <label className={labelClass}>会話内容</label>
                <textarea
                  value={form.content ?? ""}
                  onChange={(e) => change("content", e.target.value)}
                  rows={4}
                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label className={labelClass}>要約</label>
                <textarea
                  value={form.summary ?? ""}
                  onChange={(e) => change("summary", e.target.value)}
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
                  詳細項目（用途タグ）
                </button>

                {showOptional && (
                  <div className="mt-3 space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className={labelClass}>
                        用途タグ
                        <span className="ml-2 font-normal text-gray-400">
                          カンマ・スラッシュ・改行で区切る
                        </span>
                      </label>
                      <input
                        type="text"
                        value={form.usage_tags ?? ""}
                        onChange={(e) => change("usage_tags", e.target.value)}
                        className={inputClass}
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
                  disabled={pending || form.occurred_at.trim().length === 0}
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
