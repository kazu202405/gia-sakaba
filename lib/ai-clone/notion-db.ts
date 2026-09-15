import { Client } from "@notionhq/client";

function getClient(): Client | null {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  return new Client({ auth: token });
}

// Notion v5 API: databases.query は廃止、dataSources.query になった
// database_id → primary data_source_id を引く（モジュール内でキャッシュ）
const dataSourceCache = new Map<string, string>();

async function getDataSourceId(
  client: Client,
  databaseId: string
): Promise<string | null> {
  const cached = dataSourceCache.get(databaseId);
  if (cached) return cached;

  try {
    const db: any = await client.databases.retrieve({
      database_id: databaseId,
    });
    const id = db.data_sources?.[0]?.id || null;
    if (id) dataSourceCache.set(databaseId, id);
    return id;
  } catch (err) {
    console.error("[ai-clone] data_source_id取得失敗:", err);
    return null;
  }
}

// 名前から People を検索（部分一致、全件返す）
export async function searchPeopleByName(
  name: string
): Promise<Array<{ id: string; name: string; companyHint: string }>> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return [];

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return [];

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "名前",
        title: { contains: name },
      },
      page_size: 10,
    });

    return await Promise.all(
      res.results.map(async (page: any) => {
        const titleProp = page.properties?.["名前"];
        const personName =
          titleProp?.title?.map((t: any) => t.plain_text).join("") || name;

        // 会社名を識別ヒントとして取得（リレーション先のタイトル）
        let companyHint = "";
        const companyProp = page.properties?.["会社"];
        if (companyProp?.relation && companyProp.relation.length > 0) {
          try {
            const companyPage: any = await client.pages.retrieve({
              page_id: companyProp.relation[0].id,
            });
            const cTitle = companyPage.properties?.["会社名"];
            companyHint =
              cTitle?.title?.map((t: any) => t.plain_text).join("") || "";
          } catch {
            // 取得失敗時はヒント省略
          }
        }
        // 役職もヒントに使う
        if (!companyHint) {
          const roleProp = page.properties?.["役職"];
          companyHint =
            roleProp?.rich_text?.map((t: any) => t.plain_text).join("") || "";
        }

        return { id: page.id, name: personName, companyHint };
      })
    );
  } catch (err) {
    console.error("[ai-clone] People検索失敗:", err);
    return [];
  }
}

// 後方互換：先頭1件を返す（briefingの過去履歴取得などで「曖昧時はスキップ」する用途では searchPeopleByName を直接使う）
export async function findPersonByName(name: string): Promise<{
  id: string;
  name: string;
} | null> {
  const all = await searchPeopleByName(name);
  if (all.length === 0) return null;
  const first = all[0];
  return { id: first.id, name: first.name };
}

// People新規作成（名前のみ最低限）
export async function createPerson(name: string): Promise<{
  id: string;
  name: string;
} | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return null;

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties: {
        名前: { title: [{ text: { content: name } }] },
      },
    });
    return { id: res.id, name };
  } catch (err) {
    console.error("[ai-clone] People作成失敗:", err);
    return null;
  }
}

// People を詳細情報付きで作成（名刺取り込み用）
export async function createPersonDetailed(params: {
  name: string;
  companyId?: string;
  role?: string;
  email?: string;
  phone?: string;
  ocrText?: string;
}): Promise<{ id: string; name: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return null;

  const properties: any = {
    名前: { title: [{ text: { content: params.name } }] },
  };
  if (params.companyId) {
    properties["会社"] = { relation: [{ id: params.companyId }] };
  }
  if (params.role) {
    properties["役職"] = { rich_text: [{ text: { content: params.role } }] };
  }
  if (params.email) {
    properties["メール"] = { email: params.email };
  }
  if (params.phone) {
    properties["電話"] = { phone_number: params.phone };
  }
  if (params.ocrText) {
    properties["名刺OCR"] = {
      rich_text: chunkText(params.ocrText, 1900).map((c) => ({
        text: { content: c },
      })),
    };
  }

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    return { id: res.id, name: params.name };
  } catch (err) {
    console.error("[ai-clone] People詳細作成失敗:", err);
    return null;
  }
}

