import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validPushEndpoint } from "@/lib/guild/push-endpoint";

export const runtime = "nodejs";

async function authorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await authorized();
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const [subscriptions, preferences] = await Promise.all([
    supabase.from("sakaba_push_subscriptions").select("endpoint").eq("user_id", user.id),
    supabase.from("sakaba_push_preferences").select("actions_enabled,deadlines_enabled").eq("user_id", user.id).maybeSingle(),
  ]);
  if (subscriptions.error || preferences.error) return NextResponse.json({ error: "通知設定を読み込めませんでした。" }, { status: 503 });
  return NextResponse.json({
    vapidPublicKey: process.env.PUSH_VAPID_PUBLIC_KEY ?? "",
    endpoints: subscriptions.data?.map((row) => row.endpoint) ?? [],
    preferences: preferences.data ?? { actions_enabled: true, deadlines_enabled: true },
  });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await authorized();
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const payload = await request.json().catch(() => null);
  const subscription = payload?.subscription;
  if (!subscription || !validPushEndpoint(subscription.endpoint) ||
    typeof subscription.keys?.p256dh !== "string" || typeof subscription.keys?.auth !== "string" ||
    JSON.stringify(subscription).length > 5000) {
    return NextResponse.json({ error: "端末情報が正しくありません。" }, { status: 400 });
  }
  const { error } = await supabase.from("sakaba_push_subscriptions").upsert({
    user_id: user.id, endpoint: subscription.endpoint,
    subscription: { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } },
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "端末を登録できませんでした。別のアカウントで使っている場合は通知を解除してください。" }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await authorized();
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (typeof payload?.actions_enabled !== "boolean" || typeof payload?.deadlines_enabled !== "boolean") {
    return NextResponse.json({ error: "設定が正しくありません。" }, { status: 400 });
  }
  const { error } = await supabase.from("sakaba_push_preferences").upsert({
    user_id: user.id, actions_enabled: payload.actions_enabled, deadlines_enabled: payload.deadlines_enabled,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: "設定を保存できませんでした。" }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await authorized();
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (!validPushEndpoint(payload?.endpoint)) return NextResponse.json({ error: "端末情報が正しくありません。" }, { status: 400 });
  const { error } = await supabase.from("sakaba_push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", payload.endpoint);
  if (error) return NextResponse.json({ error: "登録を解除できませんでした。" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
