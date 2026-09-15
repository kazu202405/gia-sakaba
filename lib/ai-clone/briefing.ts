import OpenAI from "openai";
import type { CalendarEvent } from "./types";
import { fetchTodayEvents, fetchTomorrowEvents } from "./google";
import { fetchExecutiveContext, fetchMethodologyContext } from "./notion";
import {
  createMeeting,
  fetchMonthlyAggregates,
  fetchNotesForDate,
  fetchMeetingsForDate,
  fetchPipelineAggregates,
  fetchRecentMeetingsForPerson,
  findPersonByEmail,
  searchPeopleByName,
  type PipelineAggregates,
} from "./notion-db";
import { sendEveningBriefing } from "./slack";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export interface EveningBriefingResult {
  date: string; // 今日のJST日付
  generatedAt: string;
  kpi: string; // 経営コンテキストから抜き出したKPIセクション（Slackで毎晩リマインド）
  monthlyAggregates: {
    monthLabel: string; // 例: "2026年5月"
    notesByKind: Record<string, number>;
    notesTotal: number;
    meetings: number;
    peopleTotal: number;
    allTime: { notes: number; meetings: number };
  };
  pipeline: PipelineAggregates;
  pipelineKPI: {
    salonProposal: number;
    salonJoin: number;
    appPitch: number;
    appDeal: number;
  };
  revenueTarget: number; // 月収目標（円）。env REVENUE_TARGET_MONTHLY、未設定なら3,000,000
  todayEvents: CalendarEvent[];
  todayMeetings: { id: string; title: string; nextActions: string }[];
  todayNotes: {
    id: string;
    title: string;
    kind: string;
    content: string;
    importance: string;
  }[];
  tomorrowItems: {
    event: CalendarEvent;
    pastContext: string; // 関連する過去メモを箇条書き
    advice: string; // 明日の各予定への簡潔なアドバイス（経営コンテキスト＋過去履歴ベース）
  }[];
  summary: string;
}

// データ取得＋整形のみ（Slack配信もbackfillも行わない）。
// admin dashboard / 任意の表示用途で使えるように分離。
export async function buildEveningSnapshot(): Promise<{
  result: EveningBriefingResult;
  todayEvents: CalendarEvent[];
  todayDate: string;
  todayMeetings: { id: string; title: string; nextActions: string }[];
}> {
  const todayDate = formatJSTDate(new Date());
  const tomorrowDate = formatJSTDate(addDays(new Date(), 1));

  // 平行取得
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const monthYear = jstNow.getUTCFullYear();
  const monthNum = jstNow.getUTCMonth() + 1;

  const [
    context,
    methodology,
    todayEvents,
    tomorrowEvents,
    todayNotes,
    todayMeetings,
    monthlyRaw,
    pipeline,
  ] = await Promise.all([
    fetchExecutiveContext(),
    fetchMethodologyContext(),
    fetchTodayEvents(),
    fetchTomorrowEvents(),
    fetchNotesForDate(todayDate),
    fetchMeetingsForDate(todayDate),
    fetchMonthlyAggregates(monthYear, monthNum),
    fetchPipelineAggregates(monthYear, monthNum),
  ]);

  const revenueTarget = parseInt(
    process.env.REVENUE_TARGET_MONTHLY || "3000000",
    10
  );

  // ファネル各段の月次KPI（env で上書き可・既定はファネル逆算で月収300万到達ライン）
  const pipelineKPI = {
    salonProposal: parseInt(process.env.KPI_SALON_PROPOSAL || "24", 10),
    salonJoin: parseInt(process.env.KPI_SALON_JOIN || "12", 10),
    appPitch: parseInt(process.env.KPI_APP_PITCH || "6", 10),
    appDeal: parseInt(process.env.KPI_APP_DEAL || "3", 10),
  };

  const monthlyAggregates = {
    monthLabel: `${monthYear}年${monthNum}月`,
    notesByKind: monthlyRaw.notesByKind,
    notesTotal: monthlyRaw.notesTotal,
    meetings: monthlyRaw.meetings,
    peopleTotal: monthlyRaw.peopleTotal,
    allTime: monthlyRaw.allTime,
  };

  // 明日の各予定について、過去文脈とアドバイスを集める（過去文脈→アドバイスの順で連鎖）
  const tomorrowItems = await Promise.all(
    tomorrowEvents.map(async (event) => {
      const pastContext = await collectPastContextForEvent(event);
      const advice = await generateAdviceForEvent(
        event,
        pastContext,
        context,
        methodology
      );
      return { event, pastContext, advice };
    })
  );

  // 今日の予定で「振り返り未記入」と思われるもの
  // = 同日 Meetings のタイトルに含まれない予定。Slack で1件だけ柔らかく問いかけるのに使う。
  const unfilledEvents = pickUnfilledEvents(todayEvents, todayMeetings);

  // KPIセクションを抜き出して、毎日見る部分（メインKPI）だけに絞り込む。
  // Notion Markdown の見出しマーカー（# ## ### ####）は除去してプレーンに整える。
  const fullKpi = extractKpiSection(context);
  const kpi = compactKpi(fullKpi) || fullKpi;

  // AIサマリー
  const summary = await generateEveningSummary(
    {
      todayEvents,
      todayMeetings,
      todayNotes,
      tomorrowItems,
      unfilledEvents,
      context,
      tomorrowDate,
    }
  );

  const result: EveningBriefingResult = {
    date: todayDate,
    generatedAt: new Date().toISOString(),
    kpi,
    monthlyAggregates,
    pipeline,
    pipelineKPI,
    revenueTarget,
    todayEvents,
    todayMeetings,
    todayNotes,
    tomorrowItems,
    summary,
  };

  return { result, todayEvents, todayDate, todayMeetings };
}

