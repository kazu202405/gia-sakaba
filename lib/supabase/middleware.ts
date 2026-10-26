// middleware 用ヘルパー。
// 役割：
//   1. 全リクエストで session を refresh（cookie の有効期限を伸ばす）
//   2. /admin/* 配下で未ログインなら /admin/login にリダイレクト
//   3. /guild/* 配下で未ログインなら /guild/login にリダイレクト（案内ページのある店のホームなど、公開の道は除く）
//
// `@supabase/ssr` 公式の Next.js Server-Side Auth パターンに準拠。
// middleware で cookie を書き換えた場合は必ず supabaseResponse 経由で返す
// （別の NextResponse を作ると cookie が失われる）。

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLiveGuildPath, isLoginPath, isPublicGuildPath } from "@/lib/guild/live-routes";
import { GUILD_ROOT, outsideStorePath } from "@/lib/guild/store-path";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 公式注意：createServerClient と auth.getUser() の間にコードを挟まないこと。
  // session が刷新されないと auth.getUser() が古い user を返す可能性がある。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /admin/login だけは未ログインでも通す
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // 酒場の道の表は lib/guild/live-routes.ts（店の名前を外した形で照合する）。道の組み立ては lib/guild/store-path.ts
  // /guild そのものか /guild/… だけ。startsWith だけだと見本の /guild-look まで巻き込み、手元でも開けなくなる
  const inGuild = pathname === GUILD_ROOT || pathname.startsWith(`${GUILD_ROOT}/`);
  if (inGuild && !isPublicGuildPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = outsideStorePath("login");
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (user && inGuild && !isLoginPath(pathname) && !isLiveGuildPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = GUILD_ROOT;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
