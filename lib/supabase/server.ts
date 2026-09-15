// Supabase サーバーサイド用クライアント。
// Server Component / Route Handler / Server Action から
// `const supabase = await createClient()` で利用する。
//
// Next.js の cookies() は Promise を返すようになったため、関数全体を async にしている。
// setAll 内の try/catch は、Server Component から呼んだ際に cookie を書き込めない
// （middleware だけが書き込み権限を持つ）ケースを握り潰すための公式推奨パターン。

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component から呼ばれた場合は cookie 書き込み不可。
            // middleware で session refresh しているなら無視して問題ない。
          }
        },
      },
    }
  );
}
