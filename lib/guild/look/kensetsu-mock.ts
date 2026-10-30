// 建設・不動産の酒場「相談する → 追跡 → 管理者が渡す」の全体モック（段階0・DBなし）の、仮データと決まりの唯一の場所。
// 種類5つ・時期4つ・状態の順番・送れる件数・仮の会員/渡し先/相談は、画面もテストもここを読む（画面に書き写さない）。
// 仕様：contexts/projects/gia/sakaba_kensetsu_flow_spec.md「段階0」。本番の画面・DBには一切つながらない。
// 人名・会社名はすべて架空（仮）。

import { STORES } from "../stores";

/** モック画面の道のもと。店の道（/guild/…）ではない */
export const KENSETSU_BASE = "/guild-look/kensetsu";

/** 本物の建設・不動産の店の設定（lib/guild/stores.ts）。slug を決め打ちせず、見た目が plain の店として引く。
 *  モックの外枠は、この店と同じ data-store / data-theme を当てて、本物と同じ色・形にする */
export const MOCK_STORE = Object.values(STORES).find((s) => s.theme === "plain");
export const MOCK_STORE_NAME = MOCK_STORE?.name ?? "";

// ---------- 見る人（モック専用のつまみ） ----------

export type Role = "requester" | "member" | "admin";

export const ROLES: readonly { key: Role; label: string; /** 切り替えたときに最初に開く道 */ home: string; personaId: string }[] = [
  { key: "requester", label: "会員（不動産）", home: "", personaId: "m-tanaka" },
  { key: "member", label: "会員（工務店）", home: "", personaId: "m-yamamoto" },
  { key: "admin", label: "管理者", home: "/master", personaId: "m-admin" },
];

export const DEFAULT_ROLE: Role = "requester";

/** URL の ?as= を読む。知らない値は既定の見る人 */
export function parseRole(value: string | null | undefined): Role {
  return ROLES.find((r) => r.key === value)?.key ?? DEFAULT_ROLE;
}

export function roleInfo(role: Role) {
  return ROLES.find((r) => r.key === role) ?? ROLES[0];
}

// ---------- 相談の種類（5つ）・時期（4つ） ----------

export type KindKey = "construction" | "vendor" | "land" | "subsidy" | "other";

export const KINDS: readonly { key: KindKey; label: string; note: string }[] = [
  { key: "construction", label: "工事を頼みたい", note: "新築・リフォーム・修繕" },
  { key: "vendor", label: "業者・職人を探している", note: "下請け・協力会社・人手" },
  { key: "land", label: "土地・物件のこと", note: "免許のある会社へおつなぎします" },
  { key: "subsidy", label: "補助金・資金のこと", note: "" },
  { key: "other", label: "その他", note: "" },
];

export function kindLabel(key: string): string {
  return KINDS.find((k) => k.key === key)?.label ?? "その他";
}

export function isKindKey(value: string | null | undefined): value is KindKey {
  return KINDS.some((k) => k.key === value);
}

export type TimingKey = "now" | "month" | "quarter" | "relaxed";

export const TIMINGS: readonly { key: TimingKey; label: string }[] = [
  { key: "now", label: "すぐ" },
  { key: "month", label: "今月中" },
  { key: "quarter", label: "3か月以内" },
  { key: "relaxed", label: "急がない" },
];

export function timingLabel(key: string): string {
  return TIMINGS.find((t) => t.key === key)?.label ?? "";
}

// ---------- 状態（進む向きだけ） ----------

export type Status = "received" | "reviewed" | "passed" | "connected" | "declined" | "withdrawn";

/** 追跡の線の4段（この順にだけ進む） */
export const STATUS_FLOW: readonly Status[] = ["received", "reviewed", "passed", "connected"];

/** 状態を進められる行き先。ここに無い動きは止める（戻す・飛ばす）。
 *  received → passed は「確認」と「渡す」を同時に行う（受付箱から直接渡すとき） */
const ALLOWED_NEXT: Readonly<Record<Status, readonly Status[]>> = {
  received: ["reviewed", "passed", "declined", "withdrawn"],
  reviewed: ["passed", "declined", "withdrawn"],
  passed: ["connected", "declined"],
  connected: [],
  declined: [],
  withdrawn: [],
};

export function canTransition(from: Status, to: Status): boolean {
  return ALLOWED_NEXT[from].includes(to);
}

/** 出した人が取り下げられるのは、受け付け〜確認まで */
export function canWithdraw(status: Status): boolean {
  return canTransition(status, "withdrawn");
}

