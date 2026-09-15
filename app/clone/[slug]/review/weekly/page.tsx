// /clone/[slug]/review/weekly ─ 22_週次レビュー の一覧 + 追加 + 編集 + 削除。
// 経営者が一週間を振り返り、Core OSに昇格させる気づきを置いていく場所。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ReviewNav } from "../_components/ReviewNav";
import { WeeklyReviewAddDialog } from "./_components/WeeklyReviewAddDialog";
import { WeeklyReviewEditDialog } from "./_components/WeeklyReviewEditDialog";
import { WeeklyReviewDeleteButton } from "./_components/WeeklyReviewDeleteButton";

export const dynamic = "force-dynamic";

interface WeeklyReviewRow {
  id: string;
  period: string;
  key_decisions: string | null;
  progressed_projects: string | null;
  stuck_projects: string | null;
  new_decision_rules: string | null;
  relationship_changes: string | null;
  next_week_priorities: string | null;
  promote_to_core_os: string | null;
}

export default async function WeeklyReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_weekly_review")
    .select(
      "id, period, key_decisions, progressed_projects, stuck_projects, " +
        "new_decision_rules, relationship_changes, next_week_priorities, promote_to_core_os",
    )
    .eq("tenant_id", tenant.id)
    .order("period", { ascending: false })
    .order("created_at", { ascending: false });

  const reviews = (data ?? []) as unknown as WeeklyReviewRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="REVIEW / WEEKLY"
        title="週次レビュー"
        description="今週の重要判断・進んだ案件・止まっている案件・来週の優先タスクを記録。Core OS への昇格判断の起点。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={reviews.length} label="件" tone="navy" />
            <WeeklyReviewAddDialog slug={slug} tenantId={tenant.id} />
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

      {!error && reviews.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ週次レビューがありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            週の終わりに「重要判断 / 進んだ案件 / 止まっている案件 / 来週の優先タスク」を残していきます。
            <br />
            積み上げが Core OS の更新源になります。
          </p>
        </EditorialCard>
      )}

      {!error && reviews.length > 0 && (
        <ul className="space-y-3">
          {reviews.map((r) => {
            const initial = {
              period: r.period,
              key_decisions: r.key_decisions ?? "",
              progressed_projects: r.progressed_projects ?? "",
              stuck_projects: r.stuck_projects ?? "",
              new_decision_rules: r.new_decision_rules ?? "",
              relationship_changes: r.relationship_changes ?? "",
              next_week_priorities: r.next_week_priorities ?? "",
              promote_to_core_os: r.promote_to_core_os ?? "",
            };
            return (
              <li key={r.id}>
                <EditorialCard variant="row" className="px-5 py-4 group">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="font-serif text-[15px] font-semibold text-[#1c3550] tracking-[0.04em]">
                          {r.period}
                        </span>
                        {r.promote_to_core_os && (
                          <span className="text-[10px] tracking-[0.18em] text-[#c08a3e] uppercase">
                            Core OS 候補あり
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <WeeklyReviewEditDialog
                        slug={slug}
                        tenantId={tenant.id}
                        reviewId={r.id}
                        initial={initial}
                      />
                      <WeeklyReviewDeleteButton
                        slug={slug}
                        tenantId={tenant.id}
                        reviewId={r.id}
                        label={r.period}
                      />
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
                    {r.key_decisions && (
                      <Field label="重要判断" value={r.key_decisions} />
                    )}
                    {r.next_week_priorities && (
                      <Field
                        label="来週の優先タスク"
                        value={r.next_week_priorities}
                      />
                    )}
                    {r.progressed_projects && (
                      <Field label="進んだ案件" value={r.progressed_projects} />
                    )}
                    {r.stuck_projects && (
                      <Field
                        label="止まっている案件"
                        value={r.stuck_projects}
                      />
                    )}
                    {r.new_decision_rules && (
                      <Field
                        label="新しい判断基準"
                        value={r.new_decision_rules}
                      />
                    )}
                    {r.relationship_changes && (
                      <Field
                        label="関係性の変化"
                        value={r.relationship_changes}
                      />
                    )}
                  </dl>

                  {r.promote_to_core_os && (
                    <div className="mt-3 pt-3 border-t border-dashed border-[#e6d3a3]">
                      <p className="text-[10px] tracking-[0.18em] text-[#c08a3e] uppercase mb-1">
                        Core OS に反映
                      </p>
                      <p className="text-[12.5px] text-[#1c3550] leading-relaxed whitespace-pre-wrap">
                        {r.promote_to_core_os}
                      </p>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.18em] text-gray-400 uppercase mb-1">
        {label}
      </dt>
      <dd className="text-gray-700 leading-relaxed whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  );
}
