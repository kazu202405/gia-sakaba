// middleware 用ヘルパー。
// 役割：
//   1. 全リクエストで session を refresh（cookie の有効期限を伸ばす）
//   2. /admin/* 配下で未ログインなら /admin/login にリダイレクト
//      （/admin/login 自体は除外）
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

  // /admin/login だけは未ログインでも通す
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
