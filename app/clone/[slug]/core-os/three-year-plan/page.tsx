// /clone/[slug]/core-os/three-year-plan ─ 3年計画の編集。1テナント1行運用。

import {
  EditorialHeader,
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { CoreOsNav } from "../_components/CoreOsNav";
import { SectionGuide } from "../_components/SectionGuide";
import { CoreOsAssistDialog } from "../_components/CoreOsAssistDialog";
import { ThreeYearPlanForm } from "./_components/ThreeYearPlanForm";
import type { ThreeYearPlanInput } from "./_actions";

export const dynamic = "force-dynamic";

interface PlanRow {
  id: string;
  plan_name: string;
  ideal_state_in_3y: string | null;
  business_pillars: string[] | null;
  revenue_model: string | null;
  assets_to_build: string | null;
  work_style_to_quit: string | null;
}

export default async function ThreeYearPlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_three_year_plan")
    .select(
      "id, plan_name, ideal_state_in_3y, business_pillars, revenue_model, assets_to_build, work_style_to_quit",
    )
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = (data ?? null) as PlanRow | null;

  const initial: ThreeYearPlanInput = {
    plan_name: row?.plan_name ?? "",
    ideal_state_in_3y: row?.ideal_state_in_3y ?? "",
    business_pillars: row?.business_pillars
      ? row.business_pillars.join(", ")
      : "",
    revenue_model: row?.revenue_model ?? "",
    assets_to_build: row?.assets_to_build ?? "",
    work_style_to_quit: row?.work_style_to_quit ?? "",
  };

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        title="3年計画"
        description="3年後の理想状態と、そこに辿り着く事業の柱・収益モデル・資産。右腕AI が中期判断の軸として参照する。"
        right={<CoreOsAssistDialog slug={slug} section="three-year-plan" />}
        rightOnTitleRow
      />

      <CoreOsNav slug={slug} />

      <SectionGuide section="three-year-plan" />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      <EditorialCard className="px-6 py-6">
        <ThreeYearPlanForm
          slug={slug}
          tenantId={tenant.id}
          existingId={row?.id ?? null}
          initial={initial}
        />
      </EditorialCard>
    </div>
  );
}
