// Supabase ブラウザ用クライアント。
// Client Component（"use client"）から `import { createClient } from "@/lib/supabase/client"` で利用する。
// 環境変数：NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// 将来的にサービスロールキーが必要なケース（admin webhook 等）が出ても、
// それはサーバー側専用ファイルに置く。このファイルからは絶対に参照しない。

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
