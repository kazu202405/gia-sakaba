// Slack DM 経由のテナント解決。
//
// 役割:
//   Slack events webhook で受け取った event.user（Slack ユーザーID）を
//   ai_clone_tenant_members.slack_user_id にマッチさせて、
//   対応する tenant_id / Supabase user_id を返す。
//
// 認証:
//   Slack webhook は auth.uid() を持たないため、service_role で RLS を越える。
//   tenant_members は migration 0020 で slack_user_id 列を追加済（UNIQUE）。

import { createClient } from "@supabase/supabase-js";

export interface SlackTenantResolution {
  tenantId: string;
  userId: string;
}

export async function resolveTenantBySlackUserId(
  slackUserId: string,
): Promise<SlackTenantResolution | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "[ai-clone slack] Supabase service role 未設定。NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定してください。",
    );
    return null;
  }

  const sb = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // slack_user_id は UNIQUE 制約あり → 0または1件
  const { data, error } = await sb
    .from("ai_clone_tenant_members")
    .select("tenant_id, user_id")
    .eq("slack_user_id", slackUserId)
    .maybeSingle();

  if (error) {
    console.error("[ai-clone slack] tenant 解決失敗:", error.message);
    return null;
  }
  if (!data) return null;
  return { tenantId: data.tenant_id, userId: data.user_id };
}
