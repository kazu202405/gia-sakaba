import { WebClient } from "@slack/web-api";
import crypto from "crypto";
import type { BriefingResult } from "./types";
import type { EveningBriefingResult } from "./briefing";

function getClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new WebClient(token);
}

// Slackからのリクエスト署名を検証（タイミング攻撃対策込み）
export function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  // 5分以上古いリクエストは弾く（リプレイ攻撃対策）
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts) || Math.abs(now - ts) > 60 * 5) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(baseString)
      .digest("hex");

  // タイミング攻撃対策の比較
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch {
    return false;
  }
}

// 夜のブリーフィング送信
export async function sendEveningBriefing(
  result: EveningBriefingResult
): Promise<{ ok: boolean; reason?: string }> {
  const client = getClient();
  const userId = process.env.SLACK_CEO_USER_ID;
  if (!client || !userId) {
    return {
      ok: false,
      reason: "SLACK_BOT_TOKEN または SLACK_CEO_USER_ID 未設定",
    };
  }

  const blocks = buildEveningBlocks(result);
  try {
    await client.chat.postMessage({
      channel: userId,
      text: `🌙 今日の振り返りと明日の予習（${result.date}）`,
      blocks,
    });
    return { ok: true };
  } catch (err) {
    console.error("[ai-clone] 夜のブリーフィング送信失敗:", err);
    return { ok: false, reason: String(err) };
  }
}