// 夜のブリーフィング本体：データ取得 → Slack配信 → 骨組みbackfill
export async function runEveningBriefing(): Promise<{
  result: EveningBriefingResult;
  delivery: { ok: boolean; reason?: string };
}> {
  const { result, todayEvents, todayDate, todayMeetings } =
    await buildEveningSnapshot();

  const delivery = await sendEveningBriefing(result);

  // 今日終わった予定の Meeting 骨組みを Notion に置いておく。
  // 後で Slack で振り返りを話した時に、ここに議事録が追記される設計。
  await backfillMeetingsFromCalendar(todayEvents, todayMeetings, todayDate);

  return { result, delivery };
}

// admin dashboardなど表示用途の入口（Slack送信もbackfillもしない）
export async function getEveningSnapshot(): Promise<EveningBriefingResult> {
  const { result } = await buildEveningSnapshot();
  return result;
}

// カレンダーの予定を Notion Meetings に「未記入の骨組み」として登録する。
// 同日・同タイトルの Meeting が既にあればスキップ（重複実行・手動作成と衝突しない）。
// 参加者は Notion People にメールでヒットしたものだけリンク（新規作成はしない）。
async function backfillMeetingsFromCalendar(
  events: CalendarEvent[],
  existing: { id: string; title: string }[],
  date: string
): Promise<void> {
  if (events.length === 0) return;
  const existingTitles = new Set(existing.map((m) => m.title.trim()));

  for (const event of events) {
    const title = (event.summary || "").trim();
    if (!title) continue;
    if (existingTitles.has(title)) continue;

    const participantIds: string[] = [];
    for (const a of event.attendees || []) {
      if (!a.email) continue;
      const p = await findPersonByEmail(a.email);
      if (p) participantIds.push(p.id);
    }

    await createMeeting({
      title,
      date,
      participantIds,
      agenda: buildShellAgenda(event),
    });
  }
}

