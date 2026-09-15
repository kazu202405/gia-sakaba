// 登録フォーム（未ログイン）から「紹介者を名前で検索」するための公開エンドポイント。
//
// 返すのは登録会員（tier registered/paid）の name / nickname / id のみ。
// 連絡先や詳細プロフィールは返さない。会員本人の確定は別途 set_my_referrer RPC が
// SECURITY DEFINER で行う（このAPIは候補表示のためだけ）。
//
// ※ 名簿の名前が検索で見える点はプロダクト判断として許容（運営合意済み）。
//   濫用抑制のため、2文字以上 / 最大10件 / name・nickname のみ返す。

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, members: [] });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "検索は現在利用できません" },
      { status: 503 },
    );
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // name または nickname に部分一致する登録会員（tentative は除外）。
  const like = `%${q.replace(/[%,()]/g, "")}%`;
  const { data, error } = await sb
    .from("applicants")
    .select("id, name, nickname")
    .in("tier", ["registered", "paid"])
    .or(`name.ilike.${like},nickname.ilike.${like}`)
    .order("name", { ascending: true })
    .limit(10);

  if (error) {
    console.error("[members/referrer-search] 失敗:", error.message);
    return NextResponse.json(
      { ok: false, error: "検索に失敗しました" },
      { status: 500 },
    );
  }

  const members = ((data ?? []) as { id: string; name: string | null; nickname: string | null }[])
    .filter((m) => (m.name ?? "").trim().length > 0)
    .map((m) => ({ id: m.id, name: m.name as string, nickname: m.nickname }));

  return NextResponse.json({ ok: true, members });
}
