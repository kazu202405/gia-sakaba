// service_role キーで RLS を越える管理用 Supabase クライアント（サーバー専用）。
// 用途例：会員「過去の勉強会」ページで private バケットの資料ファイルの署名URLを発行する。
// ※ 絶対にクライアントコンポーネントから import しないこと（service_role キーが漏れる）。

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service role が未設定（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）。",
    );
  }
  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