// メールアドレスで People を検索
export async function findPersonByEmail(
  email: string
): Promise<{ id: string; name: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return null;

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return null;

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "メール",
        email: { equals: email },
      },
      page_size: 1,
    });

    const page: any = res.results[0];
    if (!page) return null;

    const titleProp = page.properties?.["名前"];
    const personName =
      titleProp?.title?.map((t: any) => t.plain_text).join("") || email;

    return { id: page.id, name: personName };
  } catch (err) {
    console.error("[ai-clone] PeopleEmail検索失敗:", err);
    return null;
  }
}

// 会社名で Companies を検索
export async function findCompanyByName(
  name: string
): Promise<{ id: string; name: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_COMPANIES;
  if (!client || !dbId) return null;

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return null;

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "会社名",
        title: { contains: name },
      },
      page_size: 1,
    });

    const page: any = res.results[0];
    if (!page) return null;

    const titleProp = page.properties?.["会社名"];
    const companyName =
      titleProp?.title?.map((t: any) => t.plain_text).join("") || name;

    return { id: page.id, name: companyName };
  } catch (err) {
    console.error("[ai-clone] Company検索失敗:", err);
    return null;
  }
}

// Companies 新規作成
export async function createCompany(params: {
  name: string;
  hp?: string;
  industry?: string[];
}): Promise<{ id: string; name: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_COMPANIES;
  if (!client || !dbId) return null;

  const properties: any = {
    会社名: { title: [{ text: { content: params.name } }] },
  };
  if (params.hp) {
    properties["HP"] = { url: params.hp };
  }
  if (params.industry && params.industry.length > 0) {
    properties["業種"] = {
      multi_select: params.industry.map((i) => ({ name: i })),
    };
  }

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    return { id: res.id, name: params.name };
  } catch (err) {
    console.error("[ai-clone] Company作成失敗:", err);
    return null;
  }
}

// Companies find or create
export async function findOrCreateCompany(
  name: string,
  extras?: { hp?: string; industry?: string[] }
): Promise<{ id: string; name: string; created: boolean } | null> {
  const found = await findCompanyByName(name);
  if (found) return { ...found, created: false };
  const created = await createCompany({ name, ...extras });
  if (!created) return null;
  return { ...created, created: true };
}

// People を解決（議事録参加者の自動紐付けに使う）
// - 0件 → 新規作成して single
// - 1件 → そのIDで single
// - 2件以上 → ambiguous（呼び出し側がユーザーに警告して中断）
export type PersonResolution =
  | { state: "single"; id: string; name: string; created: boolean }
  | {
      state: "ambiguous";
      query: string;
      candidates: { id: string; name: string; companyHint: string }[];
    };

export async function resolvePerson(
  name: string
): Promise<PersonResolution | null> {
  const matches = await searchPeopleByName(name);

  if (matches.length === 0) {
    const created = await createPerson(name);
    if (!created) return null;
    return { state: "single", id: created.id, name: created.name, created: true };
  }

  if (matches.length === 1) {
    return {
      state: "single",
      id: matches[0].id,
      name: matches[0].name,
      created: false,
    };
  }

  return { state: "ambiguous", query: name, candidates: matches };
}

// 旧API（互換のため残すが、議事録モードでは resolvePerson を使う）
export async function findOrCreatePerson(
  name: string
): Promise<{ id: string; name: string; created: boolean } | null> {
  const r = await resolvePerson(name);
  if (!r) return null;
  if (r.state === "ambiguous") return null; // 曖昧時は呼び出し側で対応すべき
  return { id: r.id, name: r.name, created: r.created };
}

// Meetings 新規作成
export async function createMeeting(params: {
  title: string;
  date?: string; // YYYY-MM-DD
  participantIds: string[]; // People IDs
  agenda?: string;
  minutes?: string; // 議事録本文
  nextActions?: string;
  rating?: "S" | "A" | "B" | "C";
}): Promise<{ id: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_MEETINGS;
  if (!client || !dbId) return null;

  const properties: any = {
    タイトル: { title: [{ text: { content: params.title } }] },
  };

  if (params.date) {
    properties["日時"] = { date: { start: params.date } };
  }
  if (params.participantIds.length > 0) {
    properties["参加者"] = {
      relation: params.participantIds.map((id) => ({ id })),
    };
  }
  if (params.agenda) {
    properties["議題"] = { rich_text: [{ text: { content: params.agenda } }] };
  }
  if (params.minutes) {
    // Notion rich_text は2000字制限があるので分割
    properties["議事録"] = {
      rich_text: chunkText(params.minutes, 1900).map((c) => ({
        text: { content: c },
      })),
    };
  }
  if (params.nextActions) {
    properties["ネクストアクション"] = {
      rich_text: [{ text: { content: params.nextActions } }],
    };
  }
  if (params.rating) {
    properties["評価"] = { select: { name: params.rating } };
  }

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    return { id: res.id };
  } catch (err) {
    console.error("[ai-clone] Meeting作成失敗:", err);
    return null;
  }
}

