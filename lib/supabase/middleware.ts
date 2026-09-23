// middleware 用ヘルパー。
// 役割：
//   1. 全リクエストで session を refresh（cookie の有効期限を伸ばす）
//   2. /admin/* 配下で未ログインなら /admin/login にリダイレクト
//   3. /guild/* 配下で未ログインなら /guild/login にリダイレクト
//
// `@supabase/ssr` 公式の Next.js Server-Side Auth パターンに準拠。
// middleware で cookie を書き換えた場合は必ず supabaseResponse 経由で返す
// （別の NextResponse を作ると cookie が失われる）。

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const isLiveGuildRoute =
    pathname === "/guild" ||
    pathname === "/guild/members" ||
    pathname.startsWith("/guild/members/") ||
    pathname === "/guild/quests" ||
    pathname === "/guild/quests/new" ||
    pathname === "/guild/projects" ||
    pathname === "/guild/projects/new" ||
    pathname === "/guild/me" ||
    pathname === "/guild/me/status" ||
    pathname === "/guild/plan" ||
    pathname === "/guild/requests" ||
    pathname === "/guild/notifications" ||
    pathname === "/guild/join" ||
    pathname === "/guild/master" ||
    pathname === "/guild/master/gathering/new" ||
    /^\/guild\/projects\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\/edit)?$/i.test(pathname) ||
    /^\/guild\/quests\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\/(?:edit|applicants))?$/i.test(
      pathname,
    );

  // /admin/login だけは未ログインでも通す
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const isPublicGuildRoute = pathname === "/guild/login" || pathname === "/guild/join";
  if (pathname.startsWith("/guild") && !isPublicGuildRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/guild/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (
    user &&
    pathname.startsWith("/guild") &&
    pathname !== "/guild/login" &&
    !isLiveGuildRoute
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/guild/members";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
