import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { verifyLineSignature, replyMessage } from "@/lib/ai-clone/line";
import { generateReply } from "@/lib/ai-clone/conversation";
import { resolveTenantByLineUserId } from "@/lib/ai-clone/line-tenant";

// LINE Webhook は1分以内に200を返さないとリトライされる。
// → 即ack + waitUntil で AI 処理を継続させる（Slack 側と同じ構造）。
// reply token は30分有効なので、背景処理後に replyMessage で1回返せば足りる。

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") || "";

  // 1) 署名検証（本番のみ厳密チェック。LINE_CHANNEL_SECRET 未設定時はスキップ）
  if (process.env.LINE_CHANNEL_SECRET) {
    if (!verifyLineSignature(rawBody, signature)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const events: unknown = body?.events;
  if (!Array.isArray(events)) {
    return NextResponse.json({ ok: true });
  }

  // 2) 各イベントを背景処理（waitUntil で並列）
  for (const event of events) {
    waitUntil(
      processLineEvent(event).catch((err) => {
        console.error("[ai-clone line] イベント処理失敗:", err);
      }),
    );
  }

  return NextResponse.json({ ok: true });
}

async function processLineEvent(event: any): Promise<void> {
  // 2-a) 友だち追加：line_user_id を本人に返信して連携手順を案内
  if (event?.type === "follow") {
    const lineUserId: string | undefined = event.source?.userId;
    const replyToken: string | undefined = event.replyToken;
    if (!lineUserId || !replyToken) return;

    await replyMessage(
      replyToken,
      [
        "友だち追加ありがとうございます。AI Clone を利用するには連携設定が必要です。",
        "",
        "▼ あなたの LINE user_id",
        lineUserId,
        "",
        "▼ 連携手順",
        "1. https://gia2018.com/clone/<あなたのテナント slug>/settings を開く",
        "2.「LINE 連携」セクションに上記の user_id を貼り付け",
        "3. 保存後、もう一度メッセージを送ってください",
      ].join("\n"),
    );
    return;
  }

  // 2-b) テキストメッセージ以外は無視（画像/スタンプ/動画は最小実装では非対応）
  if (
    event?.type !== "message" ||
    event?.message?.type !== "text"
  ) {
    return;
  }

  const userText: string = event.message.text || "";
  const lineUserId: string | undefined = event.source?.userId;
  const replyToken: string | undefined = event.replyToken;

  if (!userText.trim() || !lineUserId || !replyToken) return;

  // 3) テナント解決。未連携なら案内メッセージを返して終了
  const resolution = await resolveTenantByLineUserId(lineUserId);
  if (!resolution) {
    await replyMessage(
      replyToken,
      [
        "このLINEアカウントは AI Clone のテナントに連携されていません。",
        "",
        "▼ 連携手順",
        "1. https://gia2018.com/clone/<あなたのテナント slug>/settings を開く",
        `2.「LINE 連携」セクションに以下の LINE user_id を登録：${lineUserId}`,
        "3. 保存後、もう一度メッセージを送ってください",
      ].join("\n"),
    );
    return;
  }

  // 4) AI 応答生成 → reply
  const reply = await generateReply(
    resolution.tenantId,
    userText,
    lineUserId,
    "LINE",
  );
  await replyMessage(replyToken, reply);
}
