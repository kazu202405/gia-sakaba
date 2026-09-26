import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function safeNext(value: string | null): string {
  if (value === "/guild/reset-password") return value;
  if (value?.startsWith("/guild/join?") && !value.startsWith("//")) return value;
  return "/guild";
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const code = request.nextUrl.searchParams.get("code");
  const destination = new URL(next, request.url);
  const response = NextResponse.redirect(destination);

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }

  const fallback = new URL(next === "/guild/reset-password" ? "/guild/forgot-password" : "/guild/login", request.url);
  fallback.searchParams.set("auth_error", "1");
  return NextResponse.redirect(fallback);
}
