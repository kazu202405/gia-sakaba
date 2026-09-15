// /clone/[slug]/review/pending ─ 21_更新待ちルール の一覧 + 追加 + 承認/却下。
// 右腕AI が拾った「ルールにすべき気づき」を承認 → Core OS / FAQ へ昇格させる場所。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ReviewNav } from "../_components/ReviewNav";
import { PendingRuleAddDialog } from "./_components/PendingRuleAddDialog";
import { PendingRuleStatusSelect } from "./_components/PendingRuleStatusSelect";
import { PendingRuleEditDialog } from "./_components/PendingRuleEditDialog";
import { PendingRuleDeleteButton } from "./_components/PendingRuleDeleteButton";

export const dynamic = "force-dynamic";

interface PendingRuleRow {
  id: string;
  proposed_change: string;
  rule_kind: string | null;
  reason: string | null;
  target_db: string | null;
  origin_log: string | null;
  approval_status: string | null;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    申請中: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]" },
    承認: { bg: "bg-[#e9efe9]", border: "border-[#c5d3c8]", text: "text-[#3d6651]" },
    却下: { bg: "bg-[#f3e9e6]", border: "border-[#d8c4be]", text: "text-[#8a4538]" },
    保留: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500" },
  };
  const s = styles[status] ?? styles["保留"];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${s.bg} ${s.border} ${s.text}`}
    >
      {status}
    </span>
  );
}

export default async function PendingRulesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_pending_rule")
    .select(
      "id, proposed_change, rule_kind, reason, target_db, origin_log, approval_status",
    )
    .eq("tenant_id", tenant.id)
    .order("approval_status", { ascending: true })
    .order("created_at", { ascending: false });

  const rules = (data ?? []) as PendingRuleRow[];
  const requestedCount = rules.filter(
    (r) => r.approval_status === "申請中",
  ).length;

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="REVIEW / RULES"
        title="更新待ちルール"
        description="右腕AI が拾った「ルールにすべき気づき」の draft 置き場。承認 → 04_判断基準 / 06_NG / 08_FAQ などに昇格。"
        right={
          <div className="flex items-center gap-2">
            {requestedCount > 0 && (
              <MetricChip count={requestedCount} label="申請中" tone="gold" />
            )}
            <MetricChip count={rules.length} label="件" tone="navy" />
            <PendingRuleAddDialog slug={slug} tenantId={tenant.id} />
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

      {!error && rules.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだルール案がありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            会話・案件・判断の中で「これはルールにすべき」と感じた気づきを、まず draft として置いていきます。
            <br />
            承認 → Core OS / FAQ に昇格させていきます。
          </p>
        </EditorialCard>
      )}

      {!error && rules.length > 0 && (
        <ul className="space-y-3">
          {rules.map((r) => {
            const dimmed =
              r.approval_status === "却下" || r.approval_status === "承認";
            const initial = {
              proposed_change: r.proposed_change,
              rule_kind: r.rule_kind ?? "",
              reason: r.reason ?? "",
              target_db: r.target_db ?? "",
              origin_log: r.origin_log ?? "",
            };
            const label = r.proposed_change.slice(0, 40);
            return (
              <li key={r.id}>
                <EditorialCard
                  variant="row"
                  className={`px-5 py-4 group ${dimmed ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1c3550] leading-relaxed whitespace-pre-wrap">
                        {r.proposed_change}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {r.rule_kind && (
                          <span className="text-[11px] tracking-[0.15em] text-gray-500 uppercase">
                            {r.rule_kind}
                          </span>
                        )}
                        {r.target_db && (
                          <span className="text-[11px] text-gray-500">
                            → {r.target_db}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={r.approval_status} />
                      <PendingRuleStatusSelect
                        slug={slug}
                        tenantId={tenant.id}
                        ruleId={r.id}
                        status={r.approval_status ?? "申請中"}
                      />
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PendingRuleEditDialog
                          slug={slug}
                          tenantId={tenant.id}
                          ruleId={r.id}
                          initial={initial}
                        />
                        <PendingRuleDeleteButton
                          slug={slug}
                          tenantId={tenant.id}
                          ruleId={r.id}
                          label={label}
                        />
                      </div>
                    </div>
                  </div>

                  {r.reason && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                      <span className="text-gray-400 tracking-wider text-[10px]">
                        理由：
                      </span>
                      {r.reason}
                    </div>
                  )}

                  {r.origin_log && (
                    <div className="mt-1.5 text-[11px] text-gray-500 whitespace-pre-wrap">
                      <span className="text-gray-400 tracking-wider">元: </span>
                      {r.origin_log}
                    </div>
                  )}
                </EditorialCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
