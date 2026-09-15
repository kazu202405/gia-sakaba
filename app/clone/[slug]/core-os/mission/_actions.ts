// /clone/[slug]/core-os/mission の Server Actions。01_ミッション理念。
// 1テナント1行運用：既存があれば UPDATE、なければ INSERT。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface MissionInput {
  mission?: string | null;
  values_tags?: string | null; // 自由入力 → text[]
  target_world?: string | null;
  not_doing?: string | null;
  value_to_customer?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const parseTags = (v: string | null | undefined): string[] | null => {
  if (!v) return null;
  const parts = v
    .split(/[,、\/\n\r　]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : null;
};

export async function saveMission(
  slug: string,
  tenantId: string,
  existingId: string | null,
  input: MissionInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const payload = {
    tenant_id: tenantId,
    // ai_clone_mission.name は NOT NULL だが、ミッションは1テナント1行運用で
    // 画面に名称欄を持たないため固定ラベルを入れる（表示には使わない）。
    name: "ミッション理念",
    mission: norm(input.mission),
    values_tags: parseTags(input.values_tags),
    target_world: norm(input.target_world),
    not_doing: norm(input.not_doing),
    value_to_customer: norm(input.value_to_customer),
  };

  if (existingId) {
    const { error } = await supabase
      .from("ai_clone_mission")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .eq("tenant_id", tenantId);
    if (error) {
      return { ok: false, error: `保存に失敗しました：${error.message}` };
    }
  } else {
    const { error } = await supabase.from("ai_clone_mission").insert(payload);
    if (error) {
      return { ok: false, error: `保存に失敗しました：${error.message}` };
    }
  }

  revalidatePath(`/clone/${slug}/core-os/mission`);
  return { ok: true };
}
