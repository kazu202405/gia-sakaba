"use client";

// /clone/[slug]/people の追加ダイアログ。
// name 必須、それ以外は任意（折り畳み可）。Server Action 経由で INSERT し、
// 成功時は revalidatePath で一覧再描画 + ダイアログを閉じる。

import { useState, useTransition } from "react";
import { Plus, X, Loader2, AlertCircle, Check } from "lucide-react";
import { createPerson, type PersonInput } from "../_actions";
import { InterestsInput } from "./InterestsInput";
import { PersonReferrerInput } from "./PersonReferrerInput";

interface Props {
  slug: string;
  tenantId: string;
}

const emptyForm: PersonInput = {
  name: "",
  company_name: "",
  url: "",
  position: "",
  met_context: "",
  importance: "",
  temperature: "",
  referred_by: "",
  interests: [],
  caveats: "",
  next_action: "",
};

const IMPORTANCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "未設定" },
  { value: "S", label: "S（最重要）" },
  { value: "A", label: "A（重要）" },
  { value: "B", label: "B（通常）" },
  { value: "C", label: "C（参考）" },
];

const TEMPERATURE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "未設定" },
  { value: "熱い", label: "熱い" },
  { value: "様子見", label: "様子見" },
  { value: "冷えてる", label: "冷えてる" },
];

type TabKey = "main" | "detail";

export function PersonAddDialog({ slug, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PersonInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("main");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const reset = () => {
    setForm(emptyForm);
    setError(null);
    setTab("main");
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    // 閉じるときに直接 reset すると次回開いたとき初期値で開ける
    reset();
  };

  const change = <K extends keyof PersonInput>(
    key: K,
    value: PersonInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createPerson(slug, tenantId, form);
      if (!res.ok) {
        setError(res.error ?? "登録に失敗しました");
        return;
      }
      // 保存できたことを一拍見せてから閉じる（トースト相当）
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
        reset();
      }, 1000);
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
        人物を追加
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="person-add-title"
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6"
        >
          {/* 背景 */}
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          {/* ダイアログ本体 */}
          <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            {/* ヘッダー */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  aria-hidden
                  className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm flex-shrink-0"
                />
                <h2
                  id="person-add-title"
                  className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]"
                >
                  人物を追加
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
              {/* タブ切替（メイン / 詳細） */}
              <div className="flex items-center gap-1 border-b border-gray-200 -mt-1">
                <TabButton active={tab === "main"} onClick={() => setTab("main")}>
                  メイン
                </TabButton>
                <TabButton active={tab === "detail"} onClick={() => setTab("detail")}>
                  詳細
                </TabButton>
              </div>

              {tab === "main" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                      名前 <span className="text-[#c0524a]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={form.name}
                      onChange={(e) => change("name", e.target.value)}
                      placeholder="山田 太郎"
                      className={inputClass + " text-sm font-medium"}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>よみがな</label>
                    <input
                      type="text"
                      value={form.name_kana ?? ""}
                      onChange={(e) => change("name_kana", e.target.value)}
                      placeholder="やまだ たろう"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>会社</label>
                      <input
                        type="text"
                        value={form.company_name ?? ""}
                        onChange={(e) => change("company_name", e.target.value)}
                        placeholder="株式会社○○"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>役職・仕事</label>
                      <input
                        type="text"
                        value={form.position ?? ""}
                        onChange={(e) => change("position", e.target.value)}
                        placeholder="代表取締役 / 補助金コンサル"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>業種</label>
                    <input
                      type="text"
                      value={form.industry ?? ""}
                      onChange={(e) => change("industry", e.target.value)}
                      placeholder="介護 / 飲食 / 医療 / 不動産 / 士業 など"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <label className={labelClass}>温度感</label>
                      <select
                        value={form.temperature ?? ""}
                        onChange={(e) => change("temperature", e.target.value)}
                        className={inputClass + " bg-white"}
                      >
                        {TEMPERATURE_OPTIONS.map((o) => (
                          <option key={o.value || "_unset"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>次のアクション</label>
                    <input
                      type="text"
                      value={form.next_action ?? ""}
                      onChange={(e) => change("next_action", e.target.value)}
                      placeholder="来週ランチ打診"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>備考</label>
                    <textarea
                      value={form.caveats ?? ""}
                      onChange={(e) => change("caveats", e.target.value)}
                      rows={4}
                      placeholder="課題・注意点・話す時の地雷など、思いついたメモ"
                      className={inputClass + " resize-y"}
                    />
                  </div>
                </div>
              )}

              {tab === "detail" && (
                <div className="space-y-5">
                  <div>
                    <label className={labelClass}>出会った場所</label>
                    <input
                      type="text"
                      value={form.met_context ?? ""}
                      onChange={(e) => change("met_context", e.target.value)}
                      placeholder="○○セミナー / △△サロン / 紹介経由"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>URL（サイト・SNS・note）</label>
                    <input
                      type="url"
                      value={form.url ?? ""}
                      onChange={(e) => change("url", e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>生年月日</label>
                      <input
                        type="date"
                        value={form.birthday ?? ""}
                        onChange={(e) => change("birthday", e.target.value)}
                        className={inputClass + " font-mono"}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>性別</label>
                      <select
                        value={form.gender ?? ""}
                        onChange={(e) => change("gender", e.target.value)}
                        className={inputClass + " bg-white"}
                      >
                        <option value="">未指定</option>
                        <option value="男性">男性</option>
                        <option value="女性">女性</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>紹介元</label>
                    <PersonReferrerInput
                      tenantId={tenantId}
                      initialLinked={null}
                      initialText={form.referred_by ?? ""}
                      onChange={({ personId, text }) => {
                        change("referred_by_person_id", personId);
                        change("referred_by", text);
                      }}
                      placeholder="紹介者の名前（登録済みなら候補から選択 / 未登録ならそのままテキスト保存）"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>関心ごと（タグ）</label>
                    <InterestsInput
                      value={form.interests ?? []}
                      onChange={(next) => change("interests", next)}
                      placeholder="Enter で追加（例: 不動産 / AI / マラソン）"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]"
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {saved && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#bcd9c6] bg-[#eef6f0] text-[12px] text-[#2f6b46]">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>保存しました</span>
                </div>
              )}

              {/* アクション */}
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

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

// 編集ダイアログ内タブ。アクティブは underline で示す。
function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-2 -mb-px border-b-2 text-[12px] font-semibold tracking-wider transition-colors ${
        active
          ? "border-[#c08a3e] text-[#1c3550]"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