// 同じ日の Meetings から、タイトルが近いものを1件返す。
// 完全一致 > 部分一致（含む or 含まれる、どちらかが3文字以上）の順で選ぶ。
// briefing がカレンダー由来で作った骨組みに、後日の議事録を追記するのに使う。
export async function findMeetingByApproxTitleAndDate(
  title: string,
  date: string
): Promise<{ id: string; title: string } | null> {
  const meetings = await fetchMeetingsForDate(date);
  if (meetings.length === 0) return null;
  const target = title.trim().toLowerCase();
  if (!target) return null;

  const exact = meetings.find(
    (m) => m.title.trim().toLowerCase() === target
  );
  if (exact) return { id: exact.id, title: exact.title };

  if (target.length >= 3) {
    const partial = meetings.find((m) => {
      const t = m.title.trim().toLowerCase();
      if (t.length < 3) return false;
      return t.includes(target) || target.includes(t);
    });
    if (partial) return { id: partial.id, title: partial.title };
  }
  return null;
}

// 既存 Meeting に議事録・議題・ネクストアクション・参加者を追記する。
// - 参加者は既存 relation と union（重複なし）
// - 議題は、既存議題の「場所:」「URL:」行を保護してから新しい議題を末尾に追記
//   （カレンダー由来の骨組みに保存されたスナップショットが消えないように）
export async function appendMeetingMinutes(
  meetingId: string,
  params: {
    agenda?: string;
    minutes?: string;
    nextActions?: string;
    addParticipantIds?: string[];
  }
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const properties: any = {};

  // 議題or参加者の更新がある時だけ既存ページを引く
  const needsFetch =
    params.agenda !== undefined ||
    (params.addParticipantIds && params.addParticipantIds.length > 0);
  let existingPage: any = null;
  if (needsFetch) {
    try {
      existingPage = await client.pages.retrieve({ page_id: meetingId });
    } catch {
      // 取得失敗時は既存値の保護なしで進める
    }
  }

  if (params.agenda !== undefined) {
    let preservedHeader = "";
    if (existingPage) {
      const existing = extractText(
        existingPage.properties?.["議題"]?.rich_text || []
      );
      const venueLines = existing
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^(場所|URL)\s*[:：]/i.test(l));
      if (venueLines.length > 0) {
        preservedHeader = venueLines.join("\n") + "\n\n";
      }
    }
    const finalAgenda = preservedHeader + params.agenda;
    properties["議題"] = {
      rich_text: chunkText(finalAgenda, 1900).map((c) => ({
        text: { content: c },
      })),
    };
  }

  if (params.minutes !== undefined) {
    properties["議事録"] = {
      rich_text: chunkText(params.minutes, 1900).map((c) => ({
        text: { content: c },
      })),
    };
  }
  if (params.nextActions !== undefined) {
    properties["ネクストアクション"] = {
      rich_text: [{ text: { content: params.nextActions } }],
    };
  }

  if (params.addParticipantIds && params.addParticipantIds.length > 0) {
    let unioned = params.addParticipantIds;
    if (existingPage) {
      const existing = (
        existingPage.properties?.["参加者"]?.relation || []
      ).map((r: any) => r.id as string);
      unioned = Array.from(new Set([...existing, ...params.addParticipantIds]));
    }
    properties["参加者"] = {
      relation: unioned.map((id) => ({ id })),
    };
  }

  if (Object.keys(properties).length === 0) return true;

  try {
    await client.pages.update({ page_id: meetingId, properties });
    return true;
  } catch (err) {
    console.error("[ai-clone] Meeting更新失敗:", err);
    return false;
  }
}

