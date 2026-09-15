import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { verifySlackSignature, postReply } from "@/lib/ai-clone/slack";
import { generateReply } from "@/lib/ai-clone/conversation";
import { resolveTenantBySlackUserId } from "@/lib/ai-clone/slack-tenant";

// Slackは3秒以内に200を返さないとリトライしてくる
// → 即ack + waitUntilでAI処理を継続させる（Vercel serverless対応）

export async function POST(request: NextRequest) {
  // rawBody（署名検証に必要）
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp") || "";
  const signature = request.headers.get("x-slack-signature") || "";
  const retryNum = request.headers.get("x-slack-retry-num");

  // 1) URL Verification（Event Subscriptions の初回認証）
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // 2) 署名検証（本番のみ厳密チェック。SLACK_SIGNING_SECRET未設定時はスキップ）
  if (process.env.SLACK_SIGNING_SECRET) {
    const ok = verifySlackSignature(rawBody, timestamp, signature);
    if (!ok) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  }

  // 3) リトライは即ackして処理しない（重複応答防止）
  if (retryNum) {
    return NextResponse.json({ ok: true, skipped: "retry" });
  }

  // 4) event_callback だけ処理
  if (body.type !== "event_callback" || !body.event) {
    return NextResponse.json({ ok: true });
  }

  const event = body.event;

  // bot自身のメッセージは無視（ループ防止）
  if (event.bot_id || event.subtype === "bot_message") {
    return NextResponse.json({ ok: true });
  }

  // DM (channel type=im) のメッセージのみ応答
  if (event.type !== "message" || event.channel_type !== "im") {
    return NextResponse.json({ ok: true });
  }

  const userText: string = event.text || "";
  const channel: string = event.channel;
  const slackUserId: string = event.user || "";

  if (!userText.trim() || !channel || !slackUserId) {
    return NextResponse.json({ ok: true });
  }

  // 5) waitUntilでテナント解決+AI処理を継続させながら即200返す
  waitUntil(
    processInBackground(slackUserId, channel, userText).catch((err) => {
      console.error("[ai-clone] background処理失敗:", err);
    }),
  );

  return NextResponse.json({ ok: true });
}

async function processInBackground(
  slackUserId: string,
  channel: string,
  userText: string,
) {
  // Slack user_id → tenant 解決。未連携なら案内メッセージを返して終了
  const resolution = await resolveTenantBySlackUserId(slackUserId);
  if (!resolution) {
    await postReply(
      channel,
      [
        "このSlackアカウントは AI Clone のテナントに連携されていません。",
        "",
        "連携手順：",
        "1. https://gia2018.com/clone/<あなたのテナント slug>/settings を開く",
        `2. 「Slack 連携」セクションに以下の Slack user_id を登録：\`${slackUserId}\``,
        "3. 保存後、もう一度メッセージを送ってください",
      ].join("\n"),
    );
    return;
  }

  const reply = await generateReply(
    resolution.tenantId,
    userText,
    slackUserId,
    "Slack",
  );
  await postReply(channel, reply);
}
