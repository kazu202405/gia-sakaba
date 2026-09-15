// プロジェクト全体の proxy（旧 middleware）エントリ。
// Next.js 16 から middleware.ts は deprecated で、proxy.ts が新規約。
//
// session 更新と admin 配下の認証ガードは lib/supabase/middleware.ts に委譲する。
// matcher：静的アセットや画像最適化エンドポイントは除外して負荷を下げる。
// /admin 配下だけでなく全ページで session refresh しておく方が、
// 将来 /members/app/* でログインユーザー専用機能を入れたときに無改修で済む。

import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下を除く全パスにマッチ：
     * - _next/static       （ビルド済み静的アセット）
     * - _next/image        （画像最適化）
     * - favicon.ico
     * - 各種画像拡張子直リク
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
