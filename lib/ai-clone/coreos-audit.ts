// Core OS 棚卸し（健康診断）の共有ロジック。
// 編集可能なテーブル/列を allowlist で固定（任意の書き込みを防ぐ安全装置）。
// text 列のみ対象（text[] 配列列＝values_tags/business_pillars/related_values 等は除外）。

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface EditableField {
  key: string;
  label: string;
}
export interface EditableTableCfg {
  label: string; // セクション名（UI表示）
  deletable: boolean; // 行削除（retire）を許すか。1テナント1行の mission/plan は false
  fields: EditableField[]; // インライン書き直しを許す text 列
}

// ★ ここに無いテーブル/列には絶対に書き込まない。
export const CORE_OS_EDITABLE: Record<string, EditableTableCfg> = {
  ai_clone_mission: {
    label: "ミッション",
    deletable: false,
    fields: [
      { key: "mission", label: "ミッション" },
      { key: "target_world", label: "目指す世界" },
      { key: "not_doing", label: "やらないこと" },
      { key: "value_to_customer", label: "お客様に届けたい価値" },
    ],
  },
  ai_clone_three_year_plan: {
    label: "3年計画",
    deletable: false,
    fields: [
      { key: "plan_name", label: "計画名" },
      { key: "ideal_state_in_3y", label: "3年後の理想" },
      { key: "revenue_model", label: "収益モデル" },
      { key: "assets_to_build", label: "作りたい資産" },
      { key: "work_style_to_quit", label: "やめたい働き方" },
    ],
  },
  ai_clone_decision_principle: {
    label: "判断基準",
    deletable: true,
    fields: [
      { key: "name", label: "判断名" },
      { key: "rule", label: "判断ルール" },
      { key: "reason", label: "理由" },
      { key: "exception", label: "例外条件" },
    ],
  },
  ai_clone_tone_rule: {
    label: "口調ルール",
    deletable: true,
    fields: [
      { key: "base_tone", label: "基本の口調" },
      { key: "ng_expressions", label: "NG表現" },
      { key: "reply_length", label: "返信の長さ" },
      { key: "confirm_before_proposing", label: "提案前の確認" },
      { key: "no_pushy_rule", label: "押し売り回避" },
    ],
  },
  ai_clone_ng_rule: {
    label: "NGルール",
    deletable: true,
    fields: [
      { key: "area_name", label: "領域名" },
      { key: "reason_not_for_ai", label: "AIに任せない理由" },
      { key: "escalation_target", label: "エスカレ先" },
      { key: "confirmation_procedure", label: "確認手順" },
    ],
  },
  ai_clone_faq: {
    label: "FAQ",
    deletable: true,
    fields: [
      { key: "question", label: "質問" },
      { key: "base_answer", label: "基本回答" },
      { key: "supplement", label: "補足" },
      { key: "caveat", label: "注意点" },
    ],
  },
};

export function isEditableField(table: string, field: string): boolean {
  const cfg = CORE_OS_EDITABLE[table];
  return !!cfg && cfg.fields.some((f) => f.key === field);
}
export function isDeletableTable(table: string): boolean {
  return !!CORE_OS_EDITABLE[table]?.deletable;
}

export function adminSupabaseForAudit(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface CoreOsRow {
  table: string;
  id: string;
  sectionLabel: string;
  rowLabel: string; // 行の見出し（先頭フィールドの抜粋）
  fields: { field: string; label: string; value: string }[];
}

// allowlist のテーブルから、テナントの text 値が入っている行・列だけを構造化して読む。
export async function loadCoreOsRows(tenantId: string): Promise<CoreOsRow[]> {
  const sb = adminSupabaseForAudit();
  if (!sb) return [];
  const out: CoreOsRow[] = [];
  for (const [table, cfg] of Object.entries(CORE_OS_EDITABLE)) {
    const cols = ["id", ...cfg.fields.map((f) => f.key)].join(",");
    const { data } = await sb
      .from(table)
      .select(cols)
      .eq("tenant_id", tenantId)
      .limit(50);
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) {
      const fields = cfg.fields
        .map((f) => ({
          field: f.key,
          label: f.label,
          value: typeof r[f.key] === "string" ? (r[f.key] as string) : "",
        }))
        .filter((f) => f.value.trim().length > 0);
      if (fields.length === 0) continue;
      out.push({
        table,
        id: String(r.id),
        sectionLabel: cfg.label,
        rowLabel: fields[0].value.slice(0, 30),
        fields,
      });
    }
  }
  return out;
}