function buildEveningBlocks(result: EveningBriefingResult) {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🌙 今日の振り返りと明日の予習 ${result.date}`,
      },
    },
  ];

  // KPI を毎晩の冒頭に置く（目標を毎日視界に入れるため）
  if (result.kpi) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🎯 *KPIリマインド*\n${truncateForSection(result.kpi, 1500)}`,
      },
    });
    blocks.push({ type: "divider" });
  }

  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: result.summary || "（要約なし）" },
  });
  blocks.push({ type: "divider" });

  // GIAファネル KPI（営業数字を毎晩リマインド）
  const p = result.pipeline;
  const k = result.pipelineKPI;
  const pct = (cur: number, tgt: number) =>
    tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
  if (p) {
    const pipelineText = [
      `📊 *${p.monthLabel}のファネル*  （月次KPI比）`,
      `サロン提案 ${p.salonProposal.thisMonth} / ${k.salonProposal} (${pct(p.salonProposal.thisMonth, k.salonProposal)}%)　／　サロン参加 ${p.salonJoin.thisMonth} / ${k.salonJoin} (${pct(p.salonJoin.thisMonth, k.salonJoin)}%)`,
      `アプリ商談 ${p.appPitch.thisMonth} / ${k.appPitch} (${pct(p.appPitch.thisMonth, k.appPitch)}%)　／　アプリ受注 ${p.appDeal.thisMonth} / ${k.appDeal} (${pct(p.appDeal.thisMonth, k.appDeal)}%)`,
    ].join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: pipelineText },
    });
  }

  // 月収進捗バー
  if (result.revenueTarget > 0) {
    const pct = Math.min(
      100,
      Math.round((p.monthlyRevenue / result.revenueTarget) * 100)
    );
    const barLen = 20;
    const filled = Math.round((pct / 100) * barLen);
    const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
    const monthlyMan = Math.round(p.monthlyRevenue / 10000);
    const targetMan = Math.round(result.revenueTarget / 10000);
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `💰 *月収進捗*\n今月 ¥${monthlyMan}万 ／ 目標 ¥${targetMan}万　(${pct}%)\n\`${bar}\``,
      },
    });
  }
  blocks.push({ type: "divider" });

  // 今日あったこと
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: "📅 今日の予定" },
  });
  if (result.todayEvents.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "（予定なし）" },
    });
  } else {
    const lines = result.todayEvents
      .map((e) => formatEventLine(e))
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: lines },
    });
  }

  // 今日記録された Notes
  if (result.todayNotes.length > 0) {
    const grouped: Record<string, string[]> = {};
    for (const n of result.todayNotes) {
      const k = n.kind || "Other";
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(n.content.slice(0, 80));
    }
    const noteLines = Object.entries(grouped)
      .map(
        ([kind, items]) =>
          `*${kind}* (${items.length})\n${items.map((i) => `• ${i}`).join("\n")}`
      )
      .join("\n\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `📝 *今日のNotes*\n${noteLines}` },
    });
  }

  blocks.push({ type: "divider" });

  // 明日の予定
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: "🌅 明日の予定" },
  });
  if (result.tomorrowItems.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "（明日の予定なし 🌴）" },
    });
  } else {
    for (const it of result.tomorrowItems) {
      const t = formatTimeJST(it.event.start);
      const venue = formatEventVenue(it.event);
      const text = [
        `*${t}  ${it.event.summary}*`,
        venue,
        it.pastContext ? `${it.pastContext}` : "",
        it.advice ? `💡 ${it.advice}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text },
      });
    }
  }

  return blocks;
}

// 1行サマリー（今日の予定用）。場所・URLがあれば同行に簡潔に追加。
function formatEventLine(e: {
  start: string;
  summary: string;
  location?: string;
  description?: string;
  meetingUrl?: string;
}): string {
  const time = formatTimeJST(e.start);
  const parts = [`• ${time} ${e.summary}`];
  if (e.location) parts.push(`📍${e.location}`);
  const url = pickUrl(e);
  if (url) parts.push(`🔗 ${url}`);
  return parts.join("　");
}

// 複数行の会場/URL表記（明日の予定用）。場所とURLそれぞれ別行で見やすく。
function formatEventVenue(e: {
  location?: string;
  description?: string;
  meetingUrl?: string;
}): string {
  const lines: string[] = [];
  if (e.location) lines.push(`📍 ${e.location}`);
  const url = pickUrl(e);
  if (url) lines.push(`🔗 ${url}`);
  return lines.join("\n");
}

// meetingUrl（Google Meet）優先、なければ description/location からURLを拾う（Zoom等）
function pickUrl(e: {
  location?: string;
  description?: string;
  meetingUrl?: string;
}): string | null {
  if (e.meetingUrl) return e.meetingUrl;
  const text = `${e.location || ""}\n${e.description || ""}`;
  const m = text.match(/https?:\/\/[^\s<>'"]+/);
  return m ? m[0] : null;
}

function truncateForSection(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function formatTimeJST(iso: string): string {
  if (!iso) return "終日";
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Markdown を Slack の mrkdwn に寄せる。
// Slack は **太字** を解釈せず記号がそのまま出るため、*太字* に変換する。
// 行頭の見出し（### 等）も太字行に落とす。
function toSlackText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "*$1*") // **bold** → *bold*
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*"); // ### 見出し → *見出し*
}

// 任意のチャンネル/ユーザーへ返信（DMでもパブリックでも可）
export async function postReply(
  channel: string,
  text: string
): Promise<{ ok: boolean; reason?: string }> {
  const client = getClient();
  if (!client) return { ok: false, reason: "SLACK_BOT_TOKEN 未設定" };

  try {
    await client.chat.postMessage({ channel, text: toSlackText(text), mrkdwn: true });
    return { ok: true };
  } catch (err) {
    console.error("[ai-clone] Slack返信失敗:", err);
    return { ok: false, reason: String(err) };
  }
}

// Slack DMにブリーフィングを送信
export async function sendBriefing(result: BriefingResult): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const client = getClient();
  const userId = process.env.SLACK_CEO_USER_ID;
  if (!client || !userId) {
    return { ok: false, reason: "SLACK_BOT_TOKEN または SLACK_CEO_USER_ID 未設定" };
  }

  const blocks = buildBlocks(result);

  try {
    await client.chat.postMessage({
      channel: userId, // user IDを渡すとSlackが自動でDMチャンネルに送ってくれる
      text: `🌅 朝のブリーフィング（${result.date}）`,
      blocks,
    });
    return { ok: true };
  } catch (err) {
    console.error("[ai-clone] Slack送信失敗:", err);
    return { ok: false, reason: String(err) };
  }
}

// Slack Block Kit でリッチに表示
function buildBlocks(result: BriefingResult) {
  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `🌅 朝のブリーフィング ${result.date}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: result.summary || "（要約なし）" },
    },
    { type: "divider" },
  ];

  if (result.items.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "今日は予定がありません 🌴" },
    });
    return blocks;
  }

  for (const item of result.items) {
    const time = formatTime(item.event.start);
    const statusIcon =
      item.status === "ready" ? "✅" : item.status === "missing" ? "⚠️" : "🟡";
    const docList =
      item.relatedDocs.length > 0
        ? item.relatedDocs
            .map((d) => `• <${d.url}|${d.name}>`)
            .join("\n")
        : "（関連資料なし）";

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `${statusIcon} *${time}  ${item.event.summary}*`,
          item.reason ? `_${item.reason}_` : "",
          `${docList}`,
          item.recommendedAction ? `→ ${item.recommendedAction}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });
  }

  return blocks;
}

function formatTime(iso: string): string {
  if (!iso) return "終日";
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