// Notes 新規作成（Decision / Hypothesis / Action / Learning / Event）
export async function createNote(params: {
  title: string;
  date?: string;
  kind: "Decision" | "Hypothesis" | "Action" | "Learning" | "Event";
  content: string;
  peopleIds?: string[];
  companyIds?: string[];
  importance?: "S" | "A" | "B" | "C";
}): Promise<{ id: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_NOTES;
  if (!client || !dbId) return null;

  const properties: any = {
    タイトル: { title: [{ text: { content: params.title } }] },
    種別: { select: { name: params.kind } },
    内容: {
      rich_text: chunkText(params.content, 1900).map((c) => ({
        text: { content: c },
      })),
    },
  };

  if (params.date) {
    properties["日付"] = { date: { start: params.date } };
  }
  if (params.peopleIds && params.peopleIds.length > 0) {
    properties["関連人物"] = {
      relation: params.peopleIds.map((id) => ({ id })),
    };
  }
  if (params.companyIds && params.companyIds.length > 0) {
    properties["関連会社"] = {
      relation: params.companyIds.map((id) => ({ id })),
    };
  }
  if (params.importance) {
    properties["重要度"] = { select: { name: params.importance } };
  }

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    return { id: res.id };
  } catch (err) {
    console.error("[ai-clone] Note作成失敗:", err);
    return null;
  }
}

// 指定日に作成された Notes を取得（夜のブリーフィング用）
export async function fetchNotesForDate(date: string): Promise<
  {
    id: string;
    title: string;
    kind: string;
    content: string;
    importance: string;
  }[]
> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_NOTES;
  if (!client || !dbId) return [];

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return [];

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "日付",
        date: { equals: date },
      },
      page_size: 50,
    });

    return res.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractText(props["タイトル"]?.title || []),
        kind: props["種別"]?.select?.name || "",
        content: extractText(props["内容"]?.rich_text || []),
        importance: props["重要度"]?.select?.name || "",
      };
    });
  } catch (err) {
    console.error("[ai-clone] 指定日Notes取得失敗:", err);
    return [];
  }
}

// 指定日に開催した Meetings を取得（夜のブリーフィング用）
export async function fetchMeetingsForDate(date: string): Promise<
  {
    id: string;
    title: string;
    nextActions: string;
  }[]
> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_MEETINGS;
  if (!client || !dbId) return [];

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return [];

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "日時",
        date: { equals: date },
      },
      page_size: 20,
    });

    return res.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractText(props["タイトル"]?.title || []),
        nextActions: extractText(props["ネクストアクション"]?.rich_text || []),
      };
    });
  } catch (err) {
    console.error("[ai-clone] 指定日Meetings取得失敗:", err);
    return [];
  }
}

// People DB のファネル系カラム名を実体から検出する。
// ユーザーが「サロン提案」「サロン提案日」「提案日」のどれで作っても拾えるように。
// 開発中の混乱を避けるためキャッシュなし（Notion DB schema取得は1呼び出しで軽い）。
export async function detectPipelineColumns(
  dbIdParam?: string
): Promise<{
  proposal?: string;
  join?: string;
  pitch?: string;
  deal?: string;
  amount?: string;
  available: string[];
}> {
  const dbId = dbIdParam || process.env.NOTION_DB_PEOPLE;
  if (!dbId) return { available: [] };
  const client = getClient();
  if (!client) return { available: [] };

  try {
    // Notion v5: properties は database でなく data_source に紐づく
    const dsId = await getDataSourceId(client, dbId);
    if (!dsId) {
      console.warn("[ai-clone] People DBの data_source_id 取得失敗");
      return { available: [] };
    }
    const ds: any = await client.dataSources.retrieve({
      data_source_id: dsId,
    });
    const props = ds.properties || {};
    const names = Object.keys(props);

    const find = (patterns: RegExp[], requireType?: string) =>
      names.find((n) => {
        const matched = patterns.some((p) => p.test(n));
        if (!matched) return false;
        if (requireType && props[n]?.type !== requireType) return false;
        return true;
      });

    const result = {
      proposal: find([/サロン.*提案/, /^提案日?$/], "date"),
      join: find([/サロン.*(参加|入会)/, /^(参加|入会)日?$/], "date"),
      pitch: find([/アプリ.*商談/, /^商談日?$/], "date"),
      deal: find([/アプリ.*受注/, /^受注日?$/, /^契約日?$/], "date"),
      amount: find([/受注金額/, /^金額$/, /^売上$/], "number"),
    };

    if (!result.proposal && !result.join && !result.pitch && !result.deal) {
      console.warn(
        "[ai-clone] People DBにファネル系カラムが見つかりません。利用可能なカラム:",
        names.join(", ")
      );
    }

    return { ...result, available: names };
  } catch (err) {
    console.error("[ai-clone] People DBスキーマ取得失敗:", err);
    return { available: [] };
  }
}

