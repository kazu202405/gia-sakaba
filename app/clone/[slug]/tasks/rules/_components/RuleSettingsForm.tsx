"use client";

// 夜の売上行動4ルールの設定フォーム。ON/OFF・日数・対象重要度（一部ルールのみ）。
import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { saveRuleSettings, type RuleSetting, type RuleKey } from "../_actions";

interface RuleMeta {
  key: RuleKey;
  label: string;
  desc: string;
  hasImportance: boolean;
  daysSuffix: string;
}

const RULE_META: RuleMeta[] = [
  {
    key: "re_touch",
    label: "再接触",
    desc: "重要な人に一定期間 連絡できていない",
    hasImportance: true,
    daysSuffix: "日以上 無接触",
  },
  {
    key: "promise_stale",
    label: "約束あり×停滞",
    desc: "約束（次のアクション）があるのに動きがない",
    hasImportance: true,
    daysSuffix: "日以上 停滞",
  },
  {
    key: "stalled_deal",
    label: "放置案件",
    desc: "商談したのに受注/失注の記録がない",
    hasImportance: false,
    daysSuffix: "日以上 経過",
  },
  {
    key: "ask_referral",
    label: "紹介依頼",
    desc: "受注したのに紹介依頼の記録がない",
    hasImportance: false,
    daysSuffix: "日以内",
  },
];

const IMPORTANCE_CHIPS = ["S", "A", "B", "C"];

export function RuleSettingsForm({
  slug,
  tenantId,
  initial,
}: {
  slug: string;
  tenantId: string;
  initial: Record<RuleKey, RuleSetting>;
}) {
  const [settings, setSettings] = useState<Record<RuleKey, RuleSetting>>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: RuleKey, patch: Partial<RuleSetting>) => {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setSaved(false);
    setError(null);
  };

  const toggleImportance = (key: RuleKey, level: string) => {
    const cur = settings[key].importance_levels;
    const next = cur.includes(level)
      ? cur.filter((l) => l !== level)
      : [...cur, level];
    update(key, { importance_levels: next });
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveRuleSettings(slug, tenantId, RULE_META.map((m) => settings[m.key]));
      if (!res.ok) {
        setError(res.error ?? "保存に失敗しました");
        return;
      }
      setSaved(true);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-gray-500 leading-relaxed">
        前日19時の配信に出す「やるべき売上行動」のルールです。ON/OFF と日数のしきい値を調整できます。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        {RULE_META.map((m) => {
          const s = settings[m.key];
          return (
            <div
              key={m.key}
              className={`rounded-md border px-4 py-3.5 transition-colors ${
                s.enabled ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#1c3550]">{m.label}</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">{m.desc}</div>
                </div>
                {/* ON/OFF トグル */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.enabled}
                  onClick={() => update(m.key, { enabled: !s.enabled })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                    s.enabled ? "bg-[#1c3550]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      s.enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {s.enabled && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={s.threshold_days}
                      onChange={(e) =>
                        update(m.key, { threshold_days: Number(e.target.value) })
                      }
                      className="w-20 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 text-right tabular-nums focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10"
                    />
                    <span className="text-gray-600">{m.daysSuffix}</span>
                  </div>

                  {m.hasImportance && (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-gray-500">対象の重要度:</span>
                      <div className="flex gap-1.5">
                        {IMPORTANCE_CHIPS.map((lvl) => {
                          const on = s.importance_levels.includes(lvl);
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => toggleImportance(m.key, lvl)}
                              className={`w-8 h-7 rounded-md text-[12px] font-bold border transition-colors ${
                                on
                                  ? "bg-[#1c3550] text-white border-[#1c3550]"
                                  : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              {lvl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-[12px] text-[#8a4538]">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 transition-colors"
        >
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          保存する
        </button>
        {saved && !pending && (
          <span className="inline-flex items-center gap-1 text-[12px] text-[#3d6651]">
            <Check className="w-3.5 h-3.5" />
            保存しました
          </span>
        )}
      </div>
    </div>
  );
}
