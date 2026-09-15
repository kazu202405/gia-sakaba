"use client";

// サービス編集/追加ダイアログ共通の「紹介されやすさ」セクション。
// USP・買う理由・紹介の一言の3欄 ＋「AIで磨く」ボタン（polishService を呼んで欄を自動入力）。
// 生成は提案であって保存ではない。人が確認して保存（フォーム submit）する。

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { polishService, type ServiceInput } from "../_actions";

const labelClass = "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

interface Props {
  form: ServiceInput;
  onChange: <K extends keyof ServiceInput>(
    key: K,
    value: ServiceInput[K],
  ) => void;
}

export function ReferralReadinessSection({ form, onChange }: Props) {
  const [polishing, setPolishing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const polish = async () => {
    if (polishing) return;
    setPolishing(true);
    setErr(null);
    try {
      const res = await polishService(form);
      if (!res.ok || !res.data) {
        setErr(res.error ?? "生成に失敗しました");
        return;
      }
      onChange("usp", res.data.usp);
      onChange("buying_reason", res.data.buying_reason);
      onChange("referral_one_liner", res.data.referral_one_liner);
    } catch {
      setErr("生成に失敗しました");
    } finally {
      setPolishing(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] tracking-[0.18em] text-[#1c3550] font-semibold">
          紹介されやすさ
        </p>
        <button
          type="button"
          onClick={polish}
          disabled={polishing || !form.name.trim()}
          title="対象・悩み・提供を素材に、USP・買う理由・紹介の一言の案を作って入れます"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#c08a3e]/40 text-[11px] font-medium text-[#8a5a1c] bg-[#fbf6ee] hover:bg-[#f5ead5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {polishing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {polishing ? "磨いています…" : "AIで磨く"}
        </button>
      </div>

      {err && (
        <div
          role="alert"
          className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]"
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div>
        <label className={labelClass}>USP（他との違い）</label>
        <textarea
          value={form.usp ?? ""}
          onChange={(e) => onChange("usp", e.target.value)}
          rows={2}
          placeholder="価格でなく“対応の速さと相談しやすさ”で選ばれている"
          className={inputClass + " resize-y"}
        />
      </div>

      <div>
        <label className={labelClass}>あなたから買う理由</label>
        <textarea
          value={form.buying_reason ?? ""}
          onChange={(e) => onChange("buying_reason", e.target.value)}
          rows={2}
          placeholder="同業の中でも対応が早く、長く付き合えると評判だから"
          className={inputClass + " resize-y"}
        />
      </div>

      <div>
        <label className={labelClass}>紹介しやすい一言（30秒）</label>
        <textarea
          value={form.referral_one_liner ?? ""}
          onChange={(e) => onChange("referral_one_liner", e.target.value)}
          rows={2}
          placeholder="「経理をまるごと安心して任せられる事務所があってさ」"
          className={inputClass + " resize-y"}
        />
      </div>

      <p className="text-[10px] text-gray-400">
        「AIで磨く」は対象・悩み・提供を素材に案を入れます。確認・修正してから保存してください。
      </p>
    </div>
  );
}
