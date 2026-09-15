// /clone/[slug]/core-os/mission ─ ミッション理念の編集。1テナント1行。

import {
  EditorialHeader,
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { CoreOsNav } from "../_components/CoreOsNav";
import { SectionGuide } from "../_components/SectionGuide";
import { CoreOsAssistDialog } from "../_components/CoreOsAssistDialog";
import { MissionForm } from "./_components/MissionForm";
import type { MissionInput } from "./_actions";

export const dynamic = "force-dynamic";

interface MissionRow {
  id: string;
  mission: string | null;
  values_tags: string[] | null;
  target_world: string | null;
  not_doing: string | null;
  value_to_customer: string | null;
}

export default async function MissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  // 1テナント1行運用。ただし schema は複数行可なので最新1件を取る。
  const { data, error } = await supabase
    .from("ai_clone_mission")
    .select("id, mission, values_tags, target_world, not_doing, value_to_customer")
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = (data ?? null) as MissionRow | null;

  const initial: MissionInput = {
    mission: row?.mission ?? "",
    values_tags: row?.values_tags ? row.values_tags.join(", ") : "",
    target_world: row?.target_world ?? "",
    not_doing: row?.not_doing ?? "",
    value_to_customer: row?.value_to_customer ?? "",
  };

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        title="ミッション理念"
        description="あなたが何のために事業を続けるのか。右腕AI が判断に迷った時の最上位の根拠。"
        right={<CoreOsAssistDialog slug={slug} section="mission" />}
        rightOnTitleRow
      />

      <CoreOsNav slug={slug} />

      <SectionGuide section="mission" />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      <EditorialCard className="px-6 py-6">
        <MissionForm
          slug={slug}
          tenantId={tenant.id}
          existingId={row?.id ?? null}
          initial={initial}
        />
      </EditorialCard>
    </div>
  );
}
