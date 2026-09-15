// AI Clone のデータ操作層（Supabase 版）
//
// 役割:
//   conversation.ts が依存していた Notion DB 関数（notion-db.ts）を
//   Supabase に置き換えた新実装。全関数の第1引数に tenantId を取り、
//   テナント境界を where 句で必ず絞り込む。
//
// 認証:
//   Slack webhook 経由で呼ばれる前提のため、auth.uid() は取れない。
//   service_role key で RLS を越え、コード側で tenant_id を必ず付ける運用。
//
// テーブル対応:
//   Person          → ai_clone_person
//   Company         → ai_clone_company
//   ConversationLog → ai_clone_conversation_log + ai_clone_person_conversation_logs
//     （0030 で旧 ai_clone_meeting を統合して一本化）
//   Note            → kind 別に5テーブル振り分け
//     Decision    → ai_clone_decision_log
//     Action      → ai_clone_task
//     Event       → ai_clone_activity_log + ai_clone_person_activity_logs
//     Learning    → ai_clone_knowledge_candidate
//     Hypothesis  → 人物紐付き時 ai_clone_person_note / 独立時 ai_clone_knowledge_candidate
//   Pipeline → ai_clone_person.salon_proposal_date など（0020 で追加）
//   Executive Context → ai_clone_mission / three_year_plan / annual_kpi /
//                       decision_principle / tone_rule / ng_rule / faq

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { WORKSHEETS, type WorksheetData } from "@/lib/coach/worksheet-schema";

// ───────────────────────────────────────────────────────
// service_role クライアント（RLS 越え）
// ───────────────────────────────────────────────────────

function adminSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "[ai-clone] Supabase service role が未設定。NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。",
    );
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ───────────────────────────────────────────────────────
// 共通型
// ───────────────────────────────────────────────────────

export type PersonResolution =
  | { state: "single"; id: string; name: string; created: boolean }
  | {
      state: "ambiguous";
      query: string;
      candidates: { id: string; name: string; companyHint: string }[];
    };

export type NoteKind =
  | "Decision"
  | "Hypothesis"
  | "Action"
  | "Learning"
  | "Event";

// ===========================================================
// Tenant 系（紹介コーチ連携で使用）
// ===========================================================

// ログインユーザー（auth.users.id）が owner の有効テナントを1件返す。
// 4,980円会員は課金時に owner として自テナントが作られる（stripe webhook）。
// 無ければ null（= 990円会員 or 未課金 → コーチは worksheet のみ）。
export async function resolveTenantForOwner(
  userId: string,
): Promise<{ id: string; coachLinkEnabled: boolean } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_tenants")
    .select("id, coach_link_enabled")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[ai-clone] owner テナント解決失敗:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id as string,
    coachLinkEnabled: data.coach_link_enabled !== false,
  };
}

// 紹介コーチ連携トグルの更新。owner 本人のテナントに対してのみ呼ぶ前提。
export async function setCoachLinkEnabled(
  tenantId: string,
  enabled: boolean,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from("ai_clone_tenants")
    .update({ coach_link_enabled: enabled })
    .eq("id", tenantId);

  if (error) {
    console.error("[ai-clone] coach_link_enabled 更新失敗:", error.message);
    return false;
  }
  return true;
}

// ===========================================================
// Person 系
// ===========================================================

// 入力名を正規化（全角/半角スペース除去 + 小文字化）。
// name_normalized カラム（migration 0039）と同じ規則に揃える。
export function normalizePersonName(name: string): string {
  return name.replace(/[\s　]/g, "").toLowerCase();
}

// タスク名マッチ用の正規化。スペース・助詞・記号を落として
// 「MVV整理」⇄「MVVを整理した資料の作成」を吸収する（助詞「を」で部分一致が外れるのを防ぐ）。
export function normalizeTaskName(name: string): string {
  return name
    .replace(/[\s　]/g, "")
    .replace(/[をがはにへともでの、。,.／\/!！？?「」『』（）()【】・~〜:：;；]/g, "")
    .toLowerCase();
}

// クエリを「特徴トークン」に分割する。会話発話（「井上ともよしさんに話した」）から
// 人物名など最も特徴的な塊を取り出し、タスク名との照合に使う。
// まず漢字・カタカナ・英数の連続（＝内容語になりやすく助詞で割れない）を拾い、
// それが無いとき（全ひらがな名など）だけ、空白・助詞・記号で素朴に分割する。
// 敬称「さん」等は内容語と紛らわしいので最後に除外。2文字以上を長い順で返す。
const HONORIFIC_TOKENS = new Set([
  "さん", "さま", "ちゃん", "くん", "氏", "先生", "社長", "部長", "専務", "常務", "会長", "様",
]);
export function tokenizeTaskQuery(query: string): string[] {
  const q = query ?? "";
  // 漢字 / カタカナ / 英数 の連続（2文字以上）
  const runs =
    q.match(/[一-鿿々]{2,}|[ァ-ヺー]{2,}|[A-Za-z0-9]{2,}/g) ?? [];
  let toks = runs.map((s) => stripHonorific(s.trim()));
  if (toks.length === 0) {
    // 全ひらがな等で内容語が拾えないときだけ、助詞・記号で素朴に分割。
    toks = q
      .split(/[\s　をがはにへともでのやかなどばたしてだ、。,.／!！？?「」『』（）()【】・~〜:：;；]+/)
      .map((s) => stripHonorific(s.trim()));
  }
  const out = toks.filter((s) => s.length >= 2 && !HONORIFIC_TOKENS.has(s));
  // 長い順（人物名・固有名が先に来やすい）。重複除去。
  return Array.from(new Set(out)).sort((a, b) => b.length - a.length);
}

// 末尾の敬称を除去（「山崎さん」→「山崎」）。検索クエリ側だけで使う。
// 人物名そのものは敬称を含まない前提なので、末尾一致でのみ落とす。
const HONORIFIC_SUFFIX = /(さん|さま|ちゃん|くん|君|氏|先生|社長|部長|専務|常務|会長|様)$/;
export function stripHonorific(name: string): string {
  let s = name.trim();
  // 二重敬称（稀）にも一応対応してループで剥がす
  let prev: string;
  do {
    prev = s;
    s = s.replace(HONORIFIC_SUFFIX, "").trim();
  } while (s !== prev && s.length > 0);
  // 全部敬称だった等で空になったら元に戻す（誤検索より無害）
  return s.length > 0 ? s : name.trim();
}

// 名前で People を部分一致検索（最大10件）。会社名/役職をヒントに返す。
// マッチングは name_normalized（スペース無視）に対して行うので、
// 「山崎　誠」「山崎 誠」「山崎誠」はすべて同一視される。
// 「山崎さん」のような敬称付きも stripHonorific で吸収する。
export async function searchPeopleByName(
  tenantId: string,
  name: string,
): Promise<Array<{ id: string; name: string; companyHint: string }>> {
  const sb = adminSupabase();
  if (!sb) return [];

  const normalized = normalizePersonName(stripHonorific(name));
  if (normalized.length === 0) return [];

  const { data, error } = await sb
    .from("ai_clone_person")
    .select("id, name, position, company_name, company_id, ai_clone_company(name)")
    .eq("tenant_id", tenantId)
    .ilike("name_normalized", `%${normalized}%`)
    .limit(10);

  if (error) {
    console.error("[ai-clone] People検索失敗:", error.message);
    return [];
  }

  return (data || []).map((row: any) => {
    // 会社名のヒント優先順位: company マスタ → person.company_name (text) → position
    const masterCompany = row.ai_clone_company?.name as string | undefined;
    const hint =
      masterCompany || (row.company_name as string | null) || row.position || "";
    return { id: row.id, name: row.name, companyHint: hint || "" };
  });
}

// 名前のみで People を新規作成（最低限）
export async function createPerson(
  tenantId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_person")
    .insert({ tenant_id: tenantId, name })
    .select("id, name")
    .single();

  if (error) {
    console.error("[ai-clone] People作成失敗:", error.message);
    return null;
  }
  return { id: data.id, name: data.name };
}

// 名刺取り込み用：詳細フィールド付きで People を新規作成
export async function createPersonDetailed(
  tenantId: string,
  params: {
    name: string;
    nameKana?: string;     // よみがな。migration 0049
    companyId?: string;
    role?: string;
    industry?: string;     // 業種（介護 / 飲食 / 医療 等）。migration 0045
    email?: string;
    phone?: string;
    ocrText?: string;
    // 2026-05-31: 名刺＝口語の人物メモ前提に拡張（背景・接点・約束を捨てない）
    metContext?: string;   // 出会った場所・きっかけ（テツジン会 / 勉強会 / ビジマリ 等）
    interests?: string[];  // 関心・嗜好（お酒好き 等）
    caveats?: string;      // 背景・補足メモ（元○○ / ○○ネットワーク 等）
    nextAction?: string;   // 約束・次の接点（天満で飲む 等）
    importance?: "S" | "A" | "B" | "C"; // 「重要度A」等の明示
    birthday?: string;     // 生年月日 YYYY-MM-DD（migration 0027）
    birthplace?: string;   // 出身地・出生地
  },
): Promise<{ id: string; name: string; updated: boolean } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  // 設定する列を組み立て（未指定はそのまま＝更新時に既存値を消さない）
  const fields: Record<string, unknown> = {};
  if (params.nameKana) fields.name_kana = params.nameKana;
  if (params.companyId) fields.company_id = params.companyId;
  if (params.role) fields.position = params.role;
  if (params.industry) fields.industry = params.industry;
  if (params.email) fields.email = params.email;
  if (params.phone) fields.phone = params.phone;
  if (params.ocrText) fields.business_card_ocr = params.ocrText;
  if (params.metContext) fields.met_context = params.metContext;
  if (params.caveats) fields.caveats = params.caveats;
  if (params.nextAction) fields.next_action = params.nextAction;
  if (params.importance) fields.importance = params.importance;
  if (params.birthday) fields.birthday = params.birthday;
  if (params.birthplace) fields.birthplace = params.birthplace;

  // 同名（正規化一致）の既存人物があれば新規作成せず更新する（名刺の再スキャンで
  // 同じ人が何人も登録されるのを防ぐ）。複数あれば直近1件を対象にする。
  const normalized = normalizePersonName(params.name);
  const { data: existing } = await sb
    .from("ai_clone_person")
    .select("id, name, interests")
    .eq("tenant_id", tenantId)
    .eq("name_normalized", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    // interests は既存と union（消さない）
    if (params.interests && params.interests.length > 0) {
      const prev = Array.isArray(existing.interests)
        ? (existing.interests as string[])
        : [];
      fields.interests = Array.from(new Set([...prev, ...params.interests]));
    }
    if (Object.keys(fields).length > 0) {
      const { error: updErr } = await sb
        .from("ai_clone_person")
        .update(fields)
        .eq("id", existing.id);
      if (updErr) {
        console.error("[ai-clone] People詳細更新失敗:", updErr.message);
        return null;
      }
    }
    return { id: existing.id, name: existing.name, updated: true };
  }

  // 新規作成
  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    name: params.name,
    ...fields,
  };
  if (params.interests && params.interests.length > 0)
    row.interests = params.interests;

  const { data, error } = await sb
    .from("ai_clone_person")
    .insert(row)
    .select("id, name")
    .single();

  if (error) {
    console.error("[ai-clone] People詳細作成失敗:", error.message);
    return null;
  }
  return { id: data.id, name: data.name, updated: false };
}

// メールアドレスで People を検索
export async function findPersonByEmail(
  tenantId: string,
  email: string,
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_person")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[ai-clone] PeopleEmail検索失敗:", error.message);
    return null;
  }
  return data ? { id: data.id, name: data.name } : null;
}

// 名前から People を解決:
//   0件 → 新規作成して single
//   1件 → そのIDで single
//   2件以上 → ambiguous（呼び出し側がユーザーに警告して中断）
export async function resolvePerson(
  tenantId: string,
  name: string,
): Promise<PersonResolution | null> {
  const matches = await searchPeopleByName(tenantId, name);

  if (matches.length === 0) {
    const created = await createPerson(tenantId, name);
    if (!created) return null;
    return {
      state: "single",
      id: created.id,
      name: created.name,
      created: true,
    };
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

// ===========================================================
// Company 系（会社マスタ）
// ===========================================================

// 会社名で Company を検索（部分一致、先頭1件）
export async function findCompanyByName(
  tenantId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_company")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${name}%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[ai-clone] Company検索失敗:", error.message);
    return null;
  }
  return data ? { id: data.id, name: data.name } : null;
}

// Company 新規作成
export async function createCompany(
  tenantId: string,
  params: {
    name: string;
    hp?: string;
    industry?: string[];
  },
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    name: params.name,
  };
  if (params.hp) row.hp = params.hp;
  if (params.industry && params.industry.length > 0) row.industry = params.industry;

  const { data, error } = await sb
    .from("ai_clone_company")
    .insert(row)
    .select("id, name")
    .single();

  if (error) {
    console.error("[ai-clone] Company作成失敗:", error.message);
    return null;
  }
  return { id: data.id, name: data.name };
}

// Company find or create
export async function findOrCreateCompany(
  tenantId: string,
  name: string,
  extras?: { hp?: string; industry?: string[] },
): Promise<{ id: string; name: string; created: boolean } | null> {
  const found = await findCompanyByName(tenantId, name);
  if (found) return { ...found, created: false };
  const created = await createCompany(tenantId, { name, ...extras });
  if (!created) return null;
  return { ...created, created: true };
}

// ===========================================================
// ConversationLog 系（会話ログ）
// ===========================================================
// 旧 Meeting 関数群（ai_clone_meeting）は 0030 migration で廃止し、
// 全て ai_clone_conversation_log に統合した。Slack/LINE 経路もここに集約する。
// 関連人物は ai_clone_person_conversation_logs（PK: person_id,conversation_log_id）

// ConversationLog 新規作成。関連人物は多対多リンクで紐付け。
export async function createConversationLog(
  tenantId: string,
  params: {
    summary: string;             // 短い見出し（旧 meeting.title 相当）
    content?: string;            // 本文（議事録の長文もここ）
    occurredAt?: string;         // ISO datetime。省略時は now
    channel?: string;            // Slack / LINE / Email / 対面 / 電話 / その他
    nextAction?: string;
    importance?: "S" | "A" | "B" | "C";
    personIds: string[];         // 関連人物（複数可）
  },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const occurredAt = params.occurredAt
    ? params.occurredAt
    : new Date().toISOString();

  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    occurred_at: occurredAt,
    summary: params.summary,
  };
  if (params.content) row.content = params.content;
  if (params.channel) row.channel = params.channel;
  if (params.nextAction) row.next_action = params.nextAction;
  if (params.importance) row.importance = params.importance;

  const { data, error } = await sb
    .from("ai_clone_conversation_log")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] ConversationLog作成失敗:", error?.message);
    return null;
  }

  // 関連人物リンクを追加（重複時は無視）
  if (params.personIds.length > 0) {
    const links = params.personIds.map((personId) => ({
      conversation_log_id: data.id,
      person_id: personId,
    }));
    const { error: linkErr } = await sb
      .from("ai_clone_person_conversation_logs")
      .upsert(links, {
        onConflict: "person_id,conversation_log_id",
        ignoreDuplicates: true,
      });
    if (linkErr) {
      console.error("[ai-clone] ConversationLog人物リンク失敗:", linkErr.message);
    }
  }

  return { id: data.id };
}

