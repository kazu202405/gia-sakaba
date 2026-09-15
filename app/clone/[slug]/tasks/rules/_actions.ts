// /clone/[slug]/tasks/rules（配信ルール）の Server Actions。
// 夜の売上行動4ルールの ON/OFF・日数・対象重要度をテナント設定として保存。
// データ: ai_clone_briefing_rule_settings（migration 0047）

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RuleKey =
  | "re_touch"
  | "promise_stale"
  | "stalled_deal"
  | "ask_referral";

export interface RuleSetting {
  rule_key: RuleKey;
  enabled: boolean;
  threshold_days: number;
  importance_levels: string[]; // re_touch / promise_stale のみ意味を持つ
}

const VALID_KEYS: RuleKey[] = [
  "re_touch",
  "promise_stale",
  "stalled_deal",
  "ask_referral",
];
const VALID_IMPORTANCE = ["S", "A", "B", "C"];

export async function saveRuleSettings(
  slug: string,
  tenantId: string,
  settings: RuleSetting[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const rows = settings
    .filter((s) => VALID_KEYS.includes(s.rule_key))
    .map((s) => {
      // 日数は 1〜3650 にクランプ
      const days = Math.min(
        3650,
        Math.max(1, Math.trunc(Number(s.threshold_days) || 1)),
      );
      const imps = Array.from(
        new Set((s.importance_levels ?? []).filter((x) => VALID_IMPORTANCE.includes(x))),
      );
      return {
        tenant_id: tenantId,
        rule_key: s.rule_key,
        enabled: !!s.enabled,
        threshold_days: days,
        // 重要度未選択は安全側に S/A を入れておく（全員ヒット防止）
        importance_levels: imps.length > 0 ? imps : ["S", "A"],
      };
    });

  if (rows.length === 0) {
    return { ok: false, error: "保存対象がありません" };
  }

  const { error } = await supabase
    .from("ai_clone_briefing_rule_settings")
    .upsert(rows, { onConflict: "tenant_id,rule_key" });

  if (error) {
    return { ok: false, error: `保存に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/tasks/rules`);
  return { ok: true };
}
