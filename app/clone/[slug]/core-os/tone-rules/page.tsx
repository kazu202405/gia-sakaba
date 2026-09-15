// /clone/[slug]/core-os/tone-rules ─ 口調ルールの一覧 + 追加。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { CoreOsNav } from "../_components/CoreOsNav";
import { SectionGuide } from "../_components/SectionGuide";
import { CoreOsAssistDialog } from "../_components/CoreOsAssistDialog";
import { ToneRuleAddDialog } from "./_components/ToneRuleAddDialog";
import { ToneRuleEditDialog } from "./_components/ToneRuleEditDialog";
import { ToneRuleDeleteButton } from "./_components/ToneRuleDeleteButton";

export const dynamic = "force-dynamic";

interface ToneRuleRow {
  id: string;
  name: string;
  base_tone: string | null;
  politeness: string | null;
  ng_expressions: string | null;
  reply_length: string | null;
  confirm_before_proposing: string | null;
  no_pushy_rule: string | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="text-[12px]">
      <span className="text-gray-400 tracking-wider">{label}: </span>
      <span className="text-gray-700 whitespace-pre-wrap">{value}</span>
    </div>
  );
}

export default async function ToneRulesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_tone_rule")
    .select(
      "id, name, base_tone, politeness, ng_expressions, reply_length, confirm_before_proposing, no_pushy_rule",
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  const rules = (data ?? []) as ToneRuleRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        title="口調・対応ルール"
        description="右腕AI が話す時の質感を決める。基本の口調・丁寧さ・NG表現・返信の長さを言語化する。"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <MetricChip count={rules.length} label="ルール" tone="navy" />
            <CoreOsAssistDialog slug={slug} section="tone-rules" />
            <ToneRuleAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <CoreOsNav slug={slug} />

      <SectionGuide section="tone-rules" />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && rules.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ口調ルールがありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            「社長の標準口調」「商談時の口調」など、シーン別の口調を言語化していきます。
          </p>
        </EditorialCard>
      )}

      {!error && rules.length > 0 && (
        <ul className="space-y-3">
          {rules.map((r) => {
            const initial = {
              name: r.name,
              base_tone: r.base_tone ?? "",
              politeness: r.politeness ?? "",
              ng_expressions: r.ng_expressions ?? "",
              reply_length: r.reply_length ?? "",
              confirm_before_proposing: r.confirm_before_proposing ?? "",
              no_pushy_rule: r.no_pushy_rule ?? "",
            };
            return (
              <li key={r.id}>
                <EditorialCard variant="row" className="px-5 py-4 group">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-sm font-bold text-[#1c3550]">
                      {r.name}
                    </h3>
                    <div className="flex items-center gap-0.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                      <ToneRuleEditDialog
                        slug={slug}
                        tenantId={tenant.id}
                        ruleId={r.id}
                        initial={initial}
                      />
                      <ToneRuleDeleteButton
                        slug={slug}
                        tenantId={tenant.id}
                        ruleId={r.id}
                        label={r.name}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Field label="基本の口調" value={r.base_tone} />
                    <Field label="丁寧さ" value={r.politeness} />
                    <Field label="返信の長さ" value={r.reply_length} />
                    <Field label="NG表現" value={r.ng_expressions} />
                    <Field label="提案前の確認" value={r.confirm_before_proposing} />
                    <Field label="押し売り回避" value={r.no_pushy_rule} />
                  </div>
                </EditorialCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