// 直近の会話ログを取得（「さっきの会話ログ」を特定するため）。
export async function findRecentConversationLogs(
  tenantId: string,
  limit: number = 5,
): Promise<Array<{ id: string; summary: string; occurredAt: string }>> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_conversation_log")
    .select("id, summary, occurred_at")
    .eq("tenant_id", tenantId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    summary: r.summary,
    occurredAt: r.occurred_at,
  }));
}

// 「N日以上やりとりしていない人」（ご無沙汰リスト）を RPC ai_clone_silent_people（0059）で引く。
// 最終接触日＝会話ログ occurred_at と活動ログ occurred_date の新しい方（無ければ登録日起点）。
export interface SilentPerson {
  personId: string;
  name: string;
  importance: string | null;
  metContext: string | null;
  nextAction: string | null;
  lastContact: string | null; // null = 接触記録なし（登録のみ）
  days: number;
}
export async function listSilentPeople(
  tenantId: string,
  today: string,
  days = 30,
  limit = 30,
): Promise<SilentPerson[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("ai_clone_silent_people", {
    p_tenant_id: tenantId,
    p_today: today,
    p_days: days,
    p_limit: limit,
  });
  if (error) {
    console.error("[ai-clone] ご無沙汰RPC失敗:", error.message);
    return [];
  }
  return ((data ?? []) as Array<{
    person_id: string;
    name: string;
    importance: string | null;
    met_context: string | null;
    next_action: string | null;
    last_contact: string | null;
    days: number;
  }>).map((r) => ({
    personId: r.person_id,
    name: r.name,
    importance: r.importance,
    metContext: r.met_context,
    nextAction: r.next_action,
    lastContact: r.last_contact,
    days: r.days,
  }));
}

// 「果たせていない約束」＝会話ログの next_action が残っているものを id 付きで引く。
// クローズ（next_action クリア）には id が要るため、searchConversationsForChat（id を返さない）
// とは別に用意。personIds（人物リンク経由）や query（next_action/summary の ilike）で絞れる。
export async function findOpenPromiseLogs(
  tenantId: string,
  opts: {
    personIds?: string[];
    query?: string;
    lookbackDays?: number;
    limit?: number;
  } = {},
): Promise<
  Array<{
    id: string;
    nextAction: string;
    summary: string | null;
    occurredAt: string;
    personNames: string[];
  }>
> {
  const sb = adminSupabase();
  if (!sb) return [];
  const lookbackDays = opts.lookbackDays ?? 60;
  const limit = opts.limit ?? 20;
  const from = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - lookbackDays);
    return d.toISOString().slice(0, 10);
  })();

  // person フィルタ：リンク表経由で対象 conversation_log_id を絞る。
  let idFilter: string[] | null = null;
  if (opts.personIds && opts.personIds.length > 0) {
    const { data: linkRows } = await sb
      .from("ai_clone_person_conversation_logs")
      .select("conversation_log_id")
      .in("person_id", opts.personIds);
    idFilter = (linkRows ?? []).map(
      (r: { conversation_log_id: string }) => r.conversation_log_id,
    );
    if (idFilter.length === 0) return [];
  }

  let q = sb
    .from("ai_clone_conversation_log")
    .select("id, summary, occurred_at, next_action")
    .eq("tenant_id", tenantId)
    .not("next_action", "is", null)
    .neq("next_action", "")
    .gte("occurred_at", `${from}T00:00:00`)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (idFilter !== null) q = q.in("id", idFilter);
  const cleanQ = opts.query?.replace(/[,()]/g, "").trim();
  if (cleanQ) q = q.or(`next_action.ilike.%${cleanQ}%,summary.ilike.%${cleanQ}%`);

  const { data, error } = await q;
  if (error || !data) return [];
  const rows = data as Array<{
    id: string;
    summary: string | null;
    occurred_at: string;
    next_action: string | null;
  }>;

  // 関連人物名を引く。
  const ids = rows.map((r) => r.id);
  const namesById = new Map<string, string[]>();
  if (ids.length > 0) {
    const { data: linkRows } = await sb
      .from("ai_clone_person_conversation_logs")
      .select("conversation_log_id, ai_clone_person(name)")
      .in("conversation_log_id", ids);
    for (const link of (linkRows ?? []) as Array<{
      conversation_log_id: string;
      ai_clone_person: { name: string } | { name: string }[] | null;
    }>) {
      const name = Array.isArray(link.ai_clone_person)
        ? link.ai_clone_person[0]?.name
        : link.ai_clone_person?.name;
      if (!name) continue;
      const arr = namesById.get(link.conversation_log_id) ?? [];
      arr.push(name);
      namesById.set(link.conversation_log_id, arr);
    }
  }

  return rows
    .filter((r) => (r.next_action ?? "").trim())
    .map((r) => ({
      id: r.id,
      nextAction: (r.next_action ?? "").trim(),
      summary: r.summary,
      occurredAt: r.occurred_at,
      personNames: namesById.get(r.id) ?? [],
    }));
}

// 会話ログ本体＋関連人物IDのスナップショット（アンドゥの再作成用）。
export async function getConversationLogSnapshot(
  tenantId: string,
  id: string,
): Promise<{
  summary: string;
  content: string | null;
  occurredAt: string;
  channel: string | null;
  nextAction: string | null;
  importance: "S" | "A" | "B" | "C" | null;
  personIds: string[];
} | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("ai_clone_conversation_log")
    .select("summary, content, occurred_at, channel, next_action, importance")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const { data: links } = await sb
    .from("ai_clone_person_conversation_logs")
    .select("person_id")
    .eq("conversation_log_id", id);
  return {
    summary: data.summary,
    content: data.content ?? null,
    occurredAt: data.occurred_at,
    channel: data.channel ?? null,
    nextAction: data.next_action ?? null,
    importance: data.importance ?? null,
    personIds: (links || []).map((l: any) => l.person_id),
  };
}

// 会話ログのフィールドを部分更新。
export async function updateConversationLogFields(
  tenantId: string,
  id: string,
  patch: {
    summary?: string;
    content?: string;
    occurredAt?: string;
    channel?: string;
    nextAction?: string;
    importance?: "S" | "A" | "B" | "C";
  },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const row: Record<string, unknown> = {};
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.occurredAt !== undefined) row.occurred_at = patch.occurredAt;
  if (patch.channel !== undefined) row.channel = patch.channel;
  if (patch.nextAction !== undefined) row.next_action = patch.nextAction;
  if (patch.importance !== undefined) row.importance = patch.importance;
  if (Object.keys(row).length === 0) return true;
  const { error } = await sb
    .from("ai_clone_conversation_log")
    .update(row)
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] ConversationLog更新失敗:", error.message);
    return false;
  }
  return true;
}

// 会話ログの関連人物を置き換える（「相手は□□さん」修正用）。
export async function setConversationLogPeople(
  id: string,
  personIds: string[],
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  await sb
    .from("ai_clone_person_conversation_logs")
    .delete()
    .eq("conversation_log_id", id);
  if (personIds.length > 0) {
    const links = personIds.map((personId) => ({
      conversation_log_id: id,
      person_id: personId,
    }));
    const { error } = await sb
      .from("ai_clone_person_conversation_logs")
      .upsert(links, {
        onConflict: "person_id,conversation_log_id",
        ignoreDuplicates: true,
      });
    if (error) {
      console.error("[ai-clone] ConversationLog人物置換失敗:", error.message);
      return false;
    }
  }
  return true;
}

// 会話ログを削除（ハード削除＋人物リンクも削除）。アンドゥはスナップショットから再作成する。
export async function deleteConversationLog(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  await sb
    .from("ai_clone_person_conversation_logs")
    .delete()
    .eq("conversation_log_id", id);
  const { error } = await sb
    .from("ai_clone_conversation_log")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] ConversationLog削除失敗:", error.message);
    return false;
  }
  return true;
}

// ===========================================================
// 判断事例（decision_case）— Slack/LINE 自然文から AI 抽出した分。
// 必ず ai_drafted=true / confirmed=false で保存する（ユーザーが Web で confirm）。
// ===========================================================

export async function createDecisionCase(
  tenantId: string,
  params: {
    event: string;                // 必須
    insight?: string;
    action?: string;
    outcome?: string;
    takeaway?: string;
    intent?: string;
    boundary?: string;
    reflection?: string;
    reusable_when?: string;
    emotion?: string;
    captureMode?: "short" | "long";
    occurredAt?: string;          // ISO datetime。省略時 now
  },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const occurredAt = params.occurredAt
    ? params.occurredAt
    : new Date().toISOString();

  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    occurred_at: occurredAt,
    event: params.event,
    capture_mode: params.captureMode ?? "short",
    ai_drafted: true,
    confirmed: false,
  };
  if (params.insight) row.insight = params.insight;
  if (params.action) row.action = params.action;
  if (params.outcome) row.outcome = params.outcome;
  if (params.takeaway) row.takeaway = params.takeaway;
  if (params.intent) row.intent = params.intent;
  if (params.boundary) row.boundary = params.boundary;
  if (params.reflection) row.reflection = params.reflection;
  if (params.reusable_when) row.reusable_when = params.reusable_when;
  if (params.emotion) row.emotion = params.emotion;

  const { data, error } = await sb
    .from("ai_clone_decision_case")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] DecisionCase 作成失敗:", error?.message);
    return null;
  }
  return { id: data.id };
}

// 直近の判断事例を取得（「さっきの判断事例」を特定するため）。
export async function findRecentDecisionCases(
  tenantId: string,
  limit: number = 20,
): Promise<Array<{ id: string; event: string; occurredAt: string }>> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_decision_case")
    .select("id, event, occurred_at")
    .eq("tenant_id", tenantId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    event: r.event,
    occurredAt: r.occurred_at,
  }));
}

// 判断事例のスナップショット（アンドゥの再作成用）。
export async function getDecisionCaseSnapshot(
  tenantId: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("ai_clone_decision_case")
    .select(
      "event, insight, action, outcome, takeaway, intent, boundary, reflection, reusable_when, emotion, occurred_at",
    )
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    event: data.event,
    insight: data.insight ?? undefined,
    action: data.action ?? undefined,
    outcome: data.outcome ?? undefined,
    takeaway: data.takeaway ?? undefined,
    intent: data.intent ?? undefined,
    boundary: data.boundary ?? undefined,
    reflection: data.reflection ?? undefined,
    reusable_when: data.reusable_when ?? undefined,
    emotion: data.emotion ?? undefined,
    occurredAt: data.occurred_at ?? undefined,
  };
}

// 判断事例のフィールドを部分更新（よく使う項目のみ）。
export async function updateDecisionCaseFields(
  tenantId: string,
  id: string,
  patch: {
    event?: string;
    insight?: string;
    action?: string;
    outcome?: string;
    takeaway?: string;
  },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const row: Record<string, unknown> = {};
  if (patch.event !== undefined) row.event = patch.event;
  if (patch.insight !== undefined) row.insight = patch.insight;
  if (patch.action !== undefined) row.action = patch.action;
  if (patch.outcome !== undefined) row.outcome = patch.outcome;
  if (patch.takeaway !== undefined) row.takeaway = patch.takeaway;
  if (Object.keys(row).length === 0) return true;
  const { error } = await sb
    .from("ai_clone_decision_case")
    .update(row)
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] DecisionCase更新失敗:", error.message);
    return false;
  }
  return true;
}

// 判断事例を削除（ハード削除）。アンドゥはスナップショットから再作成。
export async function deleteDecisionCase(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_decision_case")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] DecisionCase削除失敗:", error.message);
    return false;
  }
  return true;
}

// ===========================================================
// 案件（project）/ サービス（service）の自然文操作
// ===========================================================

export const PROJECT_STATUSES = [
  "リード",
  "提案",
  "受注",
  "進行中",
  "完了",
  "失注",
] as const;

// 案件を新規作成。
export async function createProjectRecord(
  tenantId: string,
  params: {
    name: string;
    status?: string;
    dueDate?: string; // YYYY-MM-DD（例: 7/3 のセミナー日）
    peopleIds?: string[]; // 関連する人物（来る人・関係者）を多対多で紐付け
  },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const row: Record<string, unknown> = { tenant_id: tenantId, name: params.name };
  if (params.status) row.status = params.status;
  if (params.dueDate) row.due_date = params.dueDate;
  const { data, error } = await sb
    .from("ai_clone_project")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) {
    console.error("[ai-clone] Project作成失敗:", error?.message);
    return null;
  }

  if (params.peopleIds && params.peopleIds.length > 0) {
    const links = params.peopleIds.map((personId) => ({
      person_id: personId,
      project_id: data.id,
    }));
    const { error: linkErr } = await sb
      .from("ai_clone_person_projects")
      .upsert(links, { onConflict: "person_id,project_id", ignoreDuplicates: true });
    if (linkErr) {
      console.error("[ai-clone] Project人物紐付け失敗:", linkErr.message);
    }
  }

  return { id: data.id };
}

// 既存案件に人物を紐付ける（多対多・重複は無視）。新規案件は作らない。
export async function addPeopleToProject(
  tenantId: string,
  projectId: string,
  personIds: string[],
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb || personIds.length === 0) return false;
  // projectId がこのテナントのものか確認（越境防止）。
  const { data: proj } = await sb
    .from("ai_clone_project")
    .select("id")
    .eq("id", projectId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!proj) return false;
  const links = personIds.map((personId) => ({
    person_id: personId,
    project_id: projectId,
  }));
  const { error } = await sb
    .from("ai_clone_person_projects")
    .upsert(links, { onConflict: "person_id,project_id", ignoreDuplicates: true });
  if (error) {
    console.error("[ai-clone] 案件への人物紐付け失敗:", error.message);
    return false;
  }
  return true;
}

// チャット用：案件一覧を返す（「案件だして」「今の案件は？」用）。
// 名前・ステータスで絞れ、各案件の期限・次アクション・関係者名を束ねて返す。
export async function listProjectsForChat(
  tenantId: string,
  opts: { query?: string; statuses?: string[]; limit?: number } = {},
): Promise<
  Array<{
    name: string;
    status: string | null;
    dueDate: string | null;
    nextAction: string | null;
    peopleNames: string[];
  }>
