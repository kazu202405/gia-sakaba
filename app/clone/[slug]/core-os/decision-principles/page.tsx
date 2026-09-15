// /clone/[slug]/core-os/decision-principles
//   内部に2つのサブタブ：
//     - 原則（principle）：既存の「単発仕事は引き受けない」型ルール
//     - 事例（case）：日々の判断ログ。原則の素材になる
//   URL ?view=case で事例タブ、未指定 / ?view=principle で原則タブ。

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
import { DecisionSubTabs } from "./_components/DecisionSubTabs";
import { DecisionPrincipleAddDialog } from "./_components/DecisionPrincipleAddDialog";
import { DecisionPrincipleEditDialog } from "./_components/DecisionPrincipleEditDialog";
import { DecisionPrincipleDeleteButton } from "./_components/DecisionPrincipleDeleteButton";
import { CaseAddDialog } from "./_components/CaseAddDialog";
import { CaseRow, type CaseRowData } from "./_components/CaseRow";

export const dynamic = "force-dynamic";

interface PrincipleRow {
  id: string;
  name: string;
  category: string | null;
  rule: string | null;
  reason: string | null;
  priority: string | null;
  exception: string | null;
  related_values: string[] | null;
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    高: { bg: "bg-[#f3e9e6]", border: "border-[#d8c4be]", text: "text-[#8a4538]" },
    中: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]" },
    低: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500" },
  };
  const s = styles[priority] ?? styles["低"];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${s.bg} ${s.border} ${s.text}`}
    >
      優先 {priority}
    </span>
  );
}

export default async function DecisionPrinciplesPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const view = (sp.view ?? "principle").toString() === "case" ? "case" : "principle";
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();

  // 原則一覧と事例一覧を並列取得（どちらも件数バッジに使う）
  const [principleRes, caseRes] = await Promise.all([
    supabase
      .from("ai_clone_decision_principle")
      .select(
        "id, name, category, rule, reason, priority, exception, related_values",
      )
      .eq("tenant_id", tenant.id)
      .order("priority", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_clone_decision_case")
      .select(
        "id, event, insight, action, outcome, takeaway, intent, boundary, reflection, reusable_when, emotion, capture_mode, ai_drafted, confirmed, occurred_at",
      )
      .eq("tenant_id", tenant.id)
      .order("occurred_at", { ascending: false }),
  ]);

  const principles = (principleRes.data ?? []) as PrincipleRow[];
  const cases = (caseRes.data ?? []) as CaseRowData[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        title="判断基準"
        description="原則は「あなたっぽく判断する核」、事例は「その原則を磨くための素材」。日々の判断を残しておくと、AI がだんだん本人の感覚に近づく。"
        right={
          <div className="flex flex-wrap items-center gap-2">
            {view === "principle" ? (
              <>
                <MetricChip count={principles.length} label="原則" tone="navy" />
                <CoreOsAssistDialog slug={slug} section="decision-principles" />
                <DecisionPrincipleAddDialog slug={slug} tenantId={tenant.id} />
              </>
            ) : (
              <>
                <MetricChip count={cases.length} label="事例" tone="navy" />
                <CaseAddDialog slug={slug} tenantId={tenant.id} />
              </>
            )}
          </div>
        }
      />

      <CoreOsNav slug={slug} />

      <SectionGuide section="decision-principles" />

      {/* サブタブ：原則 / 事例 */}
      <DecisionSubTabs
        slug={slug}
        view={view}
        principleCount={principles.length}
        caseCount={cases.length}
      />

      {/* ─── 原則タブ ─────────────────────────────── */}
      {view === "principle" && (
        <>
          {principleRes.error && (
            <EditorialCard className="px-5 py-4">
              <p className="text-[13px] text-[#8a4538]">
                一覧の取得に失敗しました：{principleRes.error.message}
              </p>
            </EditorialCard>
          )}

          {!principleRes.error && principles.length === 0 && (
            <EditorialCard className="px-6 py-12 text-center">
              <p className="font-serif text-base text-[#1c3550] mb-2">
                まだ判断基準がありません
              </p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                「単発仕事は引き受けない」「30分以内に返信する」など、判断のクセを言語化していきます。
              </p>
            </EditorialCard>
          )}

          {!principleRes.error && principles.length > 0 && (
            <ul className="space-y-3">
              {principles.map((p) => {
                const initial = {
                  name: p.name,
                  category: p.category ?? "",
                  rule: p.rule ?? "",
                  reason: p.reason ?? "",
                  priority: p.priority ?? "",
                  exception: p.exception ?? "",
                  related_values: p.related_values
                    ? p.related_values.join(", ")
                    : "",
                };
                return (
                  <li key={p.id}>
                    <EditorialCard variant="row" className="px-5 py-4 group">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="text-sm font-bold text-[#1c3550] mb-1">
                            {p.name}
                          </h3>
                          {p.category && (
                            <span className="text-[11px] tracking-[0.15em] text-gray-500 uppercase">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={p.priority} />
                          <div className="flex items-center gap-0.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                            <DecisionPrincipleEditDialog
                              slug={slug}
                              tenantId={tenant.id}
                              principleId={p.id}
                              initial={initial}
                            />
                            <DecisionPrincipleDeleteButton
                              slug={slug}
                              tenantId={tenant.id}
                              principleId={p.id}
                              label={p.name}
                            />
                          </div>
                        </div>
                      </div>

                      {p.rule && (
                        <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap mt-2">
                          {p.rule}
                        </p>
                      )}

                      <div className="space-y-1.5 mt-3 text-[12px]">
                        {p.reason && (
                          <div>
                            <span className="text-gray-400 tracking-wider">理由: </span>
                            <span className="text-gray-700 whitespace-pre-wrap">
                              {p.reason}
                            </span>
                          </div>
                        )}
                        {p.exception && (
                          <div>
                            <span className="text-gray-400 tracking-wider">例外: </span>
                            <span className="text-gray-700 whitespace-pre-wrap">
                              {p.exception}
                            </span>
                          </div>
                        )}
                      </div>

                      {p.related_values && p.related_values.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                          {p.related_values.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-gray-500 bg-gray-50 border border-gray-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </EditorialCard>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ─── 事例タブ ─────────────────────────────── */}
      {view === "case" && (
        <>
          {caseRes.error && (
            <EditorialCard className="px-5 py-4">
              <p className="text-[13px] text-[#8a4538]">
                一覧の取得に失敗しました：{caseRes.error.message}
              </p>
            </EditorialCard>
          )}

          {!caseRes.error && cases.length === 0 && (
            <EditorialCard className="px-6 py-12 text-center">
              <p className="font-serif text-base text-[#1c3550] mb-2">
                まだ事例が記録されていません
              </p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                日々の相談・判断を 1〜3 分で記録します。AI が後から補完・原則化していくための素材です。
                <br />
                完璧でなくて大丈夫。「何があった／どうした／どうなった」だけでも OK。
              </p>
            </EditorialCard>
          )}

          {!caseRes.error && cases.length > 0 && (
            <ul className="space-y-3">
              {cases.map((c) => (
                <li key={c.id}>
                  <CaseRow
                    slug={slug}
                    tenantId={tenant.id}
                    caseData={c}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