// People DB の各人物について、ファネル進捗の date プロパティを総スキャンして集計する。
// カラム名は detectPipelineColumns でゆらぎ吸収して動的解決する。
// 想定: サロン提案日 / サロン参加日 / アプリ商談日 / アプリ受注日 (date) / 受注金額 (number)
// （「日」抜き、「入会日」「契約日」などの別名も自動でマッチ）
export interface PipelineStageCount {
  thisMonth: number;
  allTime: number;
}
export interface PipelineAggregates {
  monthLabel: string;
  salonProposal: PipelineStageCount;
  salonJoin: PipelineStageCount;
  appPitch: PipelineStageCount;
  appDeal: PipelineStageCount;
  monthlyRevenue: number;
  totalRevenue: number;
}

export async function fetchPipelineAggregates(
  year: number,
  month: number
): Promise<PipelineAggregates> {
  const empty: PipelineAggregates = {
    monthLabel: `${year}年${month}月`,
    salonProposal: { thisMonth: 0, allTime: 0 },
    salonJoin: { thisMonth: 0, allTime: 0 },
    appPitch: { thisMonth: 0, allTime: 0 },
    appDeal: { thisMonth: 0, allTime: 0 },
    monthlyRevenue: 0,
    totalRevenue: 0,
  };

  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return empty;
  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return empty;

  // カラム名の実体を解決（ゆらぎ対応）
  const cols = await detectPipelineColumns(dbId);

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const inThisMonth = (iso: string) => iso.startsWith(monthPrefix);

  let cursor: string | undefined;
  try {
    do {
      const res = await client.dataSources.query({
        data_source_id: dsId,
        start_cursor: cursor,
        page_size: 100,
      });
      for (const page of res.results as any[]) {
        const props = page.properties || {};
        const proposalDate = cols.proposal
          ? props[cols.proposal]?.date?.start || ""
          : "";
        const joinDate = cols.join ? props[cols.join]?.date?.start || "" : "";
        const pitchDate = cols.pitch
          ? props[cols.pitch]?.date?.start || ""
          : "";
        const dealDate = cols.deal ? props[cols.deal]?.date?.start || "" : "";
        const dealAmount = cols.amount
          ? props[cols.amount]?.number || 0
          : 0;

        if (proposalDate) {
          empty.salonProposal.allTime++;
          if (inThisMonth(proposalDate)) empty.salonProposal.thisMonth++;
        }
        if (joinDate) {
          empty.salonJoin.allTime++;
          if (inThisMonth(joinDate)) empty.salonJoin.thisMonth++;
        }
        if (pitchDate) {
          empty.appPitch.allTime++;
          if (inThisMonth(pitchDate)) empty.appPitch.thisMonth++;
        }
        if (dealDate) {
          empty.appDeal.allTime++;
          if (inThisMonth(dealDate)) empty.appDeal.thisMonth++;
          empty.totalRevenue += dealAmount;
          if (inThisMonth(dealDate)) empty.monthlyRevenue += dealAmount;
        }
      }
      cursor = res.has_more ? res.next_cursor || undefined : undefined;
    } while (cursor);
  } catch (err) {
    console.error("[ai-clone] Pipeline集計失敗:", err);
  }

  return empty;
}