> {
  const sb = adminSupabase();
  if (!sb) return [];
  const limit = opts.limit ?? 20;
  let q = sb
    .from("ai_clone_project")
    .select("id, name, status, due_date, next_action")
    .eq("tenant_id", tenantId);
  if (opts.statuses && opts.statuses.length > 0) q = q.in("status", opts.statuses);
  const cleanQ = opts.query?.replace(/[,()]/g, "").trim();
  if (cleanQ) q = q.ilike("name", `%${cleanQ}%`);
  // 期限が近い順（期限なしは後ろ）→ 作成新しい順。
  q = q
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await q;
  if (error || !data) {
    console.error("[ai-clone] 案件一覧取得失敗:", error?.message);
    return [];
  }
  const rows = data as Array<{
    id: string;
    name: string;
    status: string | null;
    due_date: string | null;
    next_action: string | null;
  }>;

  // 関係者名を一括取得。
  const ids = rows.map((r) => r.id);
  const namesById = new Map<string, string[]>();
  if (ids.length > 0) {
    const { data: linkRows } = await sb
      .from("ai_clone_person_projects")
      .select("project_id, ai_clone_person(name)")
      .in("project_id", ids);
    for (const link of (linkRows ?? []) as Array<{
      project_id: string;
      ai_clone_person: { name: string } | { name: string }[] | null;
    }>) {
      const name = Array.isArray(link.ai_clone_person)
        ? link.ai_clone_person[0]?.name
        : link.ai_clone_person?.name;
      if (!name) continue;
      const arr = namesById.get(link.project_id) ?? [];
      arr.push(name);
      namesById.set(link.project_id, arr);
    }
  }

  return rows.map((r) => ({
    name: r.name,
    status: r.status,
    dueDate: r.due_date,
    nextAction: r.next_action,
    peopleNames: namesById.get(r.id) ?? [],
  }));
}

// 案件削除の候補を、名前部分一致＋（任意）関係者ヒントで特定する。
// 同名案件（例「紹介セミナー」が複数）を関係者で絞り込めるようにする。
export async function findProjectsForDelete(
  tenantId: string,
  name: string,
  personHint?: string,
): Promise<
  Array<{ id: string; name: string; dueDate: string | null; peopleNames: string[] }>
> {
  const sb = adminSupabase();
  if (!sb) return [];
  const cleanQ = (name ?? "").replace(/[,()]/g, "").trim();
  if (!cleanQ) return [];
  const { data, error } = await sb
    .from("ai_clone_project")
    .select("id, name, due_date")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${cleanQ}%`)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  const rows = data as Array<{ id: string; name: string; due_date: string | null }>;

  // 関係者名を引く。
  const ids = rows.map((r) => r.id);
  const namesById = new Map<string, string[]>();
  if (ids.length > 0) {
    const { data: linkRows } = await sb
      .from("ai_clone_person_projects")
      .select("project_id, ai_clone_person(name)")
      .in("project_id", ids);
    for (const link of (linkRows ?? []) as Array<{
      project_id: string;
      ai_clone_person: { name: string } | { name: string }[] | null;
    }>) {
      const nm = Array.isArray(link.ai_clone_person)
        ? link.ai_clone_person[0]?.name
        : link.ai_clone_person?.name;
      if (!nm) continue;
      const arr = namesById.get(link.project_id) ?? [];
      arr.push(nm);
      namesById.set(link.project_id, arr);
    }
  }

  let out = rows.map((r) => ({
    id: r.id,
    name: r.name,
    dueDate: r.due_date,
    peopleNames: namesById.get(r.id) ?? [],
  }));

  // 関係者ヒントがあれば、その人を含む案件に絞る（同名の絞り込み）。
  const hint = personHint?.trim();
  if (hint) {
    const hn = normalizePersonName(stripHonorific(hint));
    const filtered = out.filter((p) =>
      p.peopleNames.some((n) => normalizePersonName(n).includes(hn)),
    );
    if (filtered.length > 0) out = filtered;
  }
  return out;
}

// 案件を削除する（person_projects は ON DELETE CASCADE で自動削除）。
export async function deleteProjectRecord(
  tenantId: string,
  projectId: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_project")
    .delete()
    .eq("id", projectId)
    .eq("tenant_id", tenantId);
  if (error) {
    console.error("[ai-clone] 案件削除失敗:", error.message);
    return false;
  }
  return true;
}

// 案件を名前部分一致で検索。
export async function searchProjectsByName(
  tenantId: string,
  query: string,
  limit: number = 5,
): Promise<Array<{ id: string; name: string; status: string | null }>> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_project")
    .select("id, name, status")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, name: r.name, status: r.status }));
}

// 案件の名前・ステータスを更新。
export async function updateProjectFields(
  tenantId: string,
  id: string,
  patch: { name?: string; status?: string },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.status !== undefined) row.status = patch.status;
  if (Object.keys(row).length === 0) return true;
  const { error } = await sb
    .from("ai_clone_project")
    .update(row)
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] Project更新失敗:", error.message);
    return false;
  }
  return true;
}

// サービスを新規作成。
export async function createServiceRecord(
  tenantId: string,
  params: { name: string },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("ai_clone_service")
    .insert({ tenant_id: tenantId, name: params.name })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[ai-clone] Service作成失敗:", error?.message);
    return null;
  }
  return { id: data.id };
}

// サービスを名前部分一致で検索。
export async function searchServicesByName(
  tenantId: string,
  query: string,
  limit: number = 5,
): Promise<Array<{ id: string; name: string }>> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_service")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, name: r.name }));
}

// 人物の基本プロフィール（誕生日・会社・重要度など）を1件取得。
// query 経路で「○○さんの誕生日教えて」等に答えるための材料。
export async function fetchPersonProfile(
  tenantId: string,
  personId: string,
): Promise<{
  name: string;
  companyName: string | null;
  position: string | null;
  birthday: string | null;
  birthHour: number | null;
  birthplace: string | null;
  importance: string | null;
  temperature: string | null;
  metContext: string | null;
  nextAction: string | null;
} | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("ai_clone_person")
    .select(
      "name, company_name, position, birthday, birth_hour, birthplace, importance, temperature, met_context, next_action",
    )
    .eq("tenant_id", tenantId)
    .eq("id", personId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    name: data.name,
    companyName: data.company_name ?? null,
    position: data.position ?? null,
    birthday: data.birthday ?? null,
    birthHour: data.birth_hour ?? null,
    birthplace: data.birthplace ?? null,
    importance: data.importance ?? null,
    temperature: data.temperature ?? null,
    metContext: data.met_context ?? null,
    nextAction: data.next_action ?? null,
  };
}

// ===========================================================
// 「会」（コミュニティ：BNI / 守成クラブ / テツジン会 等）と人物紐付け（migration 0058）
// ===========================================================

// 会を取得 or 新規作成（正規化名で重複防止）。
export async function createOrGetCommunity(
  tenantId: string,
  name: string,
  opts?: { kind?: string; note?: string },
): Promise<{ id: string; name: string; created: boolean } | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const normalized = normalizePersonName(trimmed);
  const { data: existing } = await sb
    .from("ai_clone_community")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("name_normalized", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    return { id: existing.id, name: existing.name, created: false };
  }
  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    name: trimmed,
    name_normalized: normalized,
  };
  if (opts?.kind) row.kind = opts.kind;
  if (opts?.note) row.note = opts.note;
  const { data, error } = await sb
    .from("ai_clone_community")
    .insert(row)
    .select("id, name")
    .single();
  if (error || !data) {
    console.error("[ai-clone] 会の作成失敗:", error?.message);
    return null;
  }
  return { id: data.id, name: data.name, created: true };
}

// 会を名前で検索（正規化部分一致）。
export async function findCommunityByName(
  tenantId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const normalized = normalizePersonName(name);
  if (!normalized) return null;
  const { data } = await sb
    .from("ai_clone_community")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .ilike("name_normalized", `%${normalized}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, name: data.name } : null;
}

// 全ての会を返す（カレンダー予定名との突合＝P2 用）。
export async function listCommunities(
  tenantId: string,
): Promise<{ id: string; name: string; nameNormalized: string }[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("ai_clone_community")
    .select("id, name, name_normalized")
    .eq("tenant_id", tenantId)
    .limit(200);
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    nameNormalized: r.name_normalized ?? normalizePersonName(r.name),
  }));
}

// 人物を会に紐付け（重複は無視）。
export async function linkPersonToCommunity(
  personId: string,
  communityId: string,
  note?: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb.from("ai_clone_person_communities").upsert(
    { person_id: personId, community_id: communityId, note: note ?? null },
    { onConflict: "person_id,community_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[ai-clone] 会への紐付け失敗:", error.message);
    return false;
  }
  return true;
}

// 会のメンバー一覧（「BNIの人一覧」照会用）。
export async function listCommunityMembers(
  tenantId: string,
  communityName: string,
): Promise<{
  community: string;
  members: { id: string; name: string; companyName: string | null; importance: string | null }[];
} | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const comm = await findCommunityByName(tenantId, communityName);
  if (!comm) return null;
  const { data } = await sb
    .from("ai_clone_person_communities")
    .select("person:ai_clone_person(id, name, company_name, importance)")
    .eq("community_id", comm.id)
    .limit(200);
  const members = (data || [])
    .map((r: any) => (Array.isArray(r.person) ? r.person[0] : r.person))
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      companyName: p.company_name ?? null,
      importance: p.importance ?? null,
    }));
  return { community: comm.name, members };
}

// met_context（出会った場所）に登録済みの会の名前が含まれていれば自動で紐付ける。
// 「BNIで会った」→ BNI が会として登録済みなら、その人を BNI に紐付け。
export async function autoLinkCommunityByMetContext(
  tenantId: string,
  personId: string,
  metContext: string,
): Promise<string | null> {
  if (!metContext || !metContext.trim()) return null;
  const ctxNorm = normalizePersonName(metContext);
  if (!ctxNorm) return null;
  const communities = await listCommunities(tenantId);
  // 正規化名が出会いテキストに含まれる会を探す（最長一致を優先＝誤マッチ低減）
  const hit = communities
    .filter((c) => c.nameNormalized && ctxNorm.includes(c.nameNormalized))
    .sort((a, b) => b.nameNormalized.length - a.nameNormalized.length)[0];
  if (!hit) return null;
  const ok = await linkPersonToCommunity(personId, hit.id, metContext.trim());
  return ok ? hit.name : null;
}

// 重複検出用：人物の情報量スコア（埋まっている主要列の数）。統合時にどれを残すか決める。
function personInfoScore(r: Record<string, unknown>): number {
  const keys = [
    "company_id",
    "company_name",
    "position",
    "industry",
    "importance",
    "met_context",
    "email",
    "phone",
    "birthday",
    "next_action",
    "caveats",
  ];
  return keys.reduce((acc, k) => {
    const v = r[k];
    return acc + (v != null && String(v).trim().length > 0 ? 1 : 0);
  }, 0);
}

type DupPerson = { id: string; name: string; score: number; createdAt: string };

// 指定名（正規化一致）の重複人物を、情報量スコア降順・古い順で返す（2件以上なら重複）。
export async function findExactNameDuplicates(
  tenantId: string,
  name: string,
): Promise<DupPerson[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const normalized = normalizePersonName(stripHonorific(name));
  if (!normalized) return [];
  const { data, error } = await sb
    .from("ai_clone_person")
    .select(
      "id, name, created_at, company_id, company_name, position, industry, importance, met_context, email, phone, birthday, next_action, caveats",
    )
    .eq("tenant_id", tenantId)
    .eq("name_normalized", normalized);
  if (error || !data) return [];
  return sortDupCandidates(data as Record<string, unknown>[]);
}

// テナント内の「同名（正規化一致）が2件以上」のグループを全部返す。
export async function findAllDuplicateNameGroups(
  tenantId: string,
): Promise<DupPerson[][]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_person")
    .select(
      "id, name, name_normalized, created_at, company_id, company_name, position, industry, importance, met_context, email, phone, birthday, next_action, caveats",
    )
    .eq("tenant_id", tenantId)
    .limit(2000);
  if (error || !data) return [];
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const r of data as Record<string, unknown>[]) {
    const key = String(r.name_normalized ?? "");
    if (!key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  return Array.from(groups.values())
    .filter((arr) => arr.length >= 2)
    .map((arr) => sortDupCandidates(arr));
}

// 情報量スコア降順 → 同点は古い順（created_at 昇順）。先頭が「残す」候補。
function sortDupCandidates(rows: Record<string, unknown>[]): DupPerson[] {
  return rows
    .map((r) => ({
      id: r.id as string,
      name: r.name as string,
      score: personInfoScore(r),
      createdAt: String(r.created_at ?? ""),
    }))
    .sort((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : a.createdAt.localeCompare(b.createdAt),
    );
}

// 統合時のフィールド合成対象（スカラー列）。interests は配列なので別途和集合。
const PERSON_MERGE_SCALARS = [
  "name_kana",
  "company_id",
  "company_name",
  "position",
  "industry",
  "importance",
  "trust_level",
  "temperature",
  "referred_by",
  "referred_by_person_id",
  "caveats",
  "next_action",
  "birthday",
  "birth_hour",
  "birthplace",
  "met_context",
  "avatar_url",
  "email",
  "phone",
] as const;

function rowRecency(r: Record<string, unknown>): number {
  const c = Date.parse(String(r.created_at ?? "")) || 0;
  const u = Date.parse(String(r.updated_at ?? "")) || 0;
  return Math.max(c, u);
}

// 重複統合の前に、残す人物(keepId)のフィールドを「埋まっている値で補完・競合は最新優先」で合成する。
// 各スカラー列：新しい順に見て最初に非空の値を採用（＝空欄は埋め、両方埋まっていれば最新が勝つ）。
// interests：全レコードの和集合。リンク移動・削除は呼び出し側の mergePerson が行う（その前に呼ぶ）。
export async function coalescePersonFields(
  tenantId: string,
  ids: string[],
  keepId: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  if (ids.length < 2) return true;
  const { data, error } = await sb
    .from("ai_clone_person")
    .select(
      `id, created_at, updated_at, interests, ${PERSON_MERGE_SCALARS.join(", ")}`,
    )
    .eq("tenant_id", tenantId)
    .in("id", ids);
  if (error || !data || (data as unknown[]).length === 0) return false;
  // 新しい順（created_at / updated_at の新しい方）
  const rows = [...(data as unknown as Record<string, unknown>[])].sort(
    (a, b) => rowRecency(b) - rowRecency(a),
  );
  const merged: Record<string, unknown> = {};
  for (const f of PERSON_MERGE_SCALARS) {
    for (const r of rows) {
      // 新しい順。最初に見つかった非空の値を採用。
      const v = r[f];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        merged[f] = v;
        break;
      }
    }
  }
  // interests は全レコードの和集合
  const interestsSet = new Set<string>();
  for (const r of rows) {
    const arr = r.interests;
    if (Array.isArray(arr)) {
      for (const x of arr)
        if (typeof x === "string" && x.trim()) interestsSet.add(x);
    }
  }
  if (interestsSet.size > 0) merged.interests = Array.from(interestsSet);

  if (Object.keys(merged).length === 0) return true;
  const { error: updErr } = await sb
    .from("ai_clone_person")
    .update(merged)
    .eq("tenant_id", tenantId)
    .eq("id", keepId);
  if (updErr) {
    console.error("[ai-clone] 統合フィールド合成失敗:", updErr.message);
    return false;
  }
  return true;
}

// 人物を統合する（remove のリンクを keep に寄せて remove を削除）。RPC で1トランザクション。
export async function mergePerson(
  tenantId: string,
  keepId: string,
  removeId: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb.rpc("ai_clone_merge_person", {
    p_tenant: tenantId,
    p_keep: keepId,
    p_remove: removeId,
  });
  if (error) {
    console.error("[ai-clone] 人物統合失敗:", error.message);
    return false;
  }
  return true;
}

// 人物を削除する（リンクも削除）。RPC で1トランザクション。
export async function deletePerson(
  tenantId: string,
  personId: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  // 人物行を直接削除する。全リンク表（_note/_photo/_projects/_conversation_logs/
  // _activity_logs/_expenses/_tasks/_decision_logs/_communities/meeting_persons）は
  // ON DELETE CASCADE、referred_by_person_id と dated_reminder.person_id は
  // ON DELETE SET NULL なので、この1行で全部自動的に片付く。
  // 判断事例の related_person_ids[] は FK ではないので削除をブロックしない（古いidが残るだけ）。
  // ※ 旧実装は RPC ai_clone_delete_person(0057) 依存だったが、本番未適用だと
  //   毎回「削除に失敗」になるため、RPC 非依存の直接削除に変更（cascade に委ねる）。
  const { error } = await sb
    .from("ai_clone_person")
    .delete()
    .eq("id", personId)
    .eq("tenant_id", tenantId);
  if (error) {
    console.error("[ai-clone] 人物削除失敗:", error.message);
    return false;
  }
  return true;
}

// サービス名を更新。
export async function updateServiceName(
  tenantId: string,
  id: string,
  name: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_service")
    .update({ name })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] Service名変更失敗:", error.message);
    return false;
  }
  return true;
}

