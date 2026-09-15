// LINE Messaging API クライアントの薄ラッパー。
//
// 役割:
//   * 署名検証（X-Line-Signature ヘッダの HMAC-SHA256 を Channel secret で検証）
//   * replyMessage：reply token を使った1回限りの返信（30分以内に消費）
//   * pushMessage：任意のタイミングで user_id 宛に送信（月間通数制限あり）
//
// Slack 側の lib/ai-clone/slack.ts と対応する責務範囲。
// 朝夜ブリーフィングは現状 Slack のみ。LINE 版が欲しくなったらここに追加する。

import { messagingApi, validateSignature } from "@line/bot-sdk";

// LINE は1メッセージ最大5000文字、1リクエスト最大5メッセージ。
// AI Clone の返信は議事録モードで長くなりがちなので、5000字で分割して最大5つに収める。
const MAX_TEXT_LENGTH = 5000;
const MAX_MESSAGES_PER_REQUEST = 5;

function getClient(): messagingApi.MessagingApiClient | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  return new messagingApi.MessagingApiClient({ channelAccessToken: token });
}

// LINE からのリクエスト署名を検証。
// Channel secret が未設定なら検証スキップ（開発用フォールバック）。
export function verifyLineSignature(rawBody: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) return false;
  if (!signature) return false;
  try {
    return validateSignature(rawBody, channelSecret, signature);
  } catch {
    return false;
  }
}

// 長文を 5000 字 × 最大5メッセージに分割。
// 5メッセージ目に収まらない場合は末尾に「（以下省略）」を付けて切る。
function splitForLine(text: string): string[] {
  const normalized = (text ?? "").trim();
  if (!normalized) return ["（応答なし）"];

  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length > 0 && chunks.length < MAX_MESSAGES_PER_REQUEST) {
    if (remaining.length <= MAX_TEXT_LENGTH) {
      chunks.push(remaining);
      break;
    }
    // 改行で切れる場所を優先（末尾 500 字以内に改行があれば、そこで切る）
    const slice = remaining.slice(0, MAX_TEXT_LENGTH);
    const lastBreak = slice.lastIndexOf("\n");
    const cutAt = lastBreak >= MAX_TEXT_LENGTH - 500 ? lastBreak : MAX_TEXT_LENGTH;
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).replace(/^\s+/, "");
  }

  // 5メッセージで収まらず残りがある場合は最後のメッセージ末尾に省略表示を追加
  if (remaining.length > 0 && chunks.length === MAX_MESSAGES_PER_REQUEST) {
    const last = chunks[chunks.length - 1];
    const suffix = "\n\n（以下省略）";
    if (last.length + suffix.length <= MAX_TEXT_LENGTH) {
      chunks[chunks.length - 1] = last + suffix;
    } else {
      chunks[chunks.length - 1] =
        last.slice(0, MAX_TEXT_LENGTH - suffix.length) + suffix;
    }
  }

  return chunks;
}

// reply token を使って返信。token は1回しか使えないため、複数メッセージは1リクエストにまとめる。
export async function replyMessage(
  replyToken: string,
  text: string,
): Promise<{ ok: boolean; reason?: string }> {
  const client = getClient();
  if (!client) return { ok: false, reason: "LINE_CHANNEL_ACCESS_TOKEN 未設定" };
  if (!replyToken) return { ok: false, reason: "replyToken なし" };

  try {
    const chunks = splitForLine(text);
    await client.replyMessage({
      replyToken,
      messages: chunks.map((c) => ({ type: "text" as const, text: c })),
    });
    return { ok: true };
  } catch (err) {
    console.error("[ai-clone line] reply 失敗:", err);
    return { ok: false, reason: String(err) };
  }
}

// 任意のタイミングで user_id 宛に送信。月間通数制限があるため reply が使えない時のみ使用。
export async function pushMessage(
  userId: string,
  text: string,
): Promise<{ ok: boolean; reason?: string }> {
  const client = getClient();
  if (!client) return { ok: false, reason: "LINE_CHANNEL_ACCESS_TOKEN 未設定" };
  if (!userId) return { ok: false, reason: "userId なし" };

  try {
    const chunks = splitForLine(text);
    await client.pushMessage({
      to: userId,
      messages: chunks.map((c) => ({ type: "text" as const, text: c })),
    });
    return { ok: true };
  } catch (err) {
    console.error("[ai-clone line] push 失敗:", err);
    return { ok: false, reason: String(err) };
  }
}