// 自動骨組み Meeting の議題欄に入れる文字列を組む。
// Calendar の場所/URL をスナップショットして残す（振り返り時に毎回書かなくて済むように）。
// URL は meetingUrl 優先、なければ description/location から正規表現で拾う（Zoom等）。
function buildShellAgenda(event: CalendarEvent): string {
  const lines: string[] = [];
  if (event.location) lines.push(`場所: ${event.location}`);

  const url =
    event.meetingUrl ||
    (() => {
      const text = `${event.location || ""}\n${event.description || ""}`;
      const m = text.match(/https?:\/\/[^\s<>'"]+/);
      return m ? m[0] : null;
    })();
  if (url) lines.push(`URL: ${url}`);

  lines.push(
    "（カレンダーから自動生成・Slackで振り返りを話すと議事録に追記されます）"
  );
  return lines.join("\n");
}

// 明日の予定の参加者から過去履歴をテキストで集める
async function collectPastContextForEvent(
  event: CalendarEvent
): Promise<string> {
  const peopleByEmail = await Promise.all(
    (event.attendees || []).map((a) => findPersonByEmail(a.email))
  );

  const nameCandidates = extractPersonNames(
    event.summary + " " + (event.description || "")
  );
  const nameResults = await Promise.all(
    nameCandidates.map((n) => searchPeopleByName(n))
  );
  const peopleByName = nameResults
    .filter((arr) => arr.length === 1)
    .map((arr) => ({ id: arr[0].id, name: arr[0].name }));

  const matched = [
    ...peopleByEmail.filter(
      (p): p is { id: string; name: string } => p !== null
    ),
    ...peopleByName,
  ];
  const uniq = new Map(matched.map((p) => [p.id, p]));

  if (uniq.size === 0) return "";

  const all = await Promise.all(
    Array.from(uniq.values()).map(async (person) => {
      const recent = await fetchRecentMeetingsForPerson(person.id, 1);
      if (recent.length === 0) return null;
      const m = recent[0];
      return `${person.name}（前回 ${m.date || "?"}：${m.title}${m.nextActions ? ` / 次: ${m.nextActions}` : ""}）`;
    })
  );

  return all
    .filter((s): s is string => !!s)
    .map((s) => `- ${s}`)
    .join("\n");
}

interface SummaryInputs {
  todayEvents: CalendarEvent[];
  todayMeetings: { title: string; nextActions: string }[];
  todayNotes: { kind: string; content: string }[];
  tomorrowItems: { event: CalendarEvent; pastContext: string }[];
  unfilledEvents: CalendarEvent[];
  context: string;
  tomorrowDate: string;
}

async function generateEveningSummary(inputs: SummaryInputs): Promise<string> {
  const client = getClient();
  if (!client) {
    return `今日の予定 ${inputs.todayEvents.length}件 / 明日 ${inputs.tomorrowItems.length}件。`;
  }

  const todayList =
    inputs.todayEvents.length === 0
      ? "（予定なし）"
      : inputs.todayEvents
          .map((e) => `- ${formatTime(e.start)} ${e.summary}`)
          .join("\n");

  const todayNoteList =
    inputs.todayNotes.length === 0
      ? "（記録なし）"
      : inputs.todayNotes
          .map((n) => `- [${n.kind}] ${n.content.slice(0, 60)}`)
          .join("\n");

  const tomorrowList =
    inputs.tomorrowItems.length === 0
      ? "（予定なし）"
      : inputs.tomorrowItems
          .map((it) => {
            const t = formatTime(it.event.start);
            const past = it.pastContext ? `\n  ${it.pastContext.replace(/\n/g, "\n  ")}` : "";
            return `- ${t} ${it.event.summary}${past}`;
          })
          .join("\n");

  const unfilledList =
    inputs.unfilledEvents.length === 0
      ? "（なし）"
      : inputs.unfilledEvents
          .map((e) => `- ${formatTime(e.start)} ${e.summary}`)
          .join("\n");

  const prompt = `あなたはユーザーの経営判断を補佐するAI Cloneです。
夜の振り返り＋明日の予習として、簡潔なまとめを書いてください。

# 経営コンテキスト
${inputs.context}

# 今日の予定（実施済み）
${todayList}

# 今日のNotes（議事録/振り返り/備考から自動抽出）
${todayNoteList}

# 今日の予定で振り返り未記入のもの
${unfilledList}

# 明日（${inputs.tomorrowDate}）の予定
${tomorrowList}

# 出力ルール
- 250〜350字
- 「今日のキー」を1〜2文 → 「明日の重点」を1〜2文 → 締めの一言
- 経営コンテキストの判断軸（数字より直感、関係性優先、速度優先）を反映
- 「振り返り未記入のもの」が1件以上ある時だけ、締めで1件だけ「〇〇について少し話します？」と柔らかく誘う。複数あっても1件に絞る。なければ誘わない
- 落ち着いた相棒口調、絵文字なし`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
    });
    return res.choices[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("[ai-clone] 夜のサマリー生成失敗:", err);
    return `今日の予定 ${inputs.todayEvents.length}件 / 明日 ${inputs.tomorrowItems.length}件。`;
  }
}

// 明日の予定1件について、経営コンテキスト＋方法論＋過去履歴をもとに簡潔なアドバイスを生成する。
// 出力は2〜3行。スタンス・準備物・狙い・注意点のいずれか。なければ空文字。
async function generateAdviceForEvent(
  event: CalendarEvent,
  pastContext: string,
  execContext: string,
  methodology: string
): Promise<string> {
  const client = getClient();
  if (!client) return "";

  const summary = (event.summary || "").trim();
  if (!summary) return "";

  const time = formatTime(event.start);
  const where = event.location ? `\n場所: ${event.location}` : "";
  const desc = event.description ? `\n説明: ${event.description.slice(0, 400)}` : "";
  const past = pastContext ? `\n\n# 関連する過去履歴\n${pastContext}` : "";
  const methodologyBlock = methodology
    ? `\n\n# 方法論（紹介・営業・関係構築の枠組み）\n${methodology}`
    : "";

  const prompt = `あなたはユーザー本人の経営判断を補佐するAI Cloneです。
明日の予定1件について、ユーザーが当日に役立つアドバイスを2〜3行で書いてください。

# 経営コンテキスト（判断軸・KPI・関係者）
${execContext}${methodologyBlock}

# 明日の予定
時刻: ${time}
タイトル: ${summary}${where}${desc}${past}

# 出力ルール
- 2〜3行・合計100字前後
- 「狙い／スタンス／準備／注意点」のうち、この予定で最も効くものを1〜2点
- 過去履歴があれば必ず踏まえる（前回の話の続きなのか、温度感はどうか、など）
- 方法論が関連する予定（営業・面談・紹介依頼・関係構築）なら、方法論の枠組み（ギャップ／障壁／見せ方／価値／ボトルネック等）を1点だけ反映
- 経営コンテキストの判断軸（数字より直感、関係性優先、既存伸ばす、速度優先）を反映
- 当たり前のことや一般論は書かない。この予定固有の助言だけ
- 落ち着いた相棒口調、絵文字なし、見出しや箇条書き記号なし、本文のみ`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
    });
    return res.choices[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("[ai-clone] 明日のアドバイス生成失敗:", err);
    return "";
  }
}

