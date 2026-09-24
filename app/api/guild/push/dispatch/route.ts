import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { validPushEndpoint } from "@/lib/guild/push-endpoint";

export const runtime = "nodejs";
export const maxDuration = 60;

type Candidate = { event_key: string; user_id: string; category: "actions" | "deadlines"; body: string; href: string; occurred_at: string };
type Device = { id: string; user_id: string; created_at: string; subscription: webPush.PushSubscription };
type Preferences = { user_id: string; actions_enabled: boolean; deadlines_enabled: boolean };

async function dispatch(eventKey?: string) {
  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.PUSH_VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return NextResponse.json({ error: "Web Pushの鍵が未設定です。" }, { status: 503 });
  webPush.setVapidDetails(subject, publicKey, privateKey);

  const db = createAdminClient();
  const { data, error } = await db.rpc("sakaba_push_candidates");
  if (error) {
    console.error("[sakaba.push] candidates", error);
    return NextResponse.json({ error: "通知候補を読み込めませんでした。" }, { status: 503 });
  }
  const candidates = eventKey
    ? ((data ?? []) as Candidate[]).filter((candidate) => candidate.event_key === eventKey)
    : (data ?? []) as Candidate[];
  const userIds = [...new Set(candidates.map((candidate) => candidate.user_id))];
  if (!userIds.length) return NextResponse.json({ candidates: 0, sent: 0 });
  const [devicesResult, preferencesResult] = await Promise.all([
    db.from("sakaba_push_subscriptions").select("id,user_id,created_at,subscription").in("user_id", userIds),
    db.from("sakaba_push_preferences").select("user_id,actions_enabled,deadlines_enabled").in("user_id", userIds),
  ]);
  if (devicesResult.error || preferencesResult.error) {
    console.error("[sakaba.push] recipients", devicesResult.error ?? preferencesResult.error);
    return NextResponse.json({ error: "通知先を読み込めませんでした。" }, { status: 503 });
  }
  const devices = (devicesResult.data ?? []) as Device[];
  const preferences = new Map(((preferencesResult.data ?? []) as Preferences[]).map((item) => [item.user_id, item]));
  const byUser = new Map<string, Device[]>();
  for (const device of devices) byUser.set(device.user_id, [...(byUser.get(device.user_id) ?? []), device]);
  let sent = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const preference = preferences.get(candidate.user_id);
    if (candidate.category === "actions" && preference?.actions_enabled === false) continue;
    if (candidate.category === "deadlines" && preference?.deadlines_enabled === false) continue;
    for (const device of byUser.get(candidate.user_id) ?? []) {
      if (candidate.category === "actions" && device.created_at > candidate.occurred_at) continue;
      if (!validPushEndpoint(device.subscription?.endpoint)) {
        failed++;
        console.error("[sakaba.push] invalid endpoint", device.id);
        continue;
      }
      const claim = await db.from("sakaba_push_deliveries").insert({
        subscription_id: device.id, event_key: candidate.event_key,
      });
      if (claim.error?.code === "23505") continue;
      if (claim.error) { failed++; console.error("[sakaba.push] claim", claim.error); continue; }
      try {
        await webPush.sendNotification(device.subscription, JSON.stringify({
          body: candidate.body, href: candidate.href, tag: candidate.event_key,
        }), { TTL: 3600, urgency: candidate.category === "actions" ? "normal" : "low" });
        sent++;
      } catch (sendError) {
        failed++;
        const statusCode = (sendError as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.from("sakaba_push_subscriptions").delete().eq("id", device.id);
        } else {
          await db.from("sakaba_push_deliveries").delete().eq("subscription_id", device.id).eq("event_key", candidate.event_key);
          console.error("[sakaba.push] delivery failed", statusCode ?? sendError);
        }
      }
    }
  }
  return NextResponse.json({ candidates: candidates.length, sent, failed });
}

// Daily fallback and deadline reminders. Vercel supplies CRON_SECRET in Authorization.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "通知の実行キーが未設定です。" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return dispatch();
}

// Database Webhook on sakaba.notifications INSERT. Re-read the event from DB;
// never trust its recipient or text from the HTTP payload.
export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhookの認証キーが未設定です。" }, { status: 503 });
  if (request.headers.get("x-dispatch-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await request.json().catch(() => null);
  const id = payload?.record?.id;
  if (payload?.type !== "INSERT" || payload?.schema !== "sakaba" || payload?.table !== "notifications" ||
    typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Webhookの内容が正しくありません。" }, { status: 400 });
  }
  return dispatch(`notice:${id}`);
}