export function isOpen(status: Status): boolean {
  return status === "received" || status === "reviewed" || status === "passed";
}

/** 管理者の受付箱のタブ。新着＝まだ渡していない／渡した／終わった */
export type InboxTab = "new" | "passed" | "closed";

export const INBOX_TABS: readonly { key: InboxTab; label: string }[] = [
  { key: "new", label: "新着" },
  { key: "passed", label: "渡した" },
  { key: "closed", label: "終わった" },
];

export function inboxTabOf(status: Status): InboxTab {
  if (status === "received" || status === "reviewed") return "new";
  if (status === "passed") return "passed";
  return "closed";
}

// ---------- 出せる件数・文字数 ----------

/** 1人が24時間に出せる相談の数（エンタープライズの相談と同じ） */
export const SEND_LIMIT = { count: 3, windowHours: 24 } as const;
export const BODY_MAX = 1000;
export const PHOTO_MAX = 3;
export const DEFAULT_PREFECTURE = "大阪府";

export const LAND_NOTICE = "土地・物件のご相談は、管理者が免許のある会社へおつなぎします";
/** 管理者の受付箱・中身に出す、渡し先の選び方の一行 */
export const LAND_ADMIN_NOTICE = "土地・物件は、免許のある会社へ渡します";
export const CONSENT_TEXT = "相談の内容と連絡先を、管理者が選んだ会社・会員に伝えることに同意する";
/** 受ける人の画面で、相談した人の名前の代わりに出す */
export const MASKED_REQUESTER = "相談した人の名前は、管理者がつなぐまで伏せています";

export const FLOW_STEPS = [
  { key: "where", title: "どこですか？" },
  { key: "when", title: "いつまでに？" },
  { key: "detail", title: "詳しく" },
] as const;

// ---------- 都道府県・業種・得意な工事 ----------

