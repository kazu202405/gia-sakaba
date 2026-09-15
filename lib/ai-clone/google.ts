import { google } from "googleapis";
import type { CalendarEvent, RelatedDoc } from "./types";

// Google API クライアント生成
// Service Account（base64エンコードJSON）優先、なければ OAuth Refresh Token
function getAuthClient() {
  const saB64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  if (saB64) {
    const json = JSON.parse(Buffer.from(saB64, "base64").toString("utf-8"));
    return new google.auth.GoogleAuth({
      credentials: json,
      scopes: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return oauth2;
  }

  return null;
}

// 今日のJST 0:00〜23:59の範囲でカレンダー取得
// calendarIdOverride: tenant 連携で個人の Google Calendar を引く場合に上書き指定。
// 未指定なら env GOOGLE_CALENDAR_ID にフォールバック（既存の単一カレンダー運用）。
export async function fetchTodayEvents(
  calendarIdOverride?: string,
): Promise<CalendarEvent[]> {
  return fetchEventsForDayOffset(0, calendarIdOverride);
}

// 明日のカレンダー取得（夜のブリーフィング用）
export async function fetchTomorrowEvents(
  calendarIdOverride?: string,
): Promise<CalendarEvent[]> {
  return fetchEventsForDayOffset(1, calendarIdOverride);
}

// 任意の日（オフセット）の予定を取得：0=今日 / 1=明日 / -1=昨日
export async function fetchEventsForDayOffset(
  offsetDays: number,
  calendarIdOverride?: string,
): Promise<CalendarEvent[]> {
  const auth = getAuthClient();
  const calendarId = calendarIdOverride || process.env.GOOGLE_CALENDAR_ID;
  if (!auth || !calendarId) {
    // 連携未設定（認証情報なし or カレンダーID未保存）。空イベントと区別できるよう警告。
    console.warn(
      `[ai-clone] カレンダー未連携: auth=${!!auth} calendarId=${calendarId ? "有" : "無"}`,
    );
    return [];
  }

  const calendar = google.calendar({ version: "v3", auth: auth as any });

  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const now = new Date();
  const jstNow = new Date(now.getTime() + jstOffsetMs);
  const jstStart = new Date(
    Date.UTC(
      jstNow.getUTCFullYear(),
      jstNow.getUTCMonth(),
      jstNow.getUTCDate() + offsetDays
    )
  );
  const startUtc = new Date(jstStart.getTime() - jstOffsetMs);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

  let res;
  try {
    res = await calendar.events.list({
      calendarId,
      timeMin: startUtc.toISOString(),
      timeMax: endUtc.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
  } catch (err) {
    // 403/404（カレンダー未共有・ID誤り）等。握りつぶさずログに残し、呼び出し側で
    // 「空」と「取得失敗」を区別できるよう再throwする。
    console.error(
      `[ai-clone] カレンダー取得失敗 calendarId=${calendarId}:`,
      (err as Error)?.message || err,
    );
    throw err;
  }

  const items = res.data.items || [];
  return items.map((e) => ({
    id: e.id || "",
    summary: e.summary || "(タイトルなし)",
    description: e.description || undefined,
    start: e.start?.dateTime || e.start?.date || "",
    end: e.end?.dateTime || e.end?.date || "",
    attendees: (e.attendees || [])
      .filter((a) => a.email)
      .map((a) => ({
        email: a.email!,
        displayName: a.displayName || undefined,
      })),
    location: e.location || undefined,
    meetingUrl: e.hangoutLink || undefined,
  }));
}

// 今から N 日後までの未来予定を一括取得（「次回は？」系の質問に答えるため）
// daysAhead=7 でデフォルト1週間先まで。startTime 昇順で返す。
// calendarIdOverride: tenant 連携で個人の Google Calendar を引く場合に上書き指定。
export async function fetchUpcomingEvents(
  daysAhead: number = 7,
  calendarIdOverride?: string,
): Promise<CalendarEvent[]> {
  const auth = getAuthClient();
  const calendarId = calendarIdOverride || process.env.GOOGLE_CALENDAR_ID;
  if (!auth || !calendarId) {
    console.warn(
      `[ai-clone] カレンダー未連携: auth=${!!auth} calendarId=${calendarId ? "有" : "無"}`,
    );
    return [];
  }

  const calendar = google.calendar({ version: "v3", auth: auth as any });

  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  let res;
  try {
    res = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });
  } catch (err) {
    console.error(
      `[ai-clone] カレンダー取得失敗 calendarId=${calendarId}:`,
      (err as Error)?.message || err,
    );
    throw err;
  }

  const items = res.data.items || [];
  return items.map((e) => ({
    id: e.id || "",
    summary: e.summary || "(タイトルなし)",
    description: e.description || undefined,
    start: e.start?.dateTime || e.start?.date || "",
    end: e.end?.dateTime || e.end?.date || "",
    attendees: (e.attendees || [])
      .filter((a) => a.email)
      .map((a) => ({
        email: a.email!,
        displayName: a.displayName || undefined,
      })),
    location: e.location || undefined,
    meetingUrl: e.hangoutLink || undefined,
  }));
}

// イベントのキーワードからGoogle Drive内の関連Docsを検索
export async function searchRelatedDocs(
  event: CalendarEvent
): Promise<RelatedDoc[]> {
  const auth = getAuthClient();
  if (!auth) return [];

  const drive = google.drive({ version: "v3", auth: auth as any });

  // タイトルから検索キーワードを抽出（記号除去・短すぎる単語除外）
  const keywords = event.summary
    .replace(/[（）()【】\[\]・/／、,，:：]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 3);

  if (keywords.length === 0) return [];

  // Drive APIのfullTextでOR検索
  const query = keywords
    .map((k) => `fullText contains '${k.replace(/'/g, "\\'")}'`)
    .join(" or ");

  try {
    const res = await drive.files.list({
      q: `(${query}) and trashed = false`,
      pageSize: 5,
      orderBy: "modifiedTime desc",
      fields: "files(id, name, webViewLink, modifiedTime, mimeType)",
    });

    const files = res.data.files || [];
    return files.map((f) => ({
      id: f.id || "",
      name: f.name || "(無題)",
      url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
      modifiedAt: f.modifiedTime || "",
      matchedBy: "title" as const,
    }));
  } catch (err) {
    console.error("[ai-clone] Drive検索失敗:", err);
    return [];
  }
}
