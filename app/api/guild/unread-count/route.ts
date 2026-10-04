import { NextResponse } from "next/server";
import { countNavBadges } from "@/lib/guild/nav-badges";
import { listGuildNotifications } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// ホーム画面のアイコンに付ける未読の数。メニューの数字と同じ数え方（countNavBadges の total）を使う。
// アプリを閉じているとき、通知を受け取った service worker（public/guild-sw.js）がここを読んでアイコンの数字を更新する。
// 数えるのは本人の未読だけ。ログインしていなければ数は返さない
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  try {
    const { total } = countNavBadges(await listGuildNotifications());
    return NextResponse.json({ total }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "未読の数を読み込めませんでした。" }, { status: 503 });
  }
}