// ===========================================================
// チャット用の検索ヘルパー群（read-only）。
// AI Clone が「過去データを引っ張りながら応答」するために、
// search_* ツールから呼ばれる。フィルタは Web 側のフィルタバーと同設計：
//   ilike テキスト検索 + multi-value in + 日付範囲 + 重要度等。
// limit はデフォルト 10 件にし、AI が context として処理しやすい量に抑える。
// 戻り値は AI に渡しやすい平たい構造（JSON 化前提）。
// ===========================================================

interface ChatSearchConversationsParams {
  query?: string;             // 要約・本文・次のアクション横断 ilike
  personName?: string;        // 人物名から person_id を解決して関連会話に絞る
  dateFrom?: string;          // YYYY-MM-DD
  dateTo?: string;            // YYYY-MM-DD
  channels?: string[];        // Slack/LINE/Email/対面/電話/その他
  importance?: string[];      // S/A/B/C
  limit?: number;             // 既定 10
}

export interface ChatConversationResult {
  occurred_at: string;
  channel: string | null;
  summary: string | null;
  content_excerpt: string | null;
  importance: string | null;
  next_action: string | null;
  person_names: string[];
}

export async function searchConversationsForChat(
  tenantId: string,
  params: ChatSearchConversationsParams,
): Promise<ChatConversationResult[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const limit = params.limit ?? 10;
  const cleanQ = params.query?.replace(/[,()]/g, "").trim();

  // person フィルタが指定されていれば、まず該当 conversation_log_id を引く
  let conversationIdsFilter: string[] | null = null;
  if (params.personName?.trim()) {
    const rows = await searchPeopleByName(tenantId, params.personName.trim());
    const personIds = rows.map((p) => p.id);
    if (personIds.length === 0) return [];
    const { data: linkRows } = await sb
      .from("ai_clone_person_conversation_logs")
      .select("conversation_log_id")
      .in("person_id", personIds);
    const ids = (linkRows ?? []).map(
      (r: { conversation_log_id: string }) => r.conversation_log_id,
    );
    if (ids.length === 0) return [];
    conversationIdsFilter = ids;
  }

  let q = sb
    .from("ai_clone_conversation_log")
    .select(
      "id, occurred_at, channel, summary, content, importance, next_action",
    )
    .eq("tenant_id", tenantId);

  if (conversationIdsFilter !== null) q = q.in("id", conversationIdsFilter);
  if (params.channels && params.channels.length > 0)
    q = q.in("channel", params.channels);
  if (params.importance && params.importance.length > 0)
    q = q.in("importance", params.importance);
  if (params.dateFrom) q = q.gte("occurred_at", `${params.dateFrom}T00:00:00`);
  if (params.dateTo) {
    const d = new Date(`${params.dateTo}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00`;
    q = q.lt("occurred_at", next);
  }
  if (cleanQ) {
    q = q.or(
      `summary.ilike.%${cleanQ}%,content.ilike.%${cleanQ}%,next_action.ilike.%${cleanQ}%`,
    );
  }

  q = q.order("occurred_at", { ascending: false }).limit(limit);

  const { data, error } = await q;
  if (error || !data) {
    console.error("[ai-clone] searchConversationsForChat 失敗:", error?.message);
    return [];
  }
  const rows = data as Array<{
    id: string;
    occurred_at: string;
    channel: string | null;
    summary: string | null;
    content: string | null;
    importance: string | null;
    next_action: string | null;
  }>;

  // 関連人物名を一括で引く
  const ids = rows.map((r) => r.id);
  let personLinks: Array<{ conversation_log_id: string; ai_clone_person: { name: string } | { name: string }[] | null }> = [];
  if (ids.length > 0) {
    const { data: linkRows } = await sb
      .from("ai_clone_person_conversation_logs")
      .select("conversation_log_id, ai_clone_person(name)")
      .in("conversation_log_id", ids);
    personLinks = (linkRows ?? []) as typeof personLinks;
  }
  const namesById = new Map<string, string[]>();
  for (const link of personLinks) {
    const name = Array.isArray(link.ai_clone_person)
      ? link.ai_clone_person[0]?.name
      : link.ai_clone_person?.name;
    if (!name) continue;
    const arr = namesById.get(link.conversation_log_id) ?? [];
    arr.push(name);
    namesById.set(link.conversation_log_id, arr);
  }

  return rows.map((r) => ({
    occurred_at: r.occurred_at,
    channel: r.channel,
    summary: r.summary,
    content_excerpt: r.content
      ? r.content.length > 300
        ? `${r.content.slice(0, 300)}…`
        : r.content
      : null,
    importance: r.importance,
    next_action: r.next_action,
    person_names: namesById.get(r.id) ?? [],
  }));
}

interface ChatSearchTasksParams {
  query?: string;
  statuses?: string[];      // 未着手/進行中/完了/保留
  priorities?: string[];    // 高/中/低
  dueOnOrBefore?: string;   // YYYY-MM-DD
  overdueOnly?: boolean;    // status≠完了 AND due<today
  limit?: number;           // 既定 10
}

export interface ChatTaskResult {
  name: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  purpose: string | null;
}

export async function searchTasksForChat(
  tenantId: string,
  params: ChatSearchTasksParams,
): Promise<ChatTaskResult[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const limit = params.limit ?? 10;
  const cleanQ = params.query?.replace(/[,()]/g, "").trim();

  let q = sb
    .from("ai_clone_task")
    .select("name, status, priority, due_date, purpose")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (params.statuses && params.statuses.length > 0)
    q = q.in("status", params.statuses);
  if (params.priorities && params.priorities.length > 0)
    q = q.in("priority", params.priorities);
  if (params.dueOnOrBefore) q = q.lte("due_date", params.dueOnOrBefore);
  if (params.overdueOnly) {
    const t = new Date();
    const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    q = q.lt("due_date", today).neq("status", "完了");
  }
  if (cleanQ) {
    q = q.or(`name.ilike.%${cleanQ}%,purpose.ilike.%${cleanQ}%`);
  }

  q = q
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(limit);

  const { data, error } = await q;
  if (error || !data) {
    console.error("[ai-clone] searchTasksForChat 失敗:", error?.message);
    return [];
  }
  return data as ChatTaskResult[];
}

interface ChatSearchPeopleParams {
  query?: string;          // 名前/会社名/役職
  importance?: string[];
  temperature?: string[];
  metContext?: string[];   // 出会った場所
  referrerName?: string;   // 紹介元の人物名（部分一致で referrer_person_id 解決）
  hasAction?: boolean;
  limit?: number;
}

export interface ChatPersonResult {
  name: string;
  company_name: string | null;
  position: string | null;
  importance: string | null;
  temperature: string | null;
  met_context: string | null;
  next_action: string | null;
  referred_by: string | null;
}

export async function searchPeopleForChat(
  tenantId: string,
  params: ChatSearchPeopleParams,
): Promise<ChatPersonResult[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const limit = params.limit ?? 10;
  const cleanQ = params.query?.replace(/[,()]/g, "").trim();

  let q = sb
    .from("ai_clone_person")
    .select(
      "name, company_name, position, importance, temperature, met_context, next_action, referred_by",
    )
    .eq("tenant_id", tenantId);

  if (params.importance && params.importance.length > 0)
    q = q.in("importance", params.importance);
  if (params.temperature && params.temperature.length > 0)
    q = q.in("temperature", params.temperature);
  if (params.metContext && params.metContext.length > 0)
    q = q.in("met_context", params.metContext);
  if (params.hasAction) q = q.not("next_action", "is", null);

  // 紹介元の名前指定があれば該当人物の FK を解決して in 検索
  if (params.referrerName?.trim()) {
    const referrers = await searchPeopleByName(tenantId, params.referrerName.trim());
    if (referrers.length === 0) return [];
    q = q.in("referred_by_person_id", referrers.map((p) => p.id));
  }

  if (cleanQ) {
    q = q.or(
      `name.ilike.%${cleanQ}%,company_name.ilike.%${cleanQ}%,position.ilike.%${cleanQ}%`,
    );
  }

  q = q.order("updated_at", { ascending: false }).limit(limit);

  const { data, error } = await q;
  if (error || !data) {
    console.error("[ai-clone] searchPeopleForChat 失敗:", error?.message);
    return [];
  }
  return data as ChatPersonResult[];
}

interface ChatSearchDecisionCasesParams {
  query?: string;
  confirmedOnly?: boolean;  // 既定 true（誤抽出を学習資産から除外）
  dateFrom?: string;
  dateTo?: string;
  limit?: number;           // 既定 10
}

export interface ChatDecisionCaseResult {
  occurred_at: string;
  event: string;
  insight: string | null;
  action: string | null;
  outcome: string | null;
  takeaway: string | null;
  intent: string | null;
  reusable_when: string | null;
}

export async function searchDecisionCasesForChat(
  tenantId: string,
  params: ChatSearchDecisionCasesParams,
): Promise<ChatDecisionCaseResult[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const limit = params.limit ?? 10;
  const cleanQ = params.query?.replace(/[,()]/g, "").trim();
  const confirmedOnly = params.confirmedOnly ?? true;

  let q = sb
    .from("ai_clone_decision_case")
    .select(
      "occurred_at, event, insight, action, outcome, takeaway, intent, reusable_when",
    )
    .eq("tenant_id", tenantId);

  if (confirmedOnly) q = q.eq("confirmed", true);
  if (params.dateFrom) q = q.gte("occurred_at", `${params.dateFrom}T00:00:00`);
  if (params.dateTo) {
    const d = new Date(`${params.dateTo}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00`;
    q = q.lt("occurred_at", next);
  }
  if (cleanQ) {
    q = q.or(
      `event.ilike.%${cleanQ}%,insight.ilike.%${cleanQ}%,action.ilike.%${cleanQ}%,takeaway.ilike.%${cleanQ}%,intent.ilike.%${cleanQ}%,reusable_when.ilike.%${cleanQ}%`,
    );
  }

  q = q.order("occurred_at", { ascending: false }).limit(limit);

  const { data, error } = await q;
  if (error || !data) {
    console.error("[ai-clone] searchDecisionCasesForChat 失敗:", error?.message);
    return [];
  }
  return data as ChatDecisionCaseResult[];
}

// 同じ日に summary が近い ConversationLog を1件返す（議事録の追記用）。
// 完全一致 > 部分一致（3文字以上）の順で選ぶ。
export async function findConversationLogByApproxSummaryAndDate(
  tenantId: string,
  summary: string,
  date: string, // YYYY-MM-DD
): Promise<{ id: string; summary: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const start = `${date}T00:00:00+09:00`;
  const end = `${date}T23:59:59+09:00`;

  const { data, error } = await sb
    .from("ai_clone_conversation_log")
    .select("id, summary")
    .eq("tenant_id", tenantId)
    .gte("occurred_at", start)
    .lte("occurred_at", end);

  if (error) {
    console.error("[ai-clone] ConversationLog日付検索失敗:", error.message);
    return null;
  }
  const logs = data || [];
  if (logs.length === 0) return null;

  const target = summary.trim().toLowerCase();
  if (!target) return null;

  const exact = logs.find(
    (l) => (l.summary || "").trim().toLowerCase() === target,
  );
  if (exact) return { id: exact.id, summary: exact.summary || "" };

  if (target.length >= 3) {
    const partial = logs.find((l) => {
      const t = (l.summary || "").trim().toLowerCase();
      if (t.length < 3) return false;
      return t.includes(target) || target.includes(t);
    });
    if (partial) return { id: partial.id, summary: partial.summary || "" };
  }
  return null;
}

// 既存 ConversationLog に本文・ネクストアクション・人物リンクを追記。
// 旧 appendMeetingMinutes の置換。
export async function appendConversationLog(
  tenantId: string,
  logId: string,
  params: {
    content?: string;
    nextAction?: string;
    addPersonIds?: string[];
  },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;

  const update: Record<string, unknown> = {};
  if (params.content !== undefined) update.content = params.content;
  if (params.nextAction !== undefined) update.next_action = params.nextAction;

  if (Object.keys(update).length > 0) {
    const { error } = await sb
      .from("ai_clone_conversation_log")
      .update(update)
      .eq("tenant_id", tenantId)
      .eq("id", logId);
    if (error) {
      console.error("[ai-clone] ConversationLog更新失敗:", error.message);
      return false;
    }
  }

  if (params.addPersonIds && params.addPersonIds.length > 0) {
    const links = params.addPersonIds.map((personId) => ({
      conversation_log_id: logId,
      person_id: personId,
    }));
    const { error: linkErr } = await sb
      .from("ai_clone_person_conversation_logs")
      .upsert(links, {
        onConflict: "person_id,conversation_log_id",
        ignoreDuplicates: true,
      });
    if (linkErr) {
      console.error("[ai-clone] ConversationLog人物リンク失敗:", linkErr.message);
      return false;
    }
  }

  return true;
}

// 指定人物が関係した直近 ConversationLog を取得
export async function fetchRecentConversationLogsForPerson(
  tenantId: string,
  personId: string,
  limit: number = 5,
): Promise<
  {
    id: string;
    summary: string;
    occurredAt: string;
    content: string;
    nextAction: string;
  }[]
> {
  const sb = adminSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("ai_clone_person_conversation_logs")
    .select(
      "log:ai_clone_conversation_log!inner(id, tenant_id, summary, occurred_at, content, next_action)",
    )
    .eq("person_id", personId)
    .eq("log.tenant_id", tenantId)
    .order("occurred_at", {
      foreignTable: "ai_clone_conversation_log",
      ascending: false,
    })
    .limit(limit);

  if (error) {
    console.error("[ai-clone] 人物別ConversationLogs取得失敗:", error.message);
    return [];
  }

  return (data || [])
    .map((row: any) => row.log)
    .filter((l: any) => l)
    .map((l: any) => ({
      id: l.id as string,
      summary: (l.summary as string) || "",
      occurredAt: (l.occurred_at as string) || "",
      content: (l.content as string) || "",
      nextAction: (l.next_action as string) || "",
    }));
}

// =============================================
// 会話履歴（チャンネル横断のチャット記憶）。migration 0052。
// generateReply が直近のやり取りを思い出して文脈を保つために使う。
// =============================================

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// 1発話を履歴に追記（user / assistant それぞれ1行）
export async function appendChatMessage(
  tenantId: string,
  channel: string,
  externalUserId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  const sb = adminSupabase();
  if (!sb) return;
  if (!content.trim()) return;
  const { error } = await sb.from("ai_clone_chat_message").insert({
    tenant_id: tenantId,
    channel,
    external_user_id: externalUserId,
    role,
    content,
  });
  if (error) console.error("[ai-clone] チャット履歴保存失敗:", error.message);
}

// 直近 N 件の履歴を時系列（古い順）で返す。新しい順に取って reverse する。
export async function fetchRecentChatMessages(
  tenantId: string,
  channel: string,
  externalUserId: string,
  limit: number = 8,
): Promise<ChatHistoryMessage[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_chat_message")
    .select("role, content")
    .eq("tenant_id", tenantId)
    .eq("channel", channel)
    .eq("external_user_id", externalUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    if (error) console.error("[ai-clone] チャット履歴取得失敗:", error.message);
    return [];
  }
  return (data as Array<{ role: string; content: string }>)
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }))
    .reverse();
}

