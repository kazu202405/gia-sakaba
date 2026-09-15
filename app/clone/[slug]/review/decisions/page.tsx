// /clone/[slug]/review/decisions ─ 判断履歴の一覧 + 追加。
// promote_to_core_os = true は「Core OS 昇格候補」バッジで強調。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ReviewNav } from "../_components/ReviewNav";
import { DecisionLogAddDialog } from "./_components/DecisionLogAddDialog";
import { DecisionLogCardRow } from "./_components/DecisionLogCardRow";

export const dynamic = "force-dynamic";

interface DecisionLogRow {
  id: string;
  occurred_at: string;
  theme: string | null;
  conclusion: string | null;
  reasoning: string | null;
  values_emphasized: string[] | null;
  reusable_rule: string | null;
  promote_to_core_os: boolean | null;
}

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_decision_log")
    .select(
      "id, occurred_at, theme, conclusion, reasoning, values_emphasized, reusable_rule, promote_to_core_os",
    )
    .eq("tenant_id", tenant.id)
    .order("occurred_at", { ascending: false });

  const logs = (data ?? []) as DecisionLogRow[];
  const promoteCount = logs.filter((l) => l.promote_to_core_os).length;

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="REVIEW / DECISIONS"
        title="判断履歴"
        description="その時どう判断したか・なぜそう判断したかの蓄積。右腕AI があなたの判断クセを学ぶ最重要データ。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={logs.length} label="判断" tone="navy" />
            {promoteCount > 0 && (
              <MetricChip count={promoteCount} label="昇格候補" tone="gold" />
            )}
            <DecisionLogAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <ReviewNav slug={slug} />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && logs.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ判断履歴がありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            「これは記録に残しておきたい」と思う判断をした時に、テーマ・結論・理由を残していきます。
            <br />
            「次回も使える」と感じたものは Core OS（判断基準）に昇格できます。
          </p>
        </EditorialCard>
      )}

      {!error && logs.length > 0 && (
        <ul className="space-y-3">
          {logs.map((l) => (
            <li key={l.id}>
              <DecisionLogCardRow
                slug={slug}
                tenantId={tenant.id}
                decisionId={l.id}
                occurredAt={l.occurred_at}
                theme={l.theme}
                conclusion={l.conclusion}
                reasoning={l.reasoning}
                valuesEmphasized={l.values_emphasized}
                reusableRule={l.reusable_rule}
                promoteToCoreOs={l.promote_to_core_os}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
