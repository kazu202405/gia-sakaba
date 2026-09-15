// 右腕AI Web チャットの API route。
// Slack / LINE と同じ generateReply エンジンを channel="Web" で呼ぶ（記録・質問・コマンド・
// 曖昧マッチの往復まで同一挙動）。非 streaming の JSON 往復。
//
// 認可: ログイン済み かつ そのテナントの member であることを確認してから tenantId を engine に渡す。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReply } from "@/lib/ai-clone/conversation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let body: { slug?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim();
  const message = (body.message ?? "").trim();
  if (!slug || !message) {
    return NextResponse.json(
      { error: "slug と message は必須です" },
      { status: 400 },
    );
  }

  // テナント解決＋メンバー確認（RLS により自分が member のテナントのみ取得できる）
  const { data: tenant } = await supabase
    .from("ai_clone_tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) {
    return NextResponse.json({ error: "テナントが見つかりません" }, { status: 404 });
  }
  const { data: member } = await supabase
    .from("ai_clone_tenant_members")
    .select("user_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  try {
    // channel="Web", externalUserId=user.id で Slack/LINE と同じ処理（曖昧確認の往復も成立）
    const reply = await generateReply(tenant.id, message, user.id, "Web");
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[clone/chat] generateReply 失敗:", err);
    return NextResponse.json(
      { error: "応答の生成に失敗しました" },
      { status: 500 },
    );
  }
}