// People の特定人物のファネル状態を更新する（Slack「山口さんにサロン提案した」対応）。
// 既に値が入っていても上書きする（最新化を優先）。
export async function updatePersonPipeline(
  personId: string,
  params: {
    salonProposalDate?: string; // YYYY-MM-DD
    salonJoinDate?: string;
    appPitchDate?: string;
    appDealDate?: string;
    dealAmount?: number;
  }
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  // 実際のカラム名に書き込む（ゆらぎ吸収）。検出できなかった列は既定名で fallback。
  const cols = await detectPipelineColumns();

  const properties: any = {};
  if (params.salonProposalDate) {
    properties[cols.proposal || "サロン提案日"] = {
      date: { start: params.salonProposalDate },
    };
  }
  if (params.salonJoinDate) {
    properties[cols.join || "サロン参加日"] = {
      date: { start: params.salonJoinDate },
    };
  }
  if (params.appPitchDate) {
    properties[cols.pitch || "アプリ商談日"] = {
      date: { start: params.appPitchDate },
    };
  }
  if (params.appDealDate) {
    properties[cols.deal || "アプリ受注日"] = {
      date: { start: params.appDealDate },
    };
  }
  if (typeof params.dealAmount === "number") {
    properties[cols.amount || "受注金額"] = { number: params.dealAmount };
  }

  if (Object.keys(properties).length === 0) return true;

  try {
    await client.pages.update({ page_id: personId, properties });
    return true;
  } catch (err) {
    console.error("[ai-clone] Pipeline更新失敗:", err);
    return false;
  }
}

// 直近 N日の Notes（種別フィルタ）を新しい順で取得。Admin dashboard用。
// kindsを空配列にすると種別フィルタなしで全Notes。
export async function fetchRecentNotes(
  daysBack: number,
  kinds: string[],
  limit: number
): Promise<
  {
    id: string;
    title: string;
    date: string;
    kind: string;
    content: string;
  }[]
> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_NOTES;
  if (!client || !dbId) return [];
  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return [];

  const today = new Date();
  const start = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const startStr = formatYMD(start);

  const filters: any[] = [
    { property: "日付", date: { on_or_after: startStr } },
  ];
  if (kinds.length > 0) {
    filters.push({
      or: kinds.map((k) => ({
        property: "種別",
        select: { equals: k },
      })),
    });
  }

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: filters.length === 1 ? filters[0] : { and: filters },
      sorts: [{ property: "日付", direction: "descending" }],
      page_size: limit,
    });

    return res.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractText(props["タイトル"]?.title || []),
        date: props["日付"]?.date?.start || "",
        kind: props["種別"]?.select?.name || "",
        content: extractText(props["内容"]?.rich_text || []),
      };
    });
  } catch (err) {
    console.error("[ai-clone] 直近Notes取得失敗:", err);
    return [];
  }
}

// 月次の蓄積カウンタを取得（夜のブリーフィング末尾、Admin dashboardでも使う）
// - notesByKind: 「種別」selectごとの今月のNotes数
// - meetings: 今月の Meetings 件数
// - peopleTotal: People DB の総数
// - allTime: 全期間（年初来でなく蓄積感を出すための数字）
export async function fetchMonthlyAggregates(
  year: number,
  month: number
): Promise<{
  monthRange: { start: string; end: string };
  notesByKind: Record<string, number>;
  notesTotal: number;
  meetings: number;
  peopleTotal: number;
  allTime: { notes: number; meetings: number };
}> {
  const empty = {
    monthRange: { start: "", end: "" },
    notesByKind: {},
    notesTotal: 0,
    meetings: 0,
    peopleTotal: 0,
    allTime: { notes: 0, meetings: 0 },
  };

  const client = getClient();
  if (!client) return empty;

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const notesDbId = process.env.NOTION_DB_NOTES;
  const meetingsDbId = process.env.NOTION_DB_MEETINGS;
  const peopleDbId = process.env.NOTION_DB_PEOPLE;

  const [notesByKind, notesTotal, meetings, peopleTotal, allNotes, allMeetings] =
    await Promise.all([
      countNotesByKind(client, notesDbId, start, end),
      countByDateRange(client, notesDbId, "日付", start, end),
      countByDateRange(client, meetingsDbId, "日時", start, end),
      countAllInDb(client, peopleDbId),
      countAllInDb(client, notesDbId),
      countAllInDb(client, meetingsDbId),
    ]);

  return {
    monthRange: { start, end },
    notesByKind,
    notesTotal,
    meetings,
    peopleTotal,
    allTime: { notes: allNotes, meetings: allMeetings },
  };
}