// 指定日に発生した ConversationLogs を取得
export async function fetchConversationLogsForDate(
  tenantId: string,
  date: string,
): Promise<
  {
    id: string;
    summary: string;
    nextAction: string;
  }[]
> {
  const sb = adminSupabase();
  if (!sb) return [];

  const start = `${date}T00:00:00+09:00`;
  const end = `${date}T23:59:59+09:00`;

  const { data, error } = await sb
    .from("ai_clone_conversation_log")
    .select("id, summary, next_action")
    .eq("tenant_id", tenantId)
    .gte("occurred_at", start)
    .lte("occurred_at", end)
    .limit(50);

  if (error) {
    console.error("[ai-clone] 指定日ConversationLogs取得失敗:", error.message);
    return [];
  }
  return (data || []).map((l: any) => ({
    id: l.id,
    summary: l.summary || "",
    nextAction: l.next_action || "",
  }));
}

// ===========================================================
// PendingAction 系（対話状態の短期保存。0031 で導入）
// ===========================================================
// 主に曖昧マッチ確認の往復で使う。Slack/LINE で bot が「1) 田中太郎 2) 田中一郎」と
// 聞き返したあと、次の返信を受けた時に直前の状態を読み出すための短期 state。
// expires_at（now + 10min）を過ぎたら無視する。

export interface PendingActionRow {
  id: string;
  tenantId: string;
  channel: string;
  externalUserId: string;
  actionKind: string;
  payload: Record<string, unknown>;
  expiresAt: string;
  createdAt: string;
}

// 直近の有効 pending を1件取得（同ユーザーで複数残ってたら最新を採用）
export async function getActivePendingAction(
  tenantId: string,
  channel: string,
  externalUserId: string,
): Promise<PendingActionRow | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const nowIso = new Date().toISOString();
  const { data, error } = await sb
    .from("ai_clone_pending_action")
    .select("id, tenant_id, channel, external_user_id, action_kind, payload, expires_at, created_at")
    .eq("tenant_id", tenantId)
    .eq("channel", channel)
    .eq("external_user_id", externalUserId)
    .gte("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[ai-clone] PendingAction取得失敗:", error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id as string,
    tenantId: data.tenant_id as string,
    channel: data.channel as string,
    externalUserId: data.external_user_id as string,
    actionKind: data.action_kind as string,
    payload: (data.payload || {}) as Record<string, unknown>,
    expiresAt: data.expires_at as string,
    createdAt: data.created_at as string,
  };
}

export async function savePendingAction(params: {
  tenantId: string;
  channel: string;
  externalUserId: string;
  actionKind: string;
  payload: Record<string, unknown>;
  ttlMinutes?: number; // 既定 10 分
}): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const ttl = params.ttlMinutes ?? 10;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString();

  // 同ユーザーの旧 pending は先に消す（同時 1 件ポリシー）
  await sb
    .from("ai_clone_pending_action")
    .delete()
    .eq("tenant_id", params.tenantId)
    .eq("channel", params.channel)
    .eq("external_user_id", params.externalUserId);

  const { data, error } = await sb
    .from("ai_clone_pending_action")
    .insert({
      tenant_id: params.tenantId,
      channel: params.channel,
      external_user_id: params.externalUserId,
      action_kind: params.actionKind,
      payload: params.payload,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] PendingAction保存失敗:", error?.message);
    return null;
  }
  return { id: data.id as string };
}

export async function deletePendingAction(id: string): Promise<void> {
  const sb = adminSupabase();
  if (!sb) return;
  await sb.from("ai_clone_pending_action").delete().eq("id", id);
}

// ===========================================================
// Note 系（kind 別に5テーブルへ振り分け）
// ===========================================================

// createNote: Notion の kind 5種を Supabase の専用テーブルに振り分けて INSERT。
// 返り値の id はそれぞれの専用テーブルのレコード ID。
export async function createNote(
  tenantId: string,
  params: {
    title: string;
    date?: string;
    kind: NoteKind;
    content: string;
    peopleIds?: string[];
  },
): Promise<{ id: string } | null> {
  switch (params.kind) {
    case "Decision":
      return createDecisionLog(tenantId, params);
    case "Action":
      return createTaskFromNote(tenantId, params);
    case "Event":
      return createActivityLog(tenantId, params);
    case "Learning":
      return createKnowledgeCandidate(tenantId, params, "Learning候補");
    case "Hypothesis":
      // 人物紐付きがあれば person_note（最初の1人だけ）、無ければ knowledge_candidate
      if (params.peopleIds && params.peopleIds.length > 0) {
        return createPersonNote(tenantId, params.peopleIds[0], params);
      }
      return createKnowledgeCandidate(tenantId, params, "Hypothesis候補");
  }
}

async function createDecisionLog(
  tenantId: string,
  params: { title: string; date?: string; content: string; peopleIds?: string[] },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const occurredAt = params.date
    ? `${params.date}T00:00:00+09:00`
    : new Date().toISOString();

  const { data, error } = await sb
    .from("ai_clone_decision_log")
    .insert({
      tenant_id: tenantId,
      occurred_at: occurredAt,
      theme: params.title,
      conclusion: params.content,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] DecisionLog作成失敗:", error?.message);
    return null;
  }

  if (params.peopleIds && params.peopleIds.length > 0) {
    const links = params.peopleIds.map((personId) => ({
      person_id: personId,
      decision_log_id: data.id,
    }));
    await sb
      .from("ai_clone_person_decision_logs")
      .upsert(links, { onConflict: "person_id,decision_log_id", ignoreDuplicates: true });
  }

  return { id: data.id };
}

async function createTaskFromNote(
  tenantId: string,
  params: { title: string; date?: string; content: string; peopleIds?: string[] },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_task")
    .insert({
      tenant_id: tenantId,
      name: params.title,
      origin_log: params.content,
      due_date: params.date || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] Task作成失敗:", error?.message);
    return null;
  }

  if (params.peopleIds && params.peopleIds.length > 0) {
    const links = params.peopleIds.map((personId) => ({
      person_id: personId,
      task_id: data.id,
    }));
    await sb
      .from("ai_clone_person_tasks")
      .upsert(links, { onConflict: "person_id,task_id", ignoreDuplicates: true });
  }

  return { id: data.id };
}

// title は content の先頭を切り出したものが渡ることが多く、素朴に連結すると
// 同じ文字が2行入る（例:「X」「X」）。content が既に title で始まるなら content だけ使う。
function mergeTitleContent(title: string, content: string): string {
  const t = (title ?? "").trim();
  const c = (content ?? "").trim();
  if (!c) return t;
  if (!t || c.startsWith(t)) return c;
  return `${t}\n${c}`;
}

async function createActivityLog(
  tenantId: string,
  params: { title: string; date?: string; content: string; peopleIds?: string[] },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_activity_log")
    .insert({
      tenant_id: tenantId,
      occurred_date: params.date || todayJST(),
      content: mergeTitleContent(params.title, params.content),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] ActivityLog作成失敗:", error?.message);
    return null;
  }

  if (params.peopleIds && params.peopleIds.length > 0) {
    const links = params.peopleIds.map((personId) => ({
      person_id: personId,
      activity_log_id: data.id,
    }));
    await sb
      .from("ai_clone_person_activity_logs")
      .upsert(links, { onConflict: "person_id,activity_log_id", ignoreDuplicates: true });
  }

  return { id: data.id };
}

// =============================================
// 紹介行動の記録＆週次KPI（紹介コーチの考え方「頼んだ数×与えた数」を測る）。
// 既存 createActivityLog は activity_type を書かないため、朝配信RPCの
// activity_type='紹介依頼' が永遠にヒットしない穴があった。ここで明示的に書く。
// migration 不要（activity_type は自由テキスト列）。
// 詳細な考え方: contexts/projects/gia/referral_generation_metrics.md
// =============================================

// 紹介の「行動」を活動ログに残す。asked=紹介を頼んだ / gave=紹介を与えた。
export async function createReferralActivity(
  tenantId: string,
  params: {
    kind: "asked" | "gave";
    content: string;
    peopleIds?: string[];
    date?: string;
  },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const activityType = params.kind === "asked" ? "紹介依頼" : "紹介実施";

  const { data, error } = await sb
    .from("ai_clone_activity_log")
    .insert({
      tenant_id: tenantId,
      occurred_date: params.date || todayJST(),
      activity_type: activityType,
      content: params.content.trim(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] 紹介活動ログ作成失敗:", error?.message);
    return null;
  }

  if (params.peopleIds && params.peopleIds.length > 0) {
    const links = params.peopleIds.map((personId) => ({
      person_id: personId,
      activity_log_id: data.id,
    }));
    await sb
      .from("ai_clone_person_activity_logs")
      .upsert(links, {
        onConflict: "person_id,activity_log_id",
        ignoreDuplicates: true,
      });
  }

  return { id: data.id };
}

// 直近の紹介活動ログ（紹介依頼/紹介実施）を取得（「さっきの紹介」を特定するため）。
export async function findRecentReferralActivities(
  tenantId: string,
  limit: number = 20,
): Promise<
  Array<{ id: string; activityType: string; content: string; occurredDate: string }>
> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_activity_log")
    .select("id, activity_type, content, occurred_date")
    .eq("tenant_id", tenantId)
    .in("activity_type", ["紹介依頼", "紹介実施"])
    .order("occurred_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    activityType: r.activity_type,
    content: r.content,
    occurredDate: r.occurred_date,
  }));
}

// 紹介活動ログのスナップショット（アンドゥの再作成用）。
export async function getReferralActivitySnapshot(
  tenantId: string,
  id: string,
): Promise<{
  kind: "asked" | "gave";
  content: string;
  date: string;
  peopleIds: string[];
} | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("ai_clone_activity_log")
    .select("activity_type, content, occurred_date")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const { data: links } = await sb
    .from("ai_clone_person_activity_logs")
    .select("person_id")
    .eq("activity_log_id", id);
  return {
    kind: data.activity_type === "紹介実施" ? "gave" : "asked",
    content: data.content,
    date: data.occurred_date,
    peopleIds: (links || []).map((l: any) => l.person_id),
  };
}

// 紹介活動ログの内容・種別を更新。
export async function updateReferralActivity(
  tenantId: string,
  id: string,
  patch: { content?: string; kind?: "asked" | "gave" },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const row: Record<string, unknown> = {};
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.kind !== undefined)
    row.activity_type = patch.kind === "gave" ? "紹介実施" : "紹介依頼";
  if (Object.keys(row).length === 0) return true;
  const { error } = await sb
    .from("ai_clone_activity_log")
    .update(row)
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] 紹介活動ログ更新失敗:", error.message);
    return false;
  }
  return true;
}

// 紹介活動ログを削除（ハード削除＋人物リンクも削除）。KPIの母数から外れる。
export async function deleteReferralActivity(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  await sb
    .from("ai_clone_person_activity_logs")
    .delete()
    .eq("activity_log_id", id);
  const { error } = await sb
    .from("ai_clone_activity_log")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] 紹介活動ログ削除失敗:", error.message);
    return false;
  }
  return true;
}

export interface ReferralWeeklyKpi {
  asked: number; // 紹介を頼んだ件数
  gave: number; // 自分が紹介を与えた件数
  born: number; // 生まれた紹介（紹介経由で増えた人）件数
  from: string;
  to: string;
}

// 週次の紹介KPI。DB側 count(head) で集計し1000行上限を踏まない。
// born は「紹介元つきで期間内に増えた人物」を leading 指標として代用。
export async function fetchReferralWeeklyKpi(
  tenantId: string,
  fromDate: string,
  toDate: string,
): Promise<ReferralWeeklyKpi> {
  const sb = adminSupabase();
  const empty: ReferralWeeklyKpi = {
    asked: 0,
    gave: 0,
    born: 0,
    from: fromDate,
    to: toDate,
  };
  if (!sb) return empty;

  const countActivities = async (type: string): Promise<number> => {
    const { count } = await sb
      .from("ai_clone_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("activity_type", type)
      .gte("occurred_date", fromDate)
      .lte("occurred_date", toDate);
    return count ?? 0;
  };

  const countBorn = async (): Promise<number> => {
    const { count } = await sb
      .from("ai_clone_person")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("referred_by_person_id", "is", null)
      .gte("created_at", `${fromDate}T00:00:00`)
      .lte("created_at", `${toDate}T23:59:59`);
    return count ?? 0;
  };

  const [asked, gave, born] = await Promise.all([
    countActivities("紹介依頼").catch(() => 0),
    countActivities("紹介実施").catch(() => 0),
    countBorn().catch(() => 0),
  ]);

  return { asked, gave, born, from: fromDate, to: toDate };
}

export interface CoachServiceRow {
  name: string;
  targetAudience: string | null;
  problemSolved: string | null;
  offering: string | null;
  pricing: string | null;
  goodFit: string | null;
  badFit: string | null;
}

// テナントのサービス・商品を取得（紹介コーチが価値設計のレンズで磨く材料）。
export async function fetchServicesForTenant(
  tenantId: string,
  limit: number = 8,
): Promise<CoachServiceRow[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_service")
    .select(
      "name, target_audience, problem_solved, offering, pricing, good_fit, bad_fit",
    )
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    if (error) console.error("[ai-clone] サービス取得失敗:", error.message);
    return [];
  }
  return (
    data as Array<{
      name: string;
      target_audience: string | null;
      problem_solved: string | null;
      offering: string | null;
      pricing: string | null;
      good_fit: string | null;
      bad_fit: string | null;
    }>
  ).map((r) => ({
    name: r.name,
    targetAudience: r.target_audience,
    problemSolved: r.problem_solved,
    offering: r.offering,
    pricing: r.pricing,
    goodFit: r.good_fit,
    badFit: r.bad_fit,
  }));
}

async function createKnowledgeCandidate(
  tenantId: string,
  params: { title: string; date?: string; content: string },
  kind: string,
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_knowledge_candidate")
    .insert({
      tenant_id: tenantId,
      content: mergeTitleContent(params.title, params.content),
      kind,
      origin_log: params.date || "",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] KnowledgeCandidate作成失敗:", error?.message);
    return null;
  }
  return { id: data.id };
}