export const REGIONS: readonly { label: string; prefectures: readonly string[] }[] = [
  { label: "北海道・東北", prefectures: ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
  { label: "関東", prefectures: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"] },
  { label: "中部", prefectures: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"] },
  { label: "近畿", prefectures: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"] },
  { label: "中国・四国", prefectures: ["鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県"] },
  { label: "九州・沖縄", prefectures: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] },
];

export const PREFECTURES: readonly string[] = REGIONS.flatMap((r) => r.prefectures);

/** 業種。kinds＝その業種の人に「届いた相談」として見せる相談の種類 */
export const INDUSTRIES: readonly { key: string; label: string; kinds: readonly KindKey[] }[] = [
  { key: "roof", label: "屋根・外壁", kinds: ["construction", "vendor", "other"] },
  { key: "interior", label: "内装・リフォーム", kinds: ["construction", "vendor", "other"] },
  { key: "equipment", label: "設備・電気", kinds: ["construction", "vendor", "other"] },
  { key: "realestate", label: "不動産の仲介・管理", kinds: ["land", "other"] },
  { key: "finance", label: "補助金・資金", kinds: ["subsidy", "other"] },
];

export function industryLabel(key: string): string {
  return INDUSTRIES.find((i) => i.key === key)?.label ?? "";
}

export const WORK_TYPES: readonly string[] = ["屋根", "外壁塗装", "雨漏り", "内装", "水まわり", "電気", "解体", "外構", "店舗改装", "賃貸管理"];

// ---------- 会員・渡し先（仮） ----------

export type Member = {
  id: string;
  name: string;
  company: string;
  industry: string;
  areas: readonly string[];
  hasConstructionLicense: boolean;
  hasRealEstateLicense: boolean;
  works: readonly string[];
  contact: string;
  // ここから下は自由に書く欄（空なら出さない）。実績写真は選びにくいのでやめ、「伝えたいこと」に書いてもらう（10-29）
  headline?: string;
  /** 伝えたいこと（実績・強みなど）。本番では店ごとのプロフィールの bio */
  message?: string;
  /** 伝えたいことに添える写真（任意・PHOTO_MAX 枚まで）。Object URL はこの画面の中だけ */
  photos?: readonly Photo[];
  lookingFor?: string;
  hometown?: string;
  hobbies?: string;
  lifeStory?: string;
};

// プロフィールの文字数の上限（本番のDBの上限に合わせる）
export const PROFILE_TEXT_MAX = { headline: 40, message: 1200, lookingFor: 1200, hometown: 80, hobbies: 300, lifeStory: 1200 } as const;

export const MEMBERS: readonly Member[] = [
  { id: "m-tanaka", name: "田中さん", company: "田中管理サービス（仮）", industry: "realestate", areas: ["大阪府"], hasConstructionLicense: false, hasRealEstateLicense: true, works: ["賃貸管理"], contact: "LINE（仮）", headline: "大阪市内の賃貸管理をしています" },
  { id: "m-yamamoto", name: "山本さん", company: "山本工務店（仮）", industry: "roof", areas: ["大阪府", "兵庫県"], hasConstructionLicense: true, hasRealEstateLicense: false, works: ["屋根", "外壁塗装", "雨漏り"], contact: "LINE（仮）", headline: "屋根と雨漏りなら、まず相談ください", message: "大阪・兵庫で屋根工事を25年（仮）。雨漏りは原因を見つけるところから入ります。年に80件ほど（仮）。小さな修理でも伺います。", lookingFor: "外壁塗装の職人さん・空き家の持ち主とつながっている方", hometown: "堺市", hobbies: "釣り・草野球", lifeStory: "父の工務店を継いで2代目（仮）。", photos: [{ id: "m-yamamoto-p1", name: "写真" }, { id: "m-yamamoto-p2", name: "写真" }] },
  { id: "m-ito", name: "伊藤さん", company: "伊藤内装（仮）", industry: "interior", areas: ["大阪府", "京都府"], hasConstructionLicense: true, hasRealEstateLicense: false, works: ["内装", "店舗改装"], contact: "電話（仮）" },
  { id: "m-saito", name: "斎藤さん", company: "斎藤設備（仮）", industry: "equipment", areas: ["大阪府", "奈良県"], hasConstructionLicense: true, hasRealEstateLicense: false, works: ["水まわり", "電気"], contact: "LINE（仮）" },
  { id: "m-kato", name: "加藤さん", company: "加藤不動産（仮）", industry: "realestate", areas: ["大阪府", "兵庫県"], hasConstructionLicense: false, hasRealEstateLicense: true, works: ["賃貸管理"], contact: "電話（仮）" },
  { id: "m-matsuda", name: "松田さん", company: "松田経営支援（仮）", industry: "finance", areas: ["大阪府", "京都府", "兵庫県"], hasConstructionLicense: false, hasRealEstateLicense: false, works: [], contact: "メール（仮）" },
  { id: "m-admin", name: "管理者", company: "建設・不動産の酒場 運営（仮）", industry: "", areas: ["大阪府"], hasConstructionLicense: false, hasRealEstateLicense: false, works: [], contact: "LINE（仮）" },
];

export type Partner = {
  id: string;
  name: string;
  kinds: readonly KindKey[];
  hasConstructionLicense: boolean;
  hasRealEstateLicense: boolean;
  /** 連絡の方法のメモ */
  contactNote: string;
};

/** 渡し先。本番では SQL で行を足す（登録の画面は作らない）。許可・免許は表示用の印で、渡すのは止めない */
export const PARTNERS: readonly Partner[] = [
  { id: "p-welltech", name: "ウェルテック（仮）", kinds: ["construction", "vendor", "other"], hasConstructionLicense: true, hasRealEstateLicense: false, contactNote: "担当者のLINEへ。返事は2日以内が目安（仮）" },
  { id: "p-miyako", name: "MIYAKO（仮）", kinds: ["land", "other"], hasConstructionLicense: false, hasRealEstateLicense: true, contactNote: "代表のLINEへ（仮）" },
  { id: "p-subsidy", name: "補助金の協力先（仮）", kinds: ["subsidy", "other"], hasConstructionLicense: false, hasRealEstateLicense: false, contactNote: "メールで要約を送る（仮）" },
];

/** 渡す相手（渡し先 or 手を挙げた会員）を同じ形で扱う */
export type Receiver = {
  id: string;
  name: string;
  hasConstructionLicense: boolean;
  hasRealEstateLicense: boolean;
  contactNote: string;
  source: "partner" | "member";
};

export function receiverFromPartner(p: Partner): Receiver {
  return { id: p.id, name: p.name, hasConstructionLicense: p.hasConstructionLicense, hasRealEstateLicense: p.hasRealEstateLicense, contactNote: p.contactNote, source: "partner" };
}

export function receiverFromMember(m: Member): Receiver {
  return { id: m.id, name: m.company, hasConstructionLicense: m.hasConstructionLicense, hasRealEstateLicense: m.hasRealEstateLicense, contactNote: m.contact, source: "member" };
}

export function findReceiver(id: string | undefined, members: readonly Member[] = MEMBERS): Receiver | null {
  if (!id) return null;
  const partner = PARTNERS.find((p) => p.id === id);
  if (partner) return receiverFromPartner(partner);
  const member = members.find((m) => m.id === id);
  return member ? receiverFromMember(member) : null;
}

/** 種類に合う渡し先（受付箱のボタン） */
export function partnersForKind(kind: KindKey): Partner[] {
  return PARTNERS.filter((p) => p.kinds.includes(kind));
}

// ---------- 相談・お知らせ ----------

export type Photo = { id: string; name: string; /** 選んだ画像の Object URL。仮データは無し */ url?: string };

export type Referral = {
  id: string;
  requesterId: string;
  kind: KindKey;
  prefecture: string;
  city: string;
  timing: TimingKey;
  body: string;
  photos: readonly Photo[];
  status: Status;
  createdAt: number;
  reviewedAt?: number;
  passedAt?: number;
  connectedAt?: number;
  closedAt?: number;
  withdrawnAt?: number;
  passedToId?: string;
  /** 見送りのときの、管理者のひとこと */
  closeNote?: string;
  /** 「話を聞きたい」を押した会員 */
  interestedIds: readonly string[];
};

export type NoticeKind = "referral_received" | "referral_progress" | "hand_reply";

export type Notice = {
  id: string;
  /** 届く会員 */
  forMemberId: string;
  kind: NoticeKind;
  text: string;
  at: number;
  referralId: string;
  read: boolean;
};

const jst = (day: number, hour: number, minute = 0) =>
  Date.parse(`2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`);

/** モック上の「いま」の起点（2026-10-26 12:00 JST）。表示はこれに揃えて固定し、サーバーと画面で食い違わせない */
export const MOCK_NOW_BASE = jst(26, 12);

const ph = (id: string, n: number): Photo[] => Array.from({ length: n }, (_, i) => ({ id: `${id}-p${i + 1}`, name: "写真" }));

export const SEED_REFERRALS: readonly Referral[] = [
  {
    id: "r1", requesterId: "m-tanaka", kind: "construction", prefecture: "大阪府", city: "堺市", timing: "month",
    body: "倉庫の屋根から雨漏りがしています。次の雨までに見てもらえる会社を探しています。",
    photos: ph("r1", 2), status: "passed", createdAt: jst(26, 9, 12), reviewedAt: jst(26, 10, 40), passedAt: jst(26, 11, 20), passedToId: "p-welltech", interestedIds: ["m-yamamoto"],
  },
  {
    id: "r2", requesterId: "m-nakamura", kind: "land", prefecture: "大阪府", city: "東大阪市", timing: "quarter",
    body: "工場の隣の土地を買いたいです。売りに出ていないか、持ち主に聞いてもらえませんか。",
    photos: [], status: "reviewed", createdAt: jst(26, 8, 30), reviewedAt: jst(26, 9, 10), interestedIds: [],
  },
  {
    id: "r3", requesterId: "m-kobayashi", kind: "subsidy", prefecture: "大阪府", city: "八尾市", timing: "relaxed",
    body: "ものづくり補助金が、うちの設備投資にも使えるか知りたいです。",
    photos: [], status: "received", createdAt: jst(25, 17, 5), interestedIds: [],
  },
  {
    id: "r4", requesterId: "m-tanaka", kind: "vendor", prefecture: "大阪府", city: "大阪市", timing: "quarter",
    body: "賃貸マンションの退去後の原状回復を、まとめて頼める内装業者を探しています。",
    photos: ph("r4", 1), status: "reviewed", createdAt: jst(24, 15, 0), reviewedAt: jst(24, 18, 30), interestedIds: ["m-ito"],
  },
  {
    id: "r5", requesterId: "m-tanaka", kind: "subsidy", prefecture: "大阪府", city: "大阪市", timing: "relaxed",
    body: "空き家を改修して貸す場合に使える補助制度があれば教えてほしいです。",
    photos: [], status: "connected", createdAt: jst(15, 10, 0), reviewedAt: jst(15, 11, 0), passedAt: jst(16, 9, 30), passedToId: "p-subsidy", connectedAt: jst(18, 14, 0), closedAt: jst(18, 14, 0), interestedIds: [],
  },
  {
    id: "r6", requesterId: "m-sasaki", kind: "construction", prefecture: "大阪府", city: "吹田市", timing: "relaxed",
    body: "店舗の雨どいを交換したいです。2階まで届く高さがあります。",
    photos: ph("r6", 1), status: "reviewed", createdAt: jst(23, 13, 0), reviewedAt: jst(23, 16, 0), interestedIds: ["m-yamamoto"],
  },
  {
    id: "r7", requesterId: "m-hayashi", kind: "construction", prefecture: "大阪府", city: "大阪市東成区", timing: "quarter",
    body: "築30年のアパートの外壁の塗り替えを考えています。見積もりをお願いしたいです。",
    photos: ph("r7", 3), status: "reviewed", createdAt: jst(25, 9, 40), reviewedAt: jst(25, 11, 0), interestedIds: [],
  },
  {
    id: "r8", requesterId: "m-tanaka", kind: "other", prefecture: "大阪府", city: "", timing: "relaxed",
    body: "所有している古い建物の相続について、相談できる人を探しています。",
    photos: [], status: "declined", createdAt: jst(10, 11, 0), reviewedAt: jst(10, 13, 0), closedAt: jst(11, 10, 0),
    closeNote: "相続のご相談は、この場では適した相手が見つかりませんでした。専門の士業の窓口をご案内します。", interestedIds: [],
  },
];

/** 相談した人（会員一覧にいない人は名前だけ。画面では管理者にだけ出す） */
const EXTRA_REQUESTER_NAMES: Readonly<Record<string, string>> = {
  "m-nakamura": "中村さん",
  "m-kobayashi": "小林さん",
  "m-sasaki": "佐々木さん",
  "m-hayashi": "林さん",
};

export function requesterName(id: string, members: readonly Member[] = MEMBERS): string {
  return members.find((m) => m.id === id)?.name ?? EXTRA_REQUESTER_NAMES[id] ?? "会員";
}

export const SEED_NOTICES: readonly Notice[] = [
  { id: "n1", forMemberId: "m-tanaka", kind: "referral_progress", text: "「倉庫の屋根から雨漏りがしています。」が、ウェルテック（仮）に相談中に進みました", at: jst(26, 11, 20), referralId: "r1", read: false },
  { id: "n2", forMemberId: "m-tanaka", kind: "referral_progress", text: "「倉庫の屋根から雨漏りがしています。」を、管理者が確認しました", at: jst(26, 10, 40), referralId: "r1", read: true },
  { id: "n3", forMemberId: "m-yamamoto", kind: "hand_reply", text: "手を挙げた「店舗の雨どいを交換したいです。」は、管理者が確認中です。返事までお待ちください", at: jst(23, 16, 0), referralId: "r6", read: false },
  { id: "n4", forMemberId: "m-admin", kind: "referral_received", text: "新しい相談が届きました（土地・物件・東大阪市）", at: jst(26, 8, 30), referralId: "r2", read: false },
  { id: "n5", forMemberId: "m-admin", kind: "referral_received", text: "新しい相談が届きました（工事を頼みたい・大阪市東成区）", at: jst(25, 9, 40), referralId: "r7", read: true },
];

// ---------- 画面の振る舞いの小さな決まり（テストが読む） ----------

/** 時刻を「10月26日 9:12」の形に（日本時間で固定。サーバーと画面で同じ文字になる） */
export function formatJst(ms: number): string {
  const parts = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms));
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("month")}月${pick("day")}日 ${pick("hour")}:${pick("minute")}`;
}

/** 一覧に出す1行目（本文の最初の一文を短く） */
export function summaryOf(body: string, max = 28): string {
  const first = body.trim().split(/[。\n]/)[0] ?? "";
  return first.length > max ? `${first.slice(0, max)}…` : first;
}

/** 場所の表示（都道府県＋市区町村。市区町村が空なら都道府県だけ） */
export function placeOf(r: Pick<Referral, "prefecture" | "city">): string {
  return r.city.trim() ? r.city.trim() : r.prefecture;
}

/** 24時間に出せる残りの件数（取り下げた分も数える） */
export function remainingSends(referrals: readonly Referral[], requesterId: string, now: number): number {
  const since = now - SEND_LIMIT.windowHours * 3600 * 1000;
  const used = referrals.filter((r) => r.requesterId === requesterId && r.createdAt > since).length;
  return Math.max(0, SEND_LIMIT.count - used);
}

/** 送るのに失敗した理由。原因ごとに文言を分ける（1つの「送れませんでした」にまとめない） */
export type SendFailure = "limit" | "network" | "other";

export const SEND_FAILURE_MESSAGES: Readonly<Record<SendFailure, { title: string; message: string }>> = {
  limit: { title: "今日は、これ以上は送れません", message: `相談は、24時間に${SEND_LIMIT.count}件までです。時間をおいてから、もう一度お試しください。入力した内容は残してあります。` },
  network: { title: "通信がうまくいきませんでした", message: "電波の良い場所で、もう一度送ってください。入力した内容は残してあります。" },
  other: { title: "送れませんでした", message: "原因が分かりませんでした。少し待ってからもう一度お試しください。何度も出る場合は管理者にお知らせください。入力した内容は残してあります。" },
};

/** 渡す前の注意（1行）。土地・物件を、宅建免許の印が無い先へ渡すとき。止めはしない */
export function passWarning(kind: KindKey, receiver: Pick<Receiver, "name" | "hasRealEstateLicense">): string | null {
  if (kind !== "land" || receiver.hasRealEstateLicense) return null;
  return `${receiver.name}には宅建免許の印がありません。土地・物件の相談です。`;
}

export function licenseMarks(r: Pick<Receiver, "hasConstructionLicense" | "hasRealEstateLicense">): { label: string; on: boolean }[] {
  return [
    { label: "建設業許可", on: r.hasConstructionLicense },
    { label: "宅建免許", on: r.hasRealEstateLicense },
  ];
}

/** 会員の「案件」に出すか（管理者が確認済みで、まだ渡す前・業種とエリアが合い・自分の相談ではない）。
 *  出された相談は、管理者が開いて確認するまで会員には見せない（10-30 五島さん：相談と案件を一本に） */
export function matchesMember(r: Referral, m: Pick<Member, "id" | "industry" | "areas">): boolean {
  const industry = INDUSTRIES.find((i) => i.key === m.industry);
  if (!industry) return false;
  return r.requesterId !== m.id && r.status === "reviewed" && industry.kinds.includes(r.kind) && m.areas.includes(r.prefecture);
}

/** 渡す文面（管理者がコピー／LINEで送る。アプリからは自動で送らない） */
export function buildPassMessage(r: Referral, receiver: Pick<Receiver, "name">, requester: string): string {
  return [
    `${receiver.name} 様`,
    "",
    "建設・不動産の酒場より、ご相談をお渡しします。",
    "",
    `種類：${kindLabel(r.kind)}`,
    `場所：${r.prefecture}${r.city.trim()}`,
    `時期：${timingLabel(r.timing)}`,
    `相談した方：${requester}`,
    `連絡先：登録のLINE（仮）`,
    "",
    "【ご相談の内容】",
    r.body.trim(),
    r.photos.length > 0 ? `\n写真：${r.photos.length}枚（管理者から別にお送りします）` : "",
    "",
    "お返事は、管理者までお願いします。",
  ].join("\n").replace(/\n{3,}/g, "\n\n");
}

/** 入力の確認（空のまま次へ進めない。理由は画面に赤字で出す） */
export type DraftStepError = { field: "prefecture" | "timing" | "body"; message: string };

export function validateStep(step: number, draft: { prefecture: string; timing: string; body: string }): DraftStepError | null {
  if (step === 1 && !draft.prefecture) return { field: "prefecture", message: "都道府県を選んでください" };
  if (step === 2 && !TIMINGS.some((t) => t.key === draft.timing)) return { field: "timing", message: "いつまでに、を1つ選んでください" };
  if (step === 3) {
    if (!draft.body.trim()) return { field: "body", message: "ご相談の内容を入れてください（声で入れても大丈夫です）" };
    if (draft.body.length > BODY_MAX) return { field: "body", message: `${BODY_MAX}字までです` };
  }
  return null;
}

/** 追跡の線で「どこまで進んだか」（4段のうち何段目まで塗るか）。見送り・取り下げは 0（線の代わりに文を出す） */
export function reachedSteps(status: Status): number {
  const index = STATUS_FLOW.indexOf(status);
  return index < 0 ? 0 : index + 1;
}

/** 一覧・追跡に出す、いまの状態の一文 */
export function statusText(r: Pick<Referral, "status" | "passedToId">, members: readonly Member[] = MEMBERS): string {
  switch (r.status) {
    case "received": return "受け付けました";
    case "reviewed": return "管理者が確認しました";
    case "passed": return `${findReceiver(r.passedToId, members)?.name ?? "渡し先"}に相談中`;
    case "connected": return "つながりました";
    case "declined": return "見送りになりました";
    case "withdrawn": return "取り下げました";
  }
}
