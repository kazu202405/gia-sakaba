// /clone/[slug]/tasks/rules ─ リマインドの「配信ルール」タブ。
// 夜の売上行動4ルールの ON/OFF・日数・対象重要度を設定。データ: ai_clone_briefing_rule_settings（0047）。

import { EditorialHeader } from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ReminderTabs } from "../_components/ReminderTabs";
import { RuleSettingsForm } from "./_components/RuleSettingsForm";
import type { RuleKey, RuleSetting } from "./_actions";

export const dynamic = "force-dynamic";

// ルール別デフォルト（設定行が無いときの初期値。RPC 側のデフォルトと揃える）
const DEFAULTS: Record<RuleKey, { threshold_days: number }> = {
  re_touch: { threshold_days: 30 },
  promise_stale: { threshold_days: 30 },
  stalled_deal: { threshold_days: 14 },
  ask_referral: { threshold_days: 90 },
};
const RULE_KEYS: RuleKey[] = [
  "re_touch",
  "promise_stale",
  "stalled_deal",
  "ask_referral",
];

export default async function BriefingRulesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_clone_briefing_rule_settings")
    .select("rule_key, enabled, threshold_days, importance_levels")
    .eq("tenant_id", tenant.id);

  const saved = new Map(
    ((data ?? []) as RuleSetting[]).map((r) => [r.rule_key, r]),
  );

  // 設定行が無いルールはデフォルトで埋める
  const initial = {} as Record<RuleKey, RuleSetting>;
  for (const key of RULE_KEYS) {
    const row = saved.get(key);
    initial[key] = row
      ? {
          rule_key: key,
          enabled: row.enabled,
          threshold_days: row.threshold_days,
          importance_levels: row.importance_levels ?? ["S", "A"],
        }
      : {
          rule_key: key,
          enabled: true,
          threshold_days: DEFAULTS[key].threshold_days,
          importance_levels: ["S", "A"],
        };
  }

  return (
    <div className="px-5 sm:px-6 py-6 space-y-5">
      <ReminderTabs slug={slug} active="rules" />

      <EditorialHeader
        eyebrow="REMINDER / RULES"
        title="配信ルール"
        description="前日19時の配信に出す「やるべき売上行動」の条件。ルールごとに ON/OFF・日数・対象重要度を調整できます。"
      />

      <RuleSettingsForm slug={slug} tenantId={tenant.id} initial={initial} />
    </div>
  );
}
