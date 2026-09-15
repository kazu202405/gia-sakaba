// 紹介コーチの会話履歴（4,980円以上＝owner テナント）の読み書き。
// 呼び出し側で作った supabase server client（RLS 適用＝本人のテナントのみ）を受け取る。

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CoachHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// 過去の会話を時系列（古い→新しい）で取得。長くなりすぎ防止に上限。
export async function fetchCoachHistory(
  supabase: SupabaseClient,
  tenantId: string,
  limit = 200,
): Promise<CoachHistoryMessage[]> {
  const { data, error } = await supabase
    .from("ai_clone_coach_message")
    .select("role, content")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[coach-history] 取得失敗:", error.message);
    return [];
  }
  return (data ?? []) as CoachHistoryMessage[];
}

// 1往復（user→assistant 等）を保存。
export async function appendCoachMessages(
  supabase: SupabaseClient,
  tenantId: string,
  messages: CoachHistoryMessage[],
): Promise<void> {
  if (messages.length === 0) return;
  const rows = messages.map((m) => ({
    tenant_id: tenantId,
    role: m.role,
    content: m.content,
  }));
  const { error } = await supabase.from("ai_clone_coach_message").insert(rows);
  if (error) console.error("[coach-history] 保存失敗:", error.message);
}

// 履歴を全消去（リセットボタン）。
export async function clearCoachHistory(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("ai_clone_coach_message")
    .delete()
    .eq("tenant_id", tenantId);
  if (error) {
    console.error("[coach-history] 削除失敗:", error.message);
    return false;
  }
  return true;
}