// KPI セクションを表示用に整える。
// - ページタイトルの「# Executive AI Clone...」行を削除
// - 見出しマーカー（## ### #### ##### ######）を剥がしてプレーンテキストに
// - 特定の見出し（リード指標 / サロン流入 / 転換率）はそのセクション丸ごと非表示
function compactKpi(kpi: string): string {
  if (!kpi) return "";

  const skipHeadingPatterns = /リード指標|サロン流入|転換率/;
  const lines = kpi.split("\n");
  const out: string[] = [];
  let skipUntilLevel: number | null = null;

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)$/);

    // スキップ中なら、同レベル以上の見出しが来るまで読み飛ばす
    if (skipUntilLevel !== null) {
      if (m && m[1].length <= skipUntilLevel) {
        skipUntilLevel = null;
        // この見出しは通常処理に流す（fall through）
      } else {
        continue;
      }
    }

    if (m) {
      const level = m[1].length;
      const title = m[2];

      // ページタイトル（# のみ）は除外
      if (level === 1) continue;

      // 非表示対象の小見出しならセクション丸ごとスキップ
      if (skipHeadingPatterns.test(title)) {
        skipUntilLevel = level;
        continue;
      }

      // 見出しマーカーを剥がしてテキストとして出す
      out.push(title);
      continue;
    }

    out.push(line);
  }

  return out.join("\n").trim();
}

// 経営コンテキスト全文から KPI セクションを抜き出す。
// 探索順:
//  1) ページ単位（先頭の `# タイトル` がキーワードを含む → そのページ全体）
//  2) ページ内見出し（`## XXX` `### XXX` がキーワードを含む → 次の同レベル以上の
//     見出し or ページ区切り `---` までを抜き出し）
//  キーワード: KPI / 目標 / 月収 / 300万 / ゴール / Goal / target
function extractKpiSection(context: string): string {
  if (!context) return "";
  const re = /KPI|目標|月収|300万|ゴール|goal|target/i;

  // 1) ページ単位
  const sections = context.split(/\n+---\n+/);
  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed) continue;
    const firstLine = trimmed.split("\n")[0] || "";
    if (re.test(firstLine)) {
      return trimmed;
    }
  }

  // 2) ページ内見出し
  const lines = context.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,4})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length;
    const title = m[2];
    if (!re.test(title)) continue;

    const out: string[] = [lines[i]];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      const m2 = next.match(/^(#{1,4})\s+/);
      if (m2 && m2[1].length <= level) break;
      if (next.trim() === "---") break;
      out.push(next);
    }
    return out.join("\n").trim();
  }

  return "";
}

// 今日の予定のうち、同日 Meetings のタイトルと一致しないものを返す。
// 完全一致でなく、含む/含まれる関係でも「記入済み」と扱う。
function pickUnfilledEvents(
  events: CalendarEvent[],
  meetings: { title: string }[]
): CalendarEvent[] {
  if (events.length === 0) return [];
  const meetingTitles = meetings
    .map((m) => m.title.trim().toLowerCase())
    .filter((t) => t.length > 0);

  return events.filter((e) => {
    const t = (e.summary || "").trim().toLowerCase();
    if (!t) return false;
    return !meetingTitles.some(
      (mt) => mt.includes(t) || t.includes(mt)
    );
  });
}

function extractPersonNames(text: string): string[] {
  if (!text) return [];
  const matches = text.matchAll(
    /([一-鿿ぁ-んァ-ヶー]{2,5})(さん|氏|様|社長|代表|部長|役員)/g
  );
  const names = new Set<string>();
  for (const m of matches) {
    if (m[1]) names.add(m[1]);
  }
  return Array.from(names).slice(0, 5);
}

function formatJSTDate(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatTime(iso: string): string {
  if (!iso) return "終日";
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