async function createPersonNote(
  tenantId: string,
  personId: string,
  params: { title: string; date?: string; content: string },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const occurredAt = params.date
    ? `${params.date}T00:00:00+09:00`
    : new Date().toISOString();

  const { data, error } = await sb
    .from("ai_clone_person_note")
    .insert({
      tenant_id: tenantId,
      person_id: personId,
      occurred_at: occurredAt,
      content: mergeTitleContent(params.title, params.content),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] PersonNote作成失敗:", error?.message);
    return null;
  }
  return { id: data.id };
}

// 日記（ai_clone_journal）の UPSERT。
//   - 同日レコードあり → content に「--- HH:MM」区切りで追記、summary は最新で上書き
//   - なし             → 新規挿入
//   - 返り値の isNew で「新規 / 追記」を呼び出し側に通知
// 同時2件投稿の race は UNIQUE(tenant_id, entry_date) で片方が失敗するだけ。
// その場合は呼び出し側で 1 度だけリトライすれば十分（Phase 1 では未実装）。
export async function upsertJournalEntry(
  tenantId: string,
  params: { date: string; rawText: string; summary?: string | null },
): Promise<{ id: string; isNew: boolean } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data: existing, error: selectErr } = await sb
    .from("ai_clone_journal")
    .select("id, content")
    .eq("tenant_id", tenantId)
    .eq("entry_date", params.date)
    .maybeSingle();

  if (selectErr) {
    console.error("[ai-clone] Journal取得失敗:", selectErr.message);
    return null;
  }

  // 追記用の時刻区切り（JST）
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");

  if (existing) {
    const nextContent = `${existing.content}\n\n--- ${hh}:${mm}\n${params.rawText}`;
    const { error: updateErr } = await sb
      .from("ai_clone_journal")
      .update({
        content: nextContent,
        summary: params.summary ?? null,
      })
      .eq("id", existing.id);
    if (updateErr) {
      console.error("[ai-clone] Journal更新失敗:", updateErr.message);
      return null;
    }
    return { id: existing.id, isNew: false };
  }

  const { data: inserted, error: insertErr } = await sb
    .from("ai_clone_journal")
    .insert({
      tenant_id: tenantId,
      entry_date: params.date,
      content: params.rawText,
      summary: params.summary ?? null,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    console.error("[ai-clone] Journal挿入失敗:", insertErr?.message);
    return null;
  }
  return { id: inserted.id, isNew: true };
}

// persona_trait（観察された傾向）の category 候補。
// migration 0038 の CHECK 制約と一致させる。新カテゴリを増やすときは両側を更新。
export const PERSONA_TRAIT_CATEGORIES = [
  "価値観",
  "判断軸",
  "学びクセ",
  "好み",
  "息抜き",
  "心理パターン",
  "仕事スタイル",
  "関係性パターン",
] as const;
export type PersonaTraitCategory = (typeof PERSONA_TRAIT_CATEGORIES)[number];

// 振り返り送信時、AI が抽出した「本人の傾向」を candidate として保存する。
// 重複（同じ tenant×category×trait 完全一致）の場合はスキップして既存 id を返す
// ことで「同じ趣旨の候補が乱立する」のを抑える。
export async function createPersonaTraitCandidate(
  tenantId: string,
  params: {
    category: PersonaTraitCategory;
    trait: string;
    detail?: string | null;
    sourceJournalId?: string | null;
  },
): Promise<{ id: string; isDuplicate: boolean } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const trait = params.trait.trim();
  if (trait.length === 0) return null;

  // 同 tenant × 同 category × 同 trait の完全一致は重複扱い
  const { data: existing } = await sb
    .from("ai_clone_persona_trait")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("category", params.category)
    .eq("trait", trait)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, isDuplicate: true };
  }

  const { data, error } = await sb
    .from("ai_clone_persona_trait")
    .insert({
      tenant_id: tenantId,
      category: params.category,
      trait,
      detail: params.detail ?? null,
      status: "candidate",
      source_journal_id: params.sourceJournalId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] PersonaTrait候補作成失敗:", error?.message);
    return null;
  }
  return { id: data.id, isDuplicate: false };
}

// 採択済み persona_trait を category 別にまとめて取得（システムプロンプト構築用）。
// 返り値は category → trait[] のマップ。空でも OK。
export async function fetchAdoptedPersonaTraits(
  tenantId: string,
): Promise<Record<string, { trait: string; detail: string | null }[]>> {
  const sb = adminSupabase();
  if (!sb) return {};

  const { data, error } = await sb
    .from("ai_clone_persona_trait")
    .select("category, trait, detail, adopted_at")
    .eq("tenant_id", tenantId)
    .eq("status", "adopted")
    .order("adopted_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("[ai-clone] PersonaTrait採択取得失敗:", error.message);
    return {};
  }

  const grouped: Record<string, { trait: string; detail: string | null }[]> = {};
  for (const row of data as Array<{
    category: string; trait: string; detail: string | null;
  }>) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push({ trait: row.trait, detail: row.detail });
  }
  return grouped;
}

// 特定人物に紐づく直近 Notes を5テーブル横断で取得（新しい順、合計 limit 件）
export async function fetchRecentNotesForPerson(
  tenantId: string,
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
  const sb = adminSupabase();
  if (!sb) return [];

  // 5テーブル並列取得 → マージ → occurred 日時で降順ソート → limit
  const [decisions, tasks, activities, knowledge, personNotes] = await Promise.all([
    sb
      .from("ai_clone_person_decision_logs")
      .select("decision_log:ai_clone_decision_log!inner(id, tenant_id, occurred_at, theme, conclusion)")
      .eq("person_id", personId)
      .eq("decision_log.tenant_id", tenantId)
      .order("occurred_at", { foreignTable: "ai_clone_decision_log", ascending: false })
      .limit(limit),
    sb
      .from("ai_clone_person_tasks")
      .select("task:ai_clone_task!inner(id, tenant_id, name, due_date, origin_log, created_at)")
      .eq("person_id", personId)
      .eq("task.tenant_id", tenantId)
      .order("created_at", { foreignTable: "ai_clone_task", ascending: false })
      .limit(limit),
    sb
      .from("ai_clone_person_activity_logs")
      .select("activity:ai_clone_activity_log!inner(id, tenant_id, occurred_date, content)")
      .eq("person_id", personId)
      .eq("activity.tenant_id", tenantId)
      .order("occurred_date", { foreignTable: "ai_clone_activity_log", ascending: false })
      .limit(limit),
    // knowledge_candidate は人物リンクが無い設計のため、ここでは取らない（Hypothesis 独立分のみ knowledge へ行く）
    Promise.resolve({ data: [], error: null }) as any,
    sb
      .from("ai_clone_person_note")
      .select("id, occurred_at, content")
      .eq("tenant_id", tenantId)
      .eq("person_id", personId)
      .order("occurred_at", { ascending: false })
      .limit(limit),
  ]);

  type Row = { id: string; title: string; date: string; kind: string; content: string };
  const merged: Row[] = [];

  for (const r of (decisions.data || []) as any[]) {
    const d = r.decision_log;
    if (!d) continue;
    merged.push({
      id: d.id,
      title: d.theme || "",
      date: (d.occurred_at || "").slice(0, 10),
      kind: "Decision",
      content: d.conclusion || "",
    });
  }
  for (const r of (tasks.data || []) as any[]) {
    const t = r.task;
    if (!t) continue;
    merged.push({
      id: t.id,
      title: t.name || "",
      date: t.due_date || (t.created_at || "").slice(0, 10),
      kind: "Action",
      content: t.origin_log || "",
    });
  }
  for (const r of (activities.data || []) as any[]) {
    const a = r.activity;
    if (!a) continue;
    merged.push({
      id: a.id,
      title: (a.content || "").slice(0, 40),
      date: a.occurred_date || "",
      kind: "Event",
      content: a.content || "",
    });
  }
  for (const n of (personNotes.data || []) as any[]) {
    merged.push({
      id: n.id,
      title: (n.content || "").split("\n")[0]?.slice(0, 40) || "",
      date: (n.occurred_at || "").slice(0, 10),
      kind: "Hypothesis",
      content: n.content || "",
    });
  }

  // 日付降順マージ → 上位 limit 件
  merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return merged.slice(0, limit);
}

// ===========================================================
// Pipeline 系（ファネル状態）
// ===========================================================

// 特定人物のファネル状態を更新（最新化を優先、既存値は上書き）
export async function updatePersonPipeline(
  tenantId: string,
  personId: string,
  params: {
    salonProposalDate?: string;
    salonJoinDate?: string;
    appPitchDate?: string;
    appDealDate?: string;
    dealAmount?: number;
  },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;

  const update: Record<string, unknown> = {};
  if (params.salonProposalDate) update.salon_proposal_date = params.salonProposalDate;
  if (params.salonJoinDate) update.salon_join_date = params.salonJoinDate;
  if (params.appPitchDate) update.app_pitch_date = params.appPitchDate;
  if (params.appDealDate) update.app_deal_date = params.appDealDate;
  if (typeof params.dealAmount === "number") update.deal_amount = params.dealAmount;

  if (Object.keys(update).length === 0) return true;

  const { error } = await sb
    .from("ai_clone_person")
    .update(update)
    .eq("tenant_id", tenantId)
    .eq("id", personId);

  if (error) {
    console.error("[ai-clone] Pipeline更新失敗:", error.message);
    return false;
  }
  return true;
}

// ファネル集計（admin dashboard 用）
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
  tenantId: string,
  year: number,
  month: number,
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

  const sb = adminSupabase();
  if (!sb) return empty;

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const inThisMonth = (iso: string | null) =>
    !!iso && iso.startsWith(monthPrefix);

  const { data, error } = await sb
    .from("ai_clone_person")
    .select(
      "salon_proposal_date, salon_join_date, app_pitch_date, app_deal_date, deal_amount",
    )
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[ai-clone] Pipeline集計失敗:", error.message);
    return empty;
  }

  for (const row of (data || []) as any[]) {
    if (row.salon_proposal_date) {
      empty.salonProposal.allTime++;
      if (inThisMonth(row.salon_proposal_date)) empty.salonProposal.thisMonth++;
    }
    if (row.salon_join_date) {
      empty.salonJoin.allTime++;
      if (inThisMonth(row.salon_join_date)) empty.salonJoin.thisMonth++;
    }
    if (row.app_pitch_date) {
      empty.appPitch.allTime++;
      if (inThisMonth(row.app_pitch_date)) empty.appPitch.thisMonth++;
    }
    if (row.app_deal_date) {
      empty.appDeal.allTime++;
      if (inThisMonth(row.app_deal_date)) empty.appDeal.thisMonth++;
      const amount = Number(row.deal_amount) || 0;
      empty.totalRevenue += amount;
      if (inThisMonth(row.app_deal_date)) empty.monthlyRevenue += amount;
    }
  }

  return empty;
}

// ===========================================================
// 月次集計
// ===========================================================

