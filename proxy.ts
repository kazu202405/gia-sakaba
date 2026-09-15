// プロジェクト全体の proxy（旧 middleware）エントリ。
// Next.js 16 から middleware.ts は deprecated で、proxy.ts が新規約。
//
// 1. 酒場で開いてよい道かを判定する（lib/guild/route-gate.ts）。
//    gia-next のコピーなので、/guild 以外の GIA 本体の画面・API をここで閉じる。
// 2. 通した道だけ、session 更新を lib/supabase/middleware.ts に委譲する。
// matcher：静的アセットや画像最適化エンドポイントは除外して負荷を下げる。

import { guildGate } from "@/lib/guild/route-gate";
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const gate = guildGate(request.nextUrl.pathname, {
    // 見た目の見比べ（/guild-look）は手元の開発中だけ開く
    allowLook: process.env.NODE_ENV !== "production",
  });

  if (gate.kind === "notFound") {
    return new NextResponse("Not Found", { status: 404 });
  }
  if (gate.kind === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = gate.to;
    url.search = "";
    return NextResponse.redirect(url);
  }

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