// Notes を「種別」selectごとに集計
async function countNotesByKind(
  client: Client,
  dbId: string | undefined,
  start: string,
  end: string
): Promise<Record<string, number>> {
  if (!dbId) return {};
  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return {};

  const counts: Record<string, number> = {};
  let cursor: string | undefined;
  try {
    do {
      const res = await client.dataSources.query({
        data_source_id: dsId,
        filter: {
          and: [
            { property: "日付", date: { on_or_after: start } },
            { property: "日付", date: { on_or_before: end } },
          ],
        },
        start_cursor: cursor,
        page_size: 100,
      });
      for (const page of res.results) {
        const kind =
          (page as any).properties?.["種別"]?.select?.name || "Other";
        counts[kind] = (counts[kind] || 0) + 1;
      }
      cursor = res.has_more ? res.next_cursor || undefined : undefined;
    } while (cursor);
  } catch (err) {
    console.error("[ai-clone] Notes種別集計失敗:", err);
  }
  return counts;
}

// 任意のDBで日付プロパティの範囲一致を数える
async function countByDateRange(
  client: Client,
  dbId: string | undefined,
  dateProperty: string,
  start: string,
  end: string
): Promise<number> {
  if (!dbId) return 0;
  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return 0;

  let total = 0;
  let cursor: string | undefined;
  try {
    do {
      const res = await client.dataSources.query({
        data_source_id: dsId,
        filter: {
          and: [
            { property: dateProperty, date: { on_or_after: start } },
            { property: dateProperty, date: { on_or_before: end } },
          ],
        },
        start_cursor: cursor,
        page_size: 100,
      });
      total += res.results.length;
      cursor = res.has_more ? res.next_cursor || undefined : undefined;
    } while (cursor);
  } catch (err) {
    console.error(`[ai-clone] ${dateProperty}集計失敗:`, err);
  }
  return total;
}

// DB全件カウント（フィルタなし）
async function countAllInDb(
  client: Client,
  dbId: string | undefined
): Promise<number> {
  if (!dbId) return 0;
  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return 0;

  let total = 0;
  let cursor: string | undefined;
  try {
    do {
      const res = await client.dataSources.query({
        data_source_id: dsId,
        start_cursor: cursor,
        page_size: 100,
      });
      total += res.results.length;
      cursor = res.has_more ? res.next_cursor || undefined : undefined;
    } while (cursor);
  } catch (err) {
    console.error("[ai-clone] DB全件カウント失敗:", err);
  }
  return total;
}

// 直近のMeetings を取得（朝のブリーフィング強化用）
export async function fetchRecentMeetingsForPerson(
  personId: string,
  limit: number = 3
): Promise<
  {
    id: string;
    title: string;
    date: string;
    minutes: string;
    nextActions: string;
  }[]
> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_MEETINGS;
  if (!client || !dbId) return [];

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return [];

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "参加者",
        relation: { contains: personId },
      },
      sorts: [{ property: "日時", direction: "descending" }],
      page_size: limit,
    });

    return res.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractText(props["タイトル"]?.title || []),
        date: props["日時"]?.date?.start || "",
        minutes: extractText(props["議事録"]?.rich_text || []),
        nextActions: extractText(props["ネクストアクション"]?.rich_text || []),
      };
    });
  } catch (err) {
    console.error("[ai-clone] 過去Meetings取得失敗:", err);
    return [];
  }
}

// 特定人物に紐づく直近のNotesを取得（「〇〇さんの内容欲しい」系の質問に答えるため）
export async function fetchRecentNotesForPerson(
  personId: string,
  limit: number = 10,
): Promise<
  {
    id: string;
    title: string;
    date: string;
    kind: string;
    content: string;
  }[]
> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_NOTES;
  if (!client || !dbId) return [];

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return [];

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "関連人物",
        relation: { contains: personId },
      },
      sorts: [{ property: "日付", direction: "descending" }],
      page_size: limit,
    });

    return res.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractText(props["タイトル"]?.title || []),
        date: props["日付"]?.date?.start || "",
        kind: props["種別"]?.select?.name || "",
        content: extractText(props["内容"]?.rich_text || []),
      };
    });
  } catch (err) {
    console.error("[ai-clone] 人物別Notes取得失敗:", err);
    return [];
  }
}

// ----- ヘルパー -----

function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += max) {
    chunks.push(text.slice(i, i + max));
  }
  return chunks;
}

function extractText(richText: any[]): string {
  return richText.map((r: any) => r.plain_text || "").join("");
}

function formatYMD(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