export async function fetchMonthlyAggregates(
  tenantId: string,
  year: number,
  month: number,
): Promise<{
  monthRange: { start: string; end: string };
  notesByKind: Record<string, number>;
  notesTotal: number;
  meetings: number;
  peopleTotal: number;
  allTime: { notes: number; meetings: number };
}> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const sb = adminSupabase();
  const empty = {
    monthRange: { start, end },
    notesByKind: {},
    notesTotal: 0,
    meetings: 0,
    peopleTotal: 0,
    allTime: { notes: 0, meetings: 0 },
  };
  if (!sb) return empty;

  // 月内・全期間カウントを並列実行
  const [
    decisionsMonth,
    tasksMonth,
    activitiesMonth,
    knowledgeMonth,
    personNotesMonth,
    meetingsMonth,
    decisionsAll,
    tasksAll,
    activitiesAll,
    knowledgeAll,
    personNotesAll,
    meetingsAll,
    peopleAll,
  ] = await Promise.all([
    sb
      .from("ai_clone_decision_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("occurred_at", `${start}T00:00:00+09:00`)
      .lte("occurred_at", `${end}T23:59:59+09:00`),
    sb
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .gte("created_at", `${start}T00:00:00+09:00`)
      .lte("created_at", `${end}T23:59:59+09:00`),
    sb
      .from("ai_clone_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("occurred_date", start)
      .lte("occurred_date", end),
    sb
      .from("ai_clone_knowledge_candidate")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", `${start}T00:00:00+09:00`)
      .lte("created_at", `${end}T23:59:59+09:00`),
    sb
      .from("ai_clone_person_note")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("occurred_at", `${start}T00:00:00+09:00`)
      .lte("occurred_at", `${end}T23:59:59+09:00`),
    sb
      .from("ai_clone_conversation_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("occurred_at", `${start}T00:00:00+09:00`)
      .lte("occurred_at", `${end}T23:59:59+09:00`),
    sb
      .from("ai_clone_decision_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    sb
      .from("ai_clone_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_knowledge_candidate")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_person_note")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_conversation_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_person")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  const dMonth = decisionsMonth.count || 0;
  const tMonth = tasksMonth.count || 0;
  const aMonth = activitiesMonth.count || 0;
  const kMonth = knowledgeMonth.count || 0;
  const pnMonth = personNotesMonth.count || 0;

  const notesByKind: Record<string, number> = {
    Decision: dMonth,
    Action: tMonth,
    Event: aMonth,
    Learning: kMonth,
    Hypothesis: pnMonth,
  };
  const notesTotal = dMonth + tMonth + aMonth + kMonth + pnMonth;

  return {
    monthRange: { start, end },
    notesByKind,
    notesTotal,
    meetings: meetingsMonth.count || 0,
    peopleTotal: peopleAll.count || 0,
    allTime: {
      notes:
        (decisionsAll.count || 0) +
        (tasksAll.count || 0) +
        (activitiesAll.count || 0) +
        (knowledgeAll.count || 0) +
        (personNotesAll.count || 0),
      meetings: meetingsAll.count || 0,
    },
  };
}

// ===========================================================
// 経営コンテキスト（Core OS 7テーブルから集約して構成）
// ===========================================================

// fetchReferralWorksheetText: テナントの owner が紹介コーチのワークシート
// (referral_worksheets) に記入した「自分の紹介設計」を読み、システムプロンプト用の
// markdown として返す。未記入 / owner 無し / 失敗時は空文字。
// → 右腕AIが紹介相談に、汎用フレームワークでなく本人の紹介設計で答えられるようにする。
export async function fetchReferralWorksheetText(
  tenantId: string,
): Promise<string> {
  const sb = adminSupabase();
  if (!sb) return "";

  const { data: tenant } = await sb
    .from("ai_clone_tenants")
    .select("owner_user_id, referral_worksheet_link_enabled")
    .eq("id", tenantId)
    .maybeSingle();
  const t = tenant as {
    owner_user_id: string | null;
    referral_worksheet_link_enabled: boolean | null;
  } | null;
  // 連携OFF（明示 false）のときは読み込まない。null/未設定は default ON 扱い。
  if (t?.referral_worksheet_link_enabled === false) return "";
  const ownerId = t?.owner_user_id ?? null;
  if (!ownerId) return "";

  const { data: ws, error } = await sb
    .from("referral_worksheets")
    .select("data")
    .eq("user_id", ownerId)
    .maybeSingle();
  if (error) return "";

  const wd = ((ws as { data: WorksheetData | null } | null)?.data ??
    {}) as WorksheetData;

  const sections: string[] = [];
  for (const sheet of WORKSHEETS) {
    const lines = sheet.fields
      .filter((f) => (wd[f.id] ?? "").trim().length > 0)
      .map((f) => `- ${f.label}: ${wd[f.id].trim()}`);
    if (lines.length > 0) {
      sections.push(`### ${sheet.title}\n${lines.join("\n")}`);
    }
  }
  return sections.join("\n\n");
}

// 紹介コーチ連携（右腕がワークシートを読むか）のフラグを更新。Slack/LINE コマンドから呼ぶ。
export async function setReferralWorksheetLinkEnabled(
  tenantId: string,
  enabled: boolean,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_tenants")
    .update({ referral_worksheet_link_enabled: enabled })
    .eq("id", tenantId);
  if (error) {
    console.error("[ai-clone] 紹介連携フラグ更新失敗:", error.message);
    return false;
  }
  return true;
}

// fetchExecutiveContext: ai_clone_mission / three_year_plan / annual_kpi /
// decision_principle / tone_rule / ng_rule / faq を読み込み、システムプロンプト用の
// markdown テキストとして連結して返す。1テーブル失敗しても他は残す。
export async function fetchExecutiveContext(tenantId: string): Promise<string> {
  const sb = adminSupabase();
  if (!sb) return getFallbackContext();

  const [mission, plan, kpi, principles, tones, ngs, faqs] = await Promise.all([
    sb.from("ai_clone_mission").select("*").eq("tenant_id", tenantId).limit(1).maybeSingle(),
    sb.from("ai_clone_three_year_plan").select("*").eq("tenant_id", tenantId).limit(1).maybeSingle(),
    // migration 0021 で 1年度=複数KPI レコードに変更。最新年度の全KPIを取る。
    sb.from("ai_clone_annual_kpi").select("*").eq("tenant_id", tenantId).order("fiscal_year", { ascending: false }).order("created_at", { ascending: true }).limit(50),
    sb.from("ai_clone_decision_principle").select("*").eq("tenant_id", tenantId).limit(20),
    sb.from("ai_clone_tone_rule").select("*").eq("tenant_id", tenantId).limit(5),
    sb.from("ai_clone_ng_rule").select("*").eq("tenant_id", tenantId).limit(10),
    sb.from("ai_clone_faq").select("*").eq("tenant_id", tenantId).limit(30),
  ]);

  const sections: string[] = [];

  if (mission.data) {
    const m = mission.data as any;
    const lines: string[] = ["# ミッション・理念"];
    if (m.mission) lines.push(`**ミッション**: ${m.mission}`);
    if (m.values_tags?.length) lines.push(`**価値観**: ${m.values_tags.join(" / ")}`);
    if (m.target_world) lines.push(`**目指す世界**: ${m.target_world}`);
    if (m.not_doing) lines.push(`**やらないこと**: ${m.not_doing}`);
    if (m.value_to_customer) lines.push(`**お客様に届けたい価値**: ${m.value_to_customer}`);
    sections.push(lines.join("\n"));
  }

  if (plan.data) {
    const p = plan.data as any;
    const lines: string[] = ["# 3年計画"];
    if (p.plan_name) lines.push(`**計画名**: ${p.plan_name}`);
    if (p.ideal_state_in_3y) lines.push(`**3年後の理想状態**: ${p.ideal_state_in_3y}`);
    if (p.business_pillars?.length) lines.push(`**事業の柱**: ${p.business_pillars.join(" / ")}`);
    if (p.revenue_model) lines.push(`**収益モデル**: ${p.revenue_model}`);
    if (p.assets_to_build) lines.push(`**作りたい資産**: ${p.assets_to_build}`);
    if (p.work_style_to_quit) lines.push(`**やめたい働き方**: ${p.work_style_to_quit}`);
    sections.push(lines.join("\n"));
  }

  if (kpi.data && kpi.data.length > 0) {
    // 年度ごとにグループ化して整形（最新年度が先頭）
    const byYear = new Map<string, any[]>();
    for (const row of kpi.data as any[]) {
      const y = row.fiscal_year || "未設定";
      const arr = byYear.get(y) ?? [];
      arr.push(row);
      byYear.set(y, arr);
    }
    for (const [year, rows] of byYear) {
      const lines: string[] = [`# ${year}年度 KPI`];
      for (const r of rows) {
        const value =
          r.target_value === null || r.target_value === undefined
            ? "—"
            : `${Number(r.target_value).toLocaleString("ja-JP")}${r.unit ? ` ${r.unit}` : ""}`;
        lines.push(`- **${r.title}**: ${value}`);
      }
      sections.push(lines.join("\n"));
    }
  }

  if (principles.data && principles.data.length > 0) {
    const lines: string[] = ["# 判断基準"];
    for (const p of principles.data as any[]) {
      const head = `- **${p.name}**${p.priority ? `（優先度:${p.priority}）` : ""}`;
      const detail = p.rule ? `: ${p.rule}` : "";
      const reason = p.reason ? `\n  理由: ${p.reason}` : "";
      lines.push(head + detail + reason);
    }
    sections.push(lines.join("\n"));
  }

  if (tones.data && tones.data.length > 0) {
    const lines: string[] = ["# 口調・対応ルール"];
    for (const t of tones.data as any[]) {
      lines.push(`- **${t.name}**`);
      if (t.base_tone) lines.push(`  基本の口調: ${t.base_tone}`);
      if (t.ng_expressions) lines.push(`  NG表現: ${t.ng_expressions}`);
      if (t.reply_length) lines.push(`  返信の長さ: ${t.reply_length}`);
    }
    sections.push(lines.join("\n"));
  }

  if (ngs.data && ngs.data.length > 0) {
    const lines: string[] = ["# NG判断・確認ルール"];
    for (const n of ngs.data as any[]) {
      lines.push(`- **${n.area_name}**`);
      if (n.reason_not_for_ai) lines.push(`  AIに任せない理由: ${n.reason_not_for_ai}`);
      if (n.escalation_target) lines.push(`  エスカレ先: ${n.escalation_target}`);
    }
    sections.push(lines.join("\n"));
  }

  if (faqs.data && faqs.data.length > 0) {
    const lines: string[] = ["# FAQ"];
    for (const f of faqs.data as any[]) {
      lines.push(`- Q: ${f.question}`);
      if (f.base_answer) lines.push(`  A: ${f.base_answer}`);
      if (f.caveat) lines.push(`  注意: ${f.caveat}`);
    }
    sections.push(lines.join("\n"));
  }

  if (sections.length === 0) return getFallbackContext();
  return sections.join("\n\n---\n\n");
}

// Supabase 接続不能・データ未登録時のフォールバック
function getFallbackContext(): string {
  return `# 経営コンテキスト（フォールバック）

## ミッション
中小企業の現場で人の価値を最大化する仕組みを、行動心理学とAIで実装する。

## 最重要KPI
月収300万円をできるだけ早く達成する。

## 判断基準
- 数字より直感を信じる
- 短期売上より関係性を優先
- 既存メンバーを伸ばす > 人を増やす
- 完璧より結果スピード優先
`;
}

// ===========================================================
// Google Calendar 連携 lookup
// ===========================================================

// テナントの「主たる Google Calendar」を引く。
// 優先順位: owner（owner_user_id 一致）の google_calendar_id → 最初に見つかったメンバーの値。
// 未登録なら null（呼び出し側は env GOOGLE_CALENDAR_ID にフォールバックする想定）。
export async function getTenantPrimaryCalendarId(
  tenantId: string,
): Promise<string | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data: tenant } = await sb
    .from("ai_clone_tenants")
    .select("owner_user_id")
    .eq("id", tenantId)
    .maybeSingle();

  // 1. owner の google_calendar_id を最優先
  if (tenant?.owner_user_id) {
    const { data: ownerMember } = await sb
      .from("ai_clone_tenant_members")
      .select("google_calendar_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", tenant.owner_user_id)
      .maybeSingle();
    if (ownerMember?.google_calendar_id) return ownerMember.google_calendar_id;
  }

  // 2. テナント内のどれかのメンバーが連携済みなら、それを使う
  const { data: anyMember } = await sb
    .from("ai_clone_tenant_members")
    .select("google_calendar_id")
    .eq("tenant_id", tenantId)
    .not("google_calendar_id", "is", null)
    .limit(1)
    .maybeSingle();
  return anyMember?.google_calendar_id ?? null;
}

// ===========================================================
// Person 詳細 update（紹介関係を含む全カラム）
// ===========================================================
// 自然文 / Slack 経由で人物の各フィールドを部分更新するための関数。
// undefined のキーは触らない（PATCH 的）。null は明示的にクリア。
// referredByPersonId は同テナントの相手 ID。referredByText は fallback 用テキスト
// （未登録名・有名人など FK 化できない場合）。
export async function updatePersonFull(
  tenantId: string,
  personId: string,
  params: {
    name?: string;
    companyName?: string | null;
    position?: string | null;
    // 2026-05-17 migration 0028: relationship → metContext, challenges → caveats統合
    metContext?: string | null;
    importance?: string | null;       // S / A / B / C
    trustLevel?: string | null;
    temperature?: string | null;
    referredByPersonId?: string | null;
    referredByText?: string | null;   // referred_by (text fallback)
    referredToText?: string | null;   // referred_to (text fallback、表示用)
    interests?: string[] | null;      // multi_select 上書き
    addInterests?: string[];          // 既存 interests に追加（union）
    caveats?: string | null;          // 旧「注意点」と「課題」を統合した「備考」
    nextAction?: string | null;
    birthday?: string | null;         // 生年月日 YYYY-MM-DD（migration 0027）
    birthplace?: string | null;       // 出身地・出生地
    gender?: string | null;           // 男性 / 女性
    industry?: string | null;         // 業種（migration 0045）
  },
): Promise<{ ok: boolean; error?: string }> {
  const sb = adminSupabase();
  if (!sb) return { ok: false, error: "supabase接続不能" };

  const update: Record<string, unknown> = {};
  const setIfDefined = (key: string, value: unknown) => {
    if (value !== undefined) update[key] = value;
  };

  setIfDefined("name", params.name);
  setIfDefined("company_name", params.companyName);
  setIfDefined("position", params.position);
  setIfDefined("met_context", params.metContext);
  setIfDefined("importance", params.importance);
  setIfDefined("trust_level", params.trustLevel);
  setIfDefined("temperature", params.temperature);
  setIfDefined("referred_by_person_id", params.referredByPersonId);
  setIfDefined("referred_by", params.referredByText);
  setIfDefined("referred_to", params.referredToText);
  setIfDefined("caveats", params.caveats);
  setIfDefined("next_action", params.nextAction);
  setIfDefined("birthday", params.birthday);
  setIfDefined("birthplace", params.birthplace);
  setIfDefined("gender", params.gender);
  setIfDefined("industry", params.industry);

  // interests は addInterests があれば現値と union、なければ interests を上書き
  if (params.addInterests && params.addInterests.length > 0) {
    const { data: existing } = await sb
      .from("ai_clone_person")
      .select("interests")
      .eq("tenant_id", tenantId)
      .eq("id", personId)
      .maybeSingle();
    const current: string[] = Array.isArray(existing?.interests)
      ? (existing!.interests as string[])
      : [];
    const merged = Array.from(new Set([...current, ...params.addInterests])).filter(
      (s) => typeof s === "string" && s.trim().length > 0,
    );
    update.interests = merged;
  } else if (params.interests !== undefined) {
    update.interests = params.interests;
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await sb
    .from("ai_clone_person")
    .update(update)
    .eq("tenant_id", tenantId)
    .eq("id", personId);

  if (error) {
    console.error("[ai-clone] Person更新失敗:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// 「指定人物が紹介した相手」一覧。referred_by_person_id を逆引きする。
export async function fetchReferredTo(
  tenantId: string,
  personId: string,
): Promise<Array<{ id: string; name: string }>> {
  const sb = adminSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("ai_clone_person")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("referred_by_person_id", personId);

  if (error) {
    console.error("[ai-clone] 紹介先逆引き失敗:", error.message);
    return [];
  }
  return (data || []).map((r: any) => ({ id: r.id, name: r.name }));
}

// 「指定人物の紹介元」を 1 件取得（FK 解決の最終確認用）。text fallback は呼び出し側で表示する。
export async function fetchReferrer(
  tenantId: string,
  personId: string,
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_person")
    .select("referred_by_person_id, referrer:ai_clone_person!ai_clone_person_referred_by_person_id_fkey(id, name)")
    .eq("tenant_id", tenantId)
    .eq("id", personId)
    .maybeSingle();

  if (error || !data) return null;
  const ref: any = (data as any).referrer;
  if (!ref) return null;
  return { id: ref.id, name: ref.name };
}

// ===========================================================
// Task 系（タスク照会 / 作成 / 完了）
// ===========================================================

// 未完タスク一覧（status が 完了 以外）。due_date 昇順 → null は末尾。
export async function findOpenTasks(
  tenantId: string,
  limit: number = 30,
): Promise<
  Array<{
    id: string;
    name: string;
    dueDate: string | null;
    priority: string | null;
    status: string;
    purpose: string | null;
  }>
> {
  const sb = adminSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("ai_clone_task")
    .select("id, name, due_date, priority, status, purpose")
    .eq("tenant_id", tenantId)
    .neq("status", "完了")
    .is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[ai-clone] OpenTasks取得失敗:", error.message);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    dueDate: r.due_date,
    priority: r.priority,
    status: r.status,
    purpose: r.purpose,
  }));
}

// 名前部分一致でタスクを検索（重複時は呼び出し側で曖昧解決）。
// 一覧表示をそのままコピペした時の注記を除去する。
//   先頭の番号付け「1. 」「3.」「① 」など、
//   末尾の状態/メタ注記「（未着手）」「（完了）」「（期限: … / 優先度: …）」など。
// これらが付いたまま検索すると 0 件ヒットになるため、照合前に落とす。
function stripTaskAnnotations(q: string): string {
  let s = (q ?? "").trim();
  // 先頭の番号（「3. 」「1、」「① 」等。"1.5万" 等を誤爆しないよう後続に空白を要求）
  s = s.replace(/^\s*(?:[0-9０-９]+|[①-⑳])[.．、)）]?\s+/, "");
  // 末尾の状態/メタ注記
  s = s.replace(
    /\s*[（(](?:未着手|着手中|完了|済|期限|期日|優先度)[^）)]*[）)]\s*$/,
    "",
  );
  return s.trim();
}

export async function searchTasksByName(
  tenantId: string,
  query: string,
  limit: number = 5,
  includeTrashed: boolean = false,
): Promise<
  Array<{
    id: string;
    name: string;
    status: string;
    dueDate: string | null;
    deletedAt: string | null;
  }>
> {
  const sb = adminSupabase();
  if (!sb) return [];

  // 一覧コピペ由来の注記（先頭番号・末尾「（未着手）」等）を除去してから照合する。
  const cleaned = stripTaskAnnotations(query);

  const mapRow = (r: any) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    dueDate: r.due_date,
    deletedAt: r.deleted_at ?? null,
  });

  // 完全一致を「部分一致のあいまいさ」より優先する。
  //   例: 「藤野さんにエアコンの価格表」は「…価格表完成させて送る」の部分文字列でもあるが、
  //   名前が完全一致するタスクが1件なら、それを確定で返す（あいまい扱いにしない）。
  type Row = ReturnType<typeof mapRow>;
  const cleanedNorm = normalizeTaskName(cleaned);
  const preferExact = (rows: Row[]): Row[] => {
    if (rows.length <= 1) return rows;
    const exact = rows.filter(
      (r) =>
        r.name.trim() === cleaned.trim() ||
        normalizeTaskName(r.name) === cleanedNorm,
    );
    return exact.length === 1 ? exact : rows;
  };

  // 通常は削除済み（deleted_at 有り）を除外。復元検索のときだけ削除済みも含める。
  let base = sb
    .from("ai_clone_task")
    .select("id, name, status, due_date, deleted_at")
    .eq("tenant_id", tenantId);
  if (!includeTrashed) base = base.is("deleted_at", null);

  const { data, error } = await base
    .ilike("name", `%${cleaned}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[ai-clone] Task検索失敗:", error.message);
    return [];
  }
  if (data && data.length > 0) return preferExact(data.map(mapRow));

  // フォールバック：素の部分一致で0件なら、スペース・助詞・記号を無視した
  // 正規化マッチを試す。「MVV整理」が「MVVを整理した資料の作成」を拾えるようにする。
  const nq = cleanedNorm;
  if (nq.length === 0) return [];
  let fb = sb
    .from("ai_clone_task")
    .select("id, name, status, due_date, deleted_at")
    .eq("tenant_id", tenantId);
  if (!includeTrashed) fb = fb.is("deleted_at", null);
  const { data: all, error: allErr } = await fb
    .order("created_at", { ascending: false })
    .limit(200);
  if (allErr || !all) return [];
  const filtered = all
    .filter(
      (r: any) =>
        typeof r.name === "string" && normalizeTaskName(r.name).includes(nq),
    )
    .map(mapRow);
  if (filtered.length > 0) return preferExact(filtered).slice(0, limit);

  // フォールバック2：人物名トークンに限定したトークン重なり。
  // 目的は「○○さんに話した／会った」のような “人に対する完了発話” を、その人への
  // 約束・タスクへ結びつけること。ただしフォールバックを駆動できるのは
  // 「テナントに実在する人物名」と一致するトークンだけに絞る。
  // ← ありふれた一般語（「議事録」「管理」「連絡」等）が無関係タスクに当たって
  //   誤完了するのを防ぐため（人物でない語は弱すぎて特定にならない）。
  //   一般語の散らばりは上のフォールバック1（連続一致）で安全に拾える範囲に留める。
  const rawTokens = tokenizeTaskQuery(cleaned);
  for (const rawTok of rawTokens) {
    if (rawTok.length < 2) continue;
    // 人物実在チェック：このトークンがテナントの誰かの名前でなければ駆動しない。
    const people = await searchPeopleByName(tenantId, rawTok);
    if (people.length === 0) continue;
    const tok = normalizeTaskName(rawTok);
    if (tok.length < 2) continue;
    const hit = all
      .filter(
        (r: any) =>
          typeof r.name === "string" && normalizeTaskName(r.name).includes(tok),
      )
      .map(mapRow);
    // 複数ヒットは呼び出し側の「候補が複数」ガードで聞き返させる（単一だけ確定）。
    if (hit.length > 0) return preferExact(hit).slice(0, limit);
  }
  return [];
}

// タスク新規作成。人物紐付けは person_tasks リンクテーブルで多対多。
export async function createTaskRecord(
  tenantId: string,
  params: {
    name: string;
    dueDate?: string;
    priority?: string;     // 高 / 中 / 低
    purpose?: string;
    originLog?: string;
    peopleIds?: string[];
  },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    name: params.name,
  };
  if (params.dueDate) row.due_date = params.dueDate;
  if (params.priority) row.priority = params.priority;
  if (params.purpose) row.purpose = params.purpose;
  if (params.originLog) row.origin_log = params.originLog;

  const { data, error } = await sb
    .from("ai_clone_task")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] Task作成失敗:", error?.message);
    return null;
  }

  if (params.peopleIds && params.peopleIds.length > 0) {
    const links = params.peopleIds.map((personId) => ({
      person_id: personId,
      task_id: data.id,
    }));
    await sb
      .from("ai_clone_person_tasks")
      .upsert(links, { onConflict: "person_id,task_id", ignoreDuplicates: true });
  }

  return { id: data.id };
}

// 同名・未完のタスクが直近にあれば更新し、なければ新規作成する。
// 「期限入ってる？」等の確認往復で同じタスクを作り直して重複させないため。
export async function createOrUpdateTaskByName(
  tenantId: string,
  params: {
    name: string;
    dueDate?: string;
    priority?: string;
    purpose?: string;
    originLog?: string;
    peopleIds?: string[];
  },
): Promise<{ id: string; updated: boolean } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  // 同名（完全一致）で未完の直近タスクを探す（削除済みは復活させない）
  const { data: existing } = await sb
    .from("ai_clone_task")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", params.name)
    .neq("status", "完了")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    // 指定された項目だけ上書き（作り直さない）
    const patch: Record<string, unknown> = {};
    if (params.dueDate) patch.due_date = params.dueDate;
    if (params.priority) patch.priority = params.priority;
    if (params.purpose) patch.purpose = params.purpose;
    if (Object.keys(patch).length > 0) {
      await sb.from("ai_clone_task").update(patch).eq("id", existing.id);
    }
    if (params.peopleIds && params.peopleIds.length > 0) {
      const links = params.peopleIds.map((personId) => ({
        person_id: personId,
        task_id: existing.id,
      }));
      await sb
        .from("ai_clone_person_tasks")
        .upsert(links, {
          onConflict: "person_id,task_id",
          ignoreDuplicates: true,
        });
    }
    return { id: existing.id, updated: true };
  }

  const created = await createTaskRecord(tenantId, params);
  return created ? { id: created.id, updated: false } : null;
}

// 日付リマインド（記念日・繰り返し）を1件作成。チャット（handleReminder）から呼ぶ。
export async function createDatedReminderRecord(
  tenantId: string,
  params: {
    title: string;
    baseDate: string; // YYYY-MM-DD
    recurrence: "none" | "yearly" | "monthly" | "milestone";
    milestoneMonths?: number[];
    note?: string;
  },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_dated_reminder")
    .insert({
      tenant_id: tenantId,
      title: params.title,
      base_date: params.baseDate,
      recurrence: params.recurrence,
      milestone_months:
        params.recurrence === "milestone" ? params.milestoneMonths ?? [] : [],
      note: params.note ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] 日付リマインド作成失敗:", error?.message);
    return null;
  }
  return { id: data.id };
}

// 直近・有効な日付リマインドを取得（「○○のリマインド」を特定するため）。
export async function findRecentDatedReminders(
  tenantId: string,
  limit: number = 20,
): Promise<Array<{ id: string; title: string; baseDate: string; active: boolean }>> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_dated_reminder")
    .select("id, title, base_date, active")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    title: r.title,
    baseDate: r.base_date,
    active: r.active,
  }));
}

// 日付リマインドのスナップショット（アンドゥの再作成用）。
export async function getDatedReminderSnapshot(
  tenantId: string,
  id: string,
): Promise<{
  title: string;
  baseDate: string;
  recurrence: "none" | "yearly" | "monthly" | "milestone";
  milestoneMonths: number[];
  note: string | null;
} | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("ai_clone_dated_reminder")
    .select("title, base_date, recurrence, milestone_months, note")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    title: data.title,
    baseDate: data.base_date,
    recurrence: data.recurrence,
    milestoneMonths: data.milestone_months ?? [],
    note: data.note ?? null,
  };
}

// 日付リマインドのフィールドを部分更新（停止は active=false）。
export async function updateDatedReminderFields(
  tenantId: string,
  id: string,
  patch: {
    title?: string;
    baseDate?: string;
    recurrence?: "none" | "yearly" | "monthly" | "milestone";
    note?: string;
    active?: boolean;
  },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.baseDate !== undefined) row.base_date = patch.baseDate;
  if (patch.recurrence !== undefined) row.recurrence = patch.recurrence;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.active !== undefined) row.active = patch.active;
  if (Object.keys(row).length === 0) return true;
  const { error } = await sb
    .from("ai_clone_dated_reminder")
    .update(row)
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] 日付リマインド更新失敗:", error.message);
    return false;
  }
  return true;
}

// 日付リマインドを削除（ハード削除）。アンドゥはスナップショットから再作成。
export async function deleteDatedReminder(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_dated_reminder")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) {
    console.error("[ai-clone] 日付リマインド削除失敗:", error.message);
    return false;
  }
  return true;
}

// タスクのステータスを更新（主に完了化）。
export async function updateTaskStatus(
  tenantId: string,
  taskId: string,
  status: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from("ai_clone_task")
    .update({ status })
    .eq("tenant_id", tenantId)
    .eq("id", taskId);

  if (error) {
    console.error("[ai-clone] Task状態更新失敗:", error.message);
    return false;
  }
  return true;
}

// タスクの期限を変更する（リスケ）。Slack「○○を金曜まで」等から呼ぶ。
export async function updateTaskDueDate(
  tenantId: string,
  taskId: string,
  dueDate: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_task")
    .update({ due_date: dueDate })
    .eq("tenant_id", tenantId)
    .eq("id", taskId);
  if (error) {
    console.error("[ai-clone] Task期限変更失敗:", error.message);
    return false;
  }
  return true;
}

// タスク名（内容）を変更する。Slack「○○の件、△△に直して」等から呼ぶ。
export async function updateTaskName(
  tenantId: string,
  taskId: string,
  name: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_task")
    .update({ name })
    .eq("tenant_id", tenantId)
    .eq("id", taskId);
  if (error) {
    console.error("[ai-clone] Task名変更失敗:", error.message);
    return false;
  }
  return true;
}

// タスクの優先度を変更する（高/中/低）。Slack「○○優先度上げて」「△△緊急で」等から呼ぶ。
export async function updateTaskPriority(
  tenantId: string,
  taskId: string,
  priority: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_task")
    .update({ priority })
    .eq("tenant_id", tenantId)
    .eq("id", taskId);
  if (error) {
    console.error("[ai-clone] Task優先度変更失敗:", error.message);
    return false;
  }
  return true;
}

// タスクを削除する（やめる）＝ソフト削除。deleted_at を打つだけにして「戻して」で
// 復元できるようにする。person_tasks リンクは残す（復元時にそのまま戻る）。
export async function deleteTask(
  tenantId: string,
  taskId: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_task")
    .update({ deleted_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", taskId);
  if (error) {
    console.error("[ai-clone] Task削除失敗:", error.message);
    return false;
  }
  return true;
}

// ソフト削除したタスクを復元する（「○○戻して」やアンドゥから）。
export async function restoreTask(
  tenantId: string,
  taskId: string,
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_clone_task")
    .update({ deleted_at: null })
    .eq("tenant_id", tenantId)
    .eq("id", taskId);
  if (error) {
    console.error("[ai-clone] Task復元失敗:", error.message);
    return false;
  }
  return true;
}

// タスク1件の現在値を取得（アンドゥの before 状態の保存用）。
export async function getTaskById(
  tenantId: string,
  taskId: string,
): Promise<{
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  priority: string | null;
  deletedAt: string | null;
} | null> {
  const sb = adminSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("ai_clone_task")
    .select("id, name, status, due_date, priority, deleted_at")
    .eq("tenant_id", tenantId)
    .eq("id", taskId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    dueDate: data.due_date,
    priority: data.priority,
    deletedAt: data.deleted_at,
  };
}

// 任意フィールドの上書き（null も含めて戻せるようアンドゥから使う）。
export async function updateTaskFields(
  tenantId: string,
  taskId: string,
  patch: { name?: string; status?: string; dueDate?: string | null; priority?: string | null },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (Object.keys(row).length === 0) return true;
  const { error } = await sb
    .from("ai_clone_task")
    .update(row)
    .eq("tenant_id", tenantId)
    .eq("id", taskId);
  if (error) {
    console.error("[ai-clone] Taskフィールド更新失敗:", error.message);
    return false;
  }
  return true;
}

// 直前操作（アンドゥ用）をテナントごと最新1件で保存（upsert）。
// タスク系は taskId+before、追記ログ系（会話/紹介/リマインド/判断事例）は
// 削除=snapshot から再作成 / 編集=fieldsBefore へ復元、で戻す。
export type UndoEntity = "conversation" | "referral" | "reminder" | "decision";
export type UndoPayload = {
  op:
    | "complete"
    | "reschedule"
    | "delete"
    | "create"
    | "priority"
    | "rename"
    | "log_delete"
    | "log_edit"
    | "log_create" // 追記ログを新規作成した → 取り消し=作成した record を削除
    | "person_create"; // 人物を新規作成した → 取り消し=その人物を削除
  label: string;
  // --- タスク系 ---
  taskId?: string;
  before?: {
    status?: string;
    dueDate?: string | null;
    priority?: string | null;
    name?: string;
  };
  // --- 追記ログ系（log_delete / log_edit / log_create） ---
  entity?: UndoEntity;
  recordId?: string; // log_edit / log_create の対象id
  snapshot?: Record<string, unknown>; // log_delete の再作成データ
  fieldsBefore?: Record<string, unknown>; // log_edit の復元前フィールド
  // --- 人物 ---
  personId?: string; // person_create の対象id
};
// 1メッセージ分の操作をバッチで保持する。各 executor から呼ぶと配列に追記され、
// 「（さっきの）全部取り消して」で直前メッセージの全変更をまとめて戻せる。
export async function recordUndo(
  tenantId: string,
  action: UndoPayload,
): Promise<void> {
  const sb = adminSupabase();
  if (!sb) return;
  const { data } = await sb
    .from("ai_clone_undo")
    .select("payload")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const prev = data?.payload as { actions?: UndoPayload[] } | null;
  const existing = Array.isArray(prev?.actions) ? (prev!.actions as UndoPayload[]) : [];
  const actions = [...existing, action];
  const { error } = await sb
    .from("ai_clone_undo")
    .upsert(
      { tenant_id: tenantId, payload: { actions }, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id" },
    );
  if (error) console.error("[ai-clone] Undo記録失敗:", error.message);
}

// 直前メッセージのバッチ（操作の配列）を返す。
export async function readUndoBatch(tenantId: string): Promise<UndoPayload[]> {
  const sb = adminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("ai_clone_undo")
    .select("payload")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error || !data) return [];
  const prev = data.payload as { actions?: UndoPayload[] } | null;
  return Array.isArray(prev?.actions) ? (prev!.actions as UndoPayload[]) : [];
}

export async function clearUndo(tenantId: string): Promise<void> {
  const sb = adminSupabase();
  if (!sb) return;
  await sb.from("ai_clone_undo").delete().eq("tenant_id", tenantId);
}

// ===========================================================
// ヘルパー
// ===========================================================

function todayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
