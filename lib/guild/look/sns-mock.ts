import { matchesBusinessKeywords, matchesOtherBusiness, type Profession } from "./sns-expertise";
import { DEFAULT_NET_LEVEL, INTRO_NOTE_MAX, feeText, levelOf, roleClass, type IntroEvent, type IntroRecord, type NetLevel, type NetSettings } from "./sns-network";
import { matchesEstate, type EstateBusiness, type EstateTransaction, type EstateProperty, matchesConstruction, type ConstructionWork, type ConstructionTrade, type PermitFilter } from "./sns-construction";

// 建設・不動産の酒場の作り直し（人脈ネットワークSNS）の見本（DBなし）の仮データと、つながりの計算。
// 仕様：contexts/projects/gia/sakaba_kensetsu_sns_spec_v0.1.md。本物の /guild/<店> の画面・DBとは関係しない。
// 画面はここの値と関数だけを読む（同じ計算を画面ごとに書かない）。

// 紹介のおねがいの「ひとこと」の上限は sns-network.ts に置く（ここから読めるようにしている）
export { INTRO_NOTE_MAX };

export const SNS_BASE = "/guild-look/sns";
export const SNS_NAME = "建設・不動産の酒場";

/** 見本の上で切り替える色（10-31：23「紹介の道＋地域」。藍が既定・深緑は見比べ用）。値は sns.css の [data-palette] */
export const PALETTES = [
  { key: "ai", label: "藍" },
  { key: "fukamidori", label: "深緑" },
] as const;
export type PaletteKey = (typeof PALETTES)[number]["key"];
export const DEFAULT_PALETTE: PaletteKey = "ai";

export const INDUSTRIES = ["建設", "不動産", "士業", "その他"] as const;
export type Industry = (typeof INDUSTRIES)[number];

/** 業種の色・印の呼び名（sns.css の data-kind と lucide の印がこれで決まる）。「me」は自分だけ */
export type KindKey = "build" | "estate" | "pro" | "other" | "me";
export const INDUSTRY_KIND: Readonly<Record<Industry, Exclude<KindKey, "me">>> = {
  建設: "build",
  不動産: "estate",
  士業: "pro",
  その他: "other",
};

/** 探すときの地域のまとまり（8つ）。対応エリアは都道府県で持ち、ここで束ねる。並びはチップの並び（北から南） */
export const REGIONS: Readonly<Record<string, readonly string[]>> = {
  北海道: ["北海道"],
  東北: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  関東: ["東京都", "神奈川県", "埼玉県", "千葉県", "茨城県", "栃木県", "群馬県"],
  中部: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"],
  関西: ["大阪府", "京都府", "兵庫県", "奈良県", "滋賀県", "和歌山県", "三重県"],
  中国: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
  四国: ["徳島県", "香川県", "愛媛県", "高知県"],
  九州: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"],
};
export const REGION_NAMES = Object.keys(REGIONS);
export const PREFECTURES = Object.values(REGIONS).flat();

/** 都道府県（または地域の名前）→ 地域。どちらで持っていても同じ地域にそろえる（案件の入力は地域名、仮データは都道府県） */
export function regionOf(area: string): string | null {
  if (area in REGIONS) return area;
  return REGION_NAMES.find((r) => REGIONS[r].includes(area)) ?? null;
}

/** 連絡先を見せる相手。項目ごとに本人が選ぶ（設計書7：連絡先を本人の許可なく公開しない）。初期値は知り合いだけ */
export const REVEALS = [
  { key: "all", label: "全員に見せる" },
  { key: "friends", label: "知り合いだけ" },
  { key: "hidden", label: "見せない" },
] as const;
export type Reveal = (typeof REVEALS)[number]["key"];

export function revealLabel(key: Reveal): string {
  return REVEALS.find((r) => r.key === key)?.label ?? "";
}

export type CompanyReveal = Readonly<Record<"street" | "phone" | "fax" | "email", Reveal>>;
export type PersonReveal = Readonly<Record<"phone" | "email", Reveal>>;

const DEFAULT_COMPANY_REVEAL: CompanyReveal = { street: "friends", phone: "friends", fax: "friends", email: "friends" };
const DEFAULT_PERSON_REVEAL: PersonReveal = { phone: "friends", email: "friends" };

/** 許可・免許・登録。自己申告と確認済みを混同しない（設計書5-2） */
/** number は名刺に書く並び（許可行政庁・番号）。見本の番号は架空 */
export type License = { name: string; number?: string; verified: boolean };

export type Company = {
  id: string;
  name: string;
  kana: string;
  /** ロゴの代わりの1文字 */
  mark: string;
  postalCode: string;
  /** 所在地。都道府県・市区町村まではだれにでも見える（「所在地」で探すときも prefecture を使う） */
  prefecture: string;
  city: string;
  /** 番地・電話・FAX・メールを見せる相手は reveal で項目ごとに決める（郵便番号は番地と同じ） */
  street: string;
  phone: string;
  fax: string;
  email: string;
  reveal: CompanyReveal;
  url: string;
  industries: readonly Industry[];
  /** 業種の言い方（電気工事業・売買仲介 など） */
  business: string;
  areas: readonly string[];
  specialties: readonly string[];
  licenses: readonly License[];
  construction?: readonly ConstructionWork[];
  estate?: EstateBusiness;
  professions?: readonly Profession[];
  about: string;
  offer: readonly string[];
  want: readonly string[];
};

export type Person = {
  id: string;
  name: string;
  kana: string;
  companyId: string;
  title: string;
  prefecture: string;
  /** 本人の一言（顔の横に大きく出す） */
  say: string;
  past: string;
  now: string;
  future: string;
  /** 話のきっかけ（趣味・経歴の短い札） */
  talk: readonly string[];
  offer: readonly string[];
  want: readonly string[];
  /** 知り合いの知り合いに、紹介の道を見せてよいか（設計書7：公開を止められる） */
  openToIntro: boolean;
  /** 本人の連絡先。見せる相手は contactReveal で項目ごとに決める */
  contact: { phone: string; email: string };
  contactReveal: PersonReveal;
};

export const ME_ID = "me";

export const ME_COMPANY_ID = "sakaba-office";

// 見せる相手は、書いていなければ初期値（知り合いだけ）
export const COMPANIES: readonly Company[] = ([
  {
    id: ME_COMPANY_ID, name: "建設・不動産の酒場 運営事務局", kana: "けんせつふどうさんのさかば うんえいじむきょく", mark: "酒",
    postalCode: "530-0000", prefecture: "大阪府", city: "大阪市北区", street: "0-0-0", phone: "06-0000-0010", fax: "", email: "office@sakaba.example.com", url: "",
    industries: ["その他"], business: "建設・不動産の人の集まりの運営",
    areas: ["大阪府", "京都府", "兵庫県", "奈良県", "滋賀県", "和歌山県", "三重県"], specialties: ["人の引き合わせ", "アプリ・システムの相談"], licenses: [],
    about: "建設・不動産の人たちが、紹介し合える集まりを運営しています。",
    offer: ["建設・不動産の人の引き合わせ", "アプリ・システムの相談"], want: ["各地の工務店・不動産会社の方"],
  },
  {
    construction: [{ trade: "電気", permit: "special" }],
    reveal: { ...DEFAULT_COMPANY_REVEAL, phone: "all" },
    id: "yamamoto-densetsu", name: "株式会社山本電設", kana: "やまもとでんせつ", mark: "山", prefecture: "東京都",
    postalCode: "105-0000", city: "港区", street: "芝0-0-1", phone: "03-0000-1001", fax: "03-0000-1002", email: "info@yamamoto-densetsu.example.com", url: "https://yamamoto-densetsu.example.com",
    industries: ["建設"], business: "電気工事業",
    areas: ["東京都", "神奈川県", "埼玉県", "千葉県"], specialties: ["受変電設備", "LED改修"],
    licenses: [{ name: "電気工事業（特定）", number: "東京都知事 第12345号", verified: true }],
    about: "ビル・工場の受変電設備の更新を中心に、関東一円で工事をしています。",
    offer: ["受変電設備の更新工事", "LED改修の見積り"], want: ["九州の電気工事会社", "工場の設備担当の方"],
  },
  {
    construction: [{ trade: "管", permit: "general" }, { trade: "電気", permit: "none" }],
    id: "minato-setsubi", name: "有限会社ミナト設備", kana: "みなとせつび", mark: "ミ", prefecture: "神奈川県",
    postalCode: "231-0000", city: "横浜市中区", street: "本町0-0-2", phone: "045-000-1003", fax: "", email: "info@minato-setsubi.example.com", url: "https://minato-setsubi.example.com",
    industries: ["建設"], business: "管工事・電気工事",
    areas: ["神奈川県", "東京都"], specialties: ["空調", "店舗の設備", "外壁改修"],
    licenses: [{ name: "管工事業（一般）", number: "神奈川県知事 第08812号", verified: false }],
    about: "店舗・小さなビルの空調と電気をまとめて見ています。外壁の改修も協力会社と請けます。",
    offer: ["店舗の空調・電気の工事", "外壁の改修"], want: ["横浜の不動産会社"],
  },
  {
    construction: [{ trade: "電気", permit: "general" }],
    id: "hokushin", name: "北辰エンジニアリング", kana: "ほくしんえんじにありんぐ", mark: "北", prefecture: "埼玉県",
    postalCode: "330-0000", city: "さいたま市大宮区", street: "桜木町0-0-3", phone: "048-000-1004", fax: "048-000-1005", email: "info@hokushin.example.com", url: "https://hokushin.example.com",
    industries: ["建設"], business: "電気工事業",
    areas: ["埼玉県", "群馬県", "栃木県"], specialties: ["太陽光", "蓄電池"],
    licenses: [{ name: "電気工事業（一般）", number: "埼玉県知事 第20417号", verified: true }],
    about: "住宅・工場の太陽光と蓄電池の設置と保守。",
    offer: ["太陽光の設置・保守"], want: ["工場の屋根を持つオーナー"],
  },
  {
    construction: [{ trade: "建築一式", permit: "general" }, { trade: "大工", permit: "unknown" }, { trade: "内装仕上", permit: "none" }],
    id: "sato-komuten", name: "株式会社佐藤工務店", kana: "さとうこうむてん", mark: "佐", prefecture: "大阪府",
    postalCode: "530-0000", city: "大阪市北区", street: "梅田0-0-4", phone: "06-0000-1006", fax: "06-0000-1007", email: "info@sato-komuten.example.com", url: "https://sato-komuten.example.com",
    industries: ["建設"], business: "工務店",
    areas: ["大阪府", "京都府", "兵庫県"], specialties: ["木造の新築", "リフォーム"],
    licenses: [{ name: "建築工事業（一般）", number: "大阪府知事 第31560号", verified: true }],
    about: "木造の注文住宅とリフォーム。関西で40年。",
    offer: ["木造住宅の新築・リフォーム"], want: ["関東の協力会社"],
  },
  {
    estate: { transactions: ["売買", "賃貸", "管理"], properties: ["一棟アパート・マンション", "店舗・テナント", "飲食店舗"] },
    id: "nakamura-fudosan", name: "中村不動産", kana: "なかむらふどうさん", mark: "中", prefecture: "神奈川県",
    postalCode: "220-0000", city: "横浜市西区", street: "みなとみらい0-0-5", phone: "045-000-1008", fax: "", email: "info@nakamura-fudosan.example.com", url: "https://nakamura-fudosan.example.com",
    industries: ["不動産"], business: "売買仲介・賃貸管理",
    areas: ["神奈川県", "東京都"], specialties: ["一棟アパート", "収益物件"],
    licenses: [{ name: "宅地建物取引業", number: "神奈川県知事（3）第27731号", verified: true }],
    about: "横浜を中心に、一棟アパートの売買と管理をしています。",
    offer: ["収益物件の紹介", "賃貸管理"], want: ["外壁塗装の会社", "不動産投資家"],
  },
  {
    estate: { transactions: ["売買", "買取再販"], properties: ["土地", "店舗・テナント", "事務所", "倉庫・工場"] },
    id: "hayashi-estate", name: "林エステート", kana: "はやしえすてーと", mark: "林", prefecture: "大阪府",
    postalCode: "541-0000", city: "大阪市中央区", street: "本町0-0-6", phone: "06-0000-1009", fax: "", email: "info@hayashi-estate.example.com", url: "",
    industries: ["不動産"], business: "売買仲介・買取再販",
    areas: ["大阪府", "兵庫県"], specialties: ["事業用地", "買取再販"],
    licenses: [{ name: "宅地建物取引業", number: "大阪府知事（2）第58203号", verified: false }],
    about: "大阪市内の事業用地と、中古の買取再販。",
    offer: ["事業用地の情報"], want: ["300坪前後の事業用地"],
  },
  {
    professions: ["建築士"],
    id: "ono-design", name: "小野設計室", kana: "おのせっけいしつ", mark: "小", prefecture: "福岡県",
    postalCode: "810-0000", city: "福岡市中央区", street: "大名0-0-7", phone: "092-000-1010", fax: "", email: "info@ono-design.example.com", url: "https://ono-design.example.com",
    industries: ["建設", "士業"], business: "設計事務所",
    areas: ["福岡県", "佐賀県", "熊本県"], specialties: ["中古リノベ", "店舗設計"],
    licenses: [{ name: "一級建築士事務所", number: "福岡県知事登録 第1-60112号", verified: true }],
    about: "福岡で中古住宅のリノベと店舗の設計。",
    offer: ["リノベの設計", "店舗の設計"], want: ["九州の工務店"],
  },
  {
    estate: { transactions: ["売買"], properties: ["土地", "戸建て"] },
    id: "tanaka-realty", name: "田中リアルティ", kana: "たなかりあるてぃ", mark: "田", prefecture: "福岡県",
    postalCode: "812-0000", city: "福岡市博多区", street: "博多駅前0-0-8", phone: "092-000-1011", fax: "", email: "info@tanaka-realty.example.com", url: "",
    industries: ["不動産"], business: "売買仲介",
    areas: ["福岡県", "長崎県"], specialties: ["土地", "戸建て"],
    licenses: [{ name: "宅地建物取引業", number: "福岡県知事（1）第19045号", verified: true }],
    about: "福岡の土地と戸建ての売買。",
    offer: ["福岡の土地情報"], want: ["関東に対応できる不動産会社"],
  },
  {
    professions: ["行政書士"],
    id: "mori-gyosei", name: "森行政書士事務所", kana: "もりぎょうせいしょしじむしょ", mark: "森", prefecture: "東京都",
    postalCode: "160-0000", city: "新宿区", street: "西新宿0-0-9", phone: "03-0000-1012", fax: "", email: "info@mori-gyosei.example.com", url: "https://mori-gyosei.example.com",
    industries: ["士業"], business: "行政書士",
    areas: ["東京都", "神奈川県", "埼玉県", "千葉県"], specialties: ["建設業許可", "経営事項審査"],
    licenses: [{ name: "行政書士", number: "登録 第21081234号", verified: true }],
    about: "建設業許可の取得・更新と、経審の手続き。",
    offer: ["建設業許可の相談"], want: ["許可を取りたい工事会社"],
  },
] as (Omit<Company, "reveal"> & { reveal?: CompanyReveal })[]).map((c) => ({ reveal: DEFAULT_COMPANY_REVEAL, ...c }));

const P = (p: Omit<Person, "contactReveal">): Person => ({ contactReveal: DEFAULT_PERSON_REVEAL, ...p });

export const PEOPLE: readonly Person[] = [
  P({ id: ME_ID, name: "五島 一将", kana: "ごしま かずゆき", companyId: ME_COMPANY_ID, title: "管理者", prefecture: "大阪府", say: "困りごとは、まず聞かせてください",
    past: "システムの仕事を15年。建設・不動産の会社の困りごとを聞くうちに、人をつなぐ側になりました。",
    now: "建設・不動産の人たちの集まりを運営しています。相談を聞いて、合う人に引き合わせるのが仕事です。",
    future: "紹介のおねがいが、気軽に頼めて気軽に断れる場にしたい。",
    talk: ["人をつなぐのが好き", "大阪", "相談役"], offer: ["建設・不動産の人の引き合わせ", "アプリ・システムの相談"], want: ["各地の工務店・不動産会社の方", "紹介し合える仲間"],
    openToIntro: true, contact: { phone: "06-0000-0000", email: "goshima@example.com" } }),
  P({ id: "yamamoto", name: "山本 隆", kana: "やまもと たかし", companyId: "yamamoto-densetsu", title: "代表取締役", prefecture: "東京都",
    say: "九州の仲間と、太陽光の保守を広げたい",
    past: "電気工事の会社で20年。現場監督から独立しました。", now: "ビルや工場の受変電設備の入れ替えが中心です。休みの日は相模湾で釣り。", future: "九州の協力会社と組んで、太陽光の保守を広げたい。",
    talk: ["釣り（相模湾）", "独立して14年", "受変電"], offer: ["受変電設備の更新工事", "LED改修の見積り"], want: ["九州の電気工事会社", "工場の設備担当の方"],
    openToIntro: true, contact: { phone: "03-0000-0001", email: "yamamoto@example.com" } }),
  P({ id: "minato", name: "湊 浩二", kana: "みなと こうじ", companyId: "minato-setsubi", title: "代表", prefecture: "神奈川県",
    say: "店舗の空調と電気、まとめて見ます",
    past: "設備会社の職人から。", now: "店舗と小さなビルの空調・電気。外壁の改修も協力会社と。", future: "横浜の管理会社さんと長くお付き合いしたい。",
    talk: ["サーフィン", "職人あがり"], offer: ["店舗の空調・電気の工事", "外壁の改修"], want: ["横浜の不動産会社"],
    openToIntro: true, contact: { phone: "045-000-0002", email: "minato@example.com" } }),
  P({ id: "kitamura", name: "北村 渉", kana: "きたむら わたる", companyId: "hokushin", title: "工事部長", prefecture: "埼玉県",
    say: "太陽光と蓄電池の保守が得意です",
    past: "電力会社の協力会社で10年。", now: "太陽光と蓄電池の設置と保守。", future: "工場の屋根の太陽光を増やしたい。",
    talk: ["キャンプ", "二児の父"], offer: ["太陽光の設置・保守"], want: ["工場の屋根を持つオーナー"],
    openToIntro: false, contact: { phone: "048-000-0003", email: "kitamura@example.com" } }),
  P({ id: "sato", name: "佐藤 健一", kana: "さとう けんいち", companyId: "sato-komuten", title: "代表取締役", prefecture: "大阪府",
    say: "関西の木造なら、まず相談してください",
    past: "父の工務店を継いで二代目。", now: "木造の注文住宅とリフォーム。", future: "関東の協力会社と、大きめの案件を一緒にやりたい。",
    talk: ["ゴルフ", "二代目"], offer: ["木造住宅の新築・リフォーム"], want: ["関東の協力会社"],
    openToIntro: true, contact: { phone: "06-0000-0004", email: "sato@example.com" } }),
  P({ id: "nakamura", name: "中村 彩", kana: "なかむら あや", companyId: "nakamura-fudosan", title: "取締役", prefecture: "神奈川県",
    say: "関東の外壁塗装、頼める人いませんか",
    past: "大手の仲介会社で8年。", now: "横浜で一棟アパートの売買と管理。", future: "管理している建物を、長く持つ人を増やしたい。",
    talk: ["ワイン", "横浜育ち"], offer: ["収益物件の紹介", "賃貸管理"], want: ["外壁塗装の会社", "不動産投資家"],
    openToIntro: true, contact: { phone: "045-000-0005", email: "nakamura@example.com" } }),
  P({ id: "hayashi", name: "林 大輔", kana: "はやし だいすけ", companyId: "hayashi-estate", title: "代表", prefecture: "大阪府",
    say: "大阪で300坪の土地を探してます",
    past: "銀行の融資担当から不動産へ。", now: "大阪市内の事業用地と買取再販。", future: "物流の会社と組んで、倉庫の用地を扱いたい。",
    talk: ["元銀行員", "マラソン"], offer: ["事業用地の情報"], want: ["300坪前後の事業用地"],
    openToIntro: true, contact: { phone: "06-0000-0006", email: "hayashi@example.com" } }),
  P({ id: "ono", name: "小野 亮", kana: "おの りょう", companyId: "ono-design", title: "所長", prefecture: "福岡県",
    say: "福岡で、中古のリノベを始めます",
    past: "東京の設計事務所で12年。", now: "福岡で中古住宅のリノベと店舗の設計。", future: "九州の工務店さんと組んで、リノベを増やしたい。",
    talk: ["Uターン", "古い家が好き"], offer: ["リノベの設計", "店舗の設計"], want: ["九州の工務店"],
    openToIntro: true, contact: { phone: "092-000-0007", email: "ono@example.com" } }),
  P({ id: "tanaka", name: "田中 誠", kana: "たなか まこと", companyId: "tanaka-realty", title: "代表", prefecture: "福岡県",
    say: "関東に対応できる不動産会社とつながりたい",
    past: "地元の不動産会社で15年。", now: "福岡の土地と戸建ての売買。", future: "関東に移る人の住み替えを手伝いたい。",
    talk: ["釣り", "博多生まれ"], offer: ["福岡の土地情報"], want: ["関東に対応できる不動産会社"],
    openToIntro: true, contact: { phone: "092-000-0008", email: "tanaka@example.com" } }),
  P({ id: "mori", name: "森 由紀", kana: "もり ゆき", companyId: "mori-gyosei", title: "行政書士", prefecture: "東京都",
    say: "建設業許可のこと、気軽に聞いてください",
    past: "建設会社の総務で許可の担当。", now: "建設業許可の取得・更新と、経審の手続き。", future: "許可を取って元請になりたい会社を増やしたい。",
    talk: ["元・建設会社の総務", "落語"], offer: ["建設業許可の相談"], want: ["許可を取りたい工事会社"],
    openToIntro: true, contact: { phone: "03-0000-0009", email: "mori@example.com" } }),
];

/** 相互承認済みの知り合い（向きなし） */
export const CONNECTIONS: readonly (readonly [string, string])[] = [
  [ME_ID, "sato"], [ME_ID, "nakamura"], [ME_ID, "minato"], [ME_ID, "ono"], [ME_ID, "mori"],
  ["sato", "yamamoto"], ["sato", "hayashi"], ["nakamura", "tanaka"], ["ono", "tanaka"],
  ["minato", "kitamura"], ["mori", "yamamoto"],
];

/** 最近つながった順（ホームに出す） */
export const RECENT_CONNECTIONS: readonly string[] = ["ono", "mori", "minato", "nakamura"];

/** 自分の人脈の大きさ（見本の数。仮データの人数より大きく見せる） */
export const NETWORK_SUMMARY = { direct: 48, second: 312, companies: 36 } as const;

/** 案件・募集のカテゴリー（設計書6-6） */
export const POST_CATEGORIES = [
  { key: "request-work", label: "仕事を依頼したい" },
  { key: "offer-property", label: "物件を紹介したい" },
  { key: "seek-property", label: "物件を探している" },
  { key: "seek-partner", label: "協力会社を探している" },
  { key: "other", label: "その他の募集" },
] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number]["key"];

/** 案件の公開範囲（設計書16章「案件掲示板の公開範囲」は未確定。見本では2段） */
export const POST_VISIBILITIES = [
  { key: "friends", label: "知り合いまで" },
  { key: "friends2", label: "知り合いの知り合いまで" },
] as const;
export type PostVisibility = (typeof POST_VISIBILITIES)[number]["key"];

export type Post =
  | {
      id: string; kind: "want"; authorId: string; ago: string;
      /** 投稿のタイトル */
      text: string;
      category: PostCategory; industry: Industry; areas: readonly string[]; detail: string;
      /** 募集期限（任意。YYYY-MM-DD） */
      deadline: string | null;
      /** 問い合わせ先または連絡方法 */
      contact: string;
      visibility: PostVisibility;
      knowCount: number; canDoCount: number;
    }
  | { id: string; kind: "news"; authorId: string; ago: string; text: string; photo: string | null; likeCount: number; commentCount: number }
  | { id: string; kind: "connected"; authorId: string; otherId: string; ago: string }
  | { id: string; kind: "profile"; authorId: string; ago: string; field: string; text: string };

export const POSTS: readonly Post[] = [
  { id: "p1", kind: "want", authorId: "nakamura", ago: "1時間前", text: "関東で一棟アパートの外壁塗装、頼める会社を探しています", category: "request-work", industry: "建設", areas: ["東京都", "神奈川県"], detail: "木造2階建て・12戸の外壁塗装です。足場はこちらで手配します。", deadline: "2026-11-30", contact: "中村まで 045-000-0005", visibility: "friends2", knowCount: 3, canDoCount: 1 },
  { id: "p2", kind: "news", authorId: "yamamoto", ago: "3時間前", text: "品川のビル、受変電の入れ替えが終わりました。夜通しの作業、みんなお疲れさまでした。", photo: "現場の写真", likeCount: 12, commentCount: 3 },
  { id: "p3", kind: "connected", authorId: "sato", otherId: "hayashi", ago: "5時間前" },
  { id: "p4", kind: "want", authorId: "hayashi", ago: "1日前", text: "大阪市内で300坪前後の事業用地を探しています", category: "seek-property", industry: "不動産", areas: ["大阪府"], detail: "物流倉庫の用地です。駅からの近さより、大型車が入れる道を優先します。", deadline: null, contact: "林まで 06-0000-0006", visibility: "friends2", knowCount: 1, canDoCount: 0 },
  { id: "p5", kind: "profile", authorId: "ono", ago: "2日前", field: "これから", text: "福岡で、中古のリノベを始めます。九州の工務店さんとつながりたいです。" },
  { id: "p6", kind: "want", authorId: "tanaka", ago: "2日前", text: "関東に移るお客さまの住み替えを、手伝ってくれる不動産会社を探しています", category: "seek-partner", industry: "不動産", areas: ["東京都", "神奈川県"], detail: "福岡から横浜への住み替えです。来春までに住まいを決めたいそうです。", deadline: "2027-02-28", contact: "田中まで 092-000-0008", visibility: "friends2", knowCount: 0, canDoCount: 0 },
  { id: "p7", kind: "want", authorId: "ono", ago: "3日前", text: "九州の工務店さん、リノベの協力会社になってください", category: "seek-partner", industry: "建設", areas: ["福岡県", "佐賀県", "熊本県"], detail: "中古住宅のリノベで、施工をお願いできる工務店を探しています。設計は小野設計室が持ちます。", deadline: null, contact: "小野まで 092-000-0007", visibility: "friends", knowCount: 0, canDoCount: 0 },
  { id: "p9", kind: "want", authorId: "sato", ago: "5日前", text: "リフォーム前提の築古の一棟アパートを紹介したいです", category: "offer-property", industry: "不動産", areas: ["大阪府", "兵庫県"], detail: "大阪北部の木造アパートです。持ち主が手放す相談を受けています。", deadline: "2026-12-15", contact: "佐藤まで 06-0000-0004", visibility: "friends", knowCount: 0, canDoCount: 0 },
];

/** ほかの人の公開レベルの設定（見本）。自分（me）・森・中村・湊は書いていない＝紹介経由のみ。自分の設定は store が持つ */
export const NET_SETTINGS_SEED: NetSettings = {
  defaults: { sato: "intro" },
  overrides: {
    sato: { yamamoto: "open", hayashi: "masked" },
    ono: { tanaka: "hidden" },
  },
};

/** つながりの判定に使う設定と、紹介でつながった人（見本では再読み込みで元に戻る） */
export type NetState = { settings: NetSettings; extraConnections: readonly (readonly [string, string])[] };
export const BASE_NET: NetState = { settings: NET_SETTINGS_SEED, extraConnections: [] };

/**
 * 紹介依頼の記録の見本。
 * r1：田中 → 自分 → 湊（自分が承認・辞退を試せる）／r2：山本 → 佐藤 → 自分（自分が了承・お断りを試せる）／r3：自分 → 中村 → 田中（辞退された履歴）
 */
export const INTRO_RECORDS_SEED: readonly IntroRecord[] = [
  {
    id: "r1", requesterId: "tanaka", introducerId: ME_ID, targetId: "minato",
    note: "関東に移るお客さまの住み替えで、横浜の設備に強い方を探しています",
    maskedForRequester: false, status: "requested", fee: null,
    events: [{ at: "2026-11-07", status: "requested", byId: "tanaka", note: "関東に移るお客さまの住み替えで、横浜の設備に強い方を探しています" }],
  },
  {
    id: "r2", requesterId: "yamamoto", introducerId: "sato", targetId: ME_ID,
    note: "九州の電気工事会社を探していて、まず話を聞かせてもらえませんか",
    maskedForRequester: false, status: "asking_target", fee: { kind: "percent", percent: 3 },
    events: [
      { at: "2026-11-05", status: "requested", byId: "yamamoto", note: "九州の電気工事会社を探していて、まず話を聞かせてもらえませんか" },
      { at: "2026-11-06", status: "asking_target", byId: "sato", note: "太陽光の保守で相談したいそうです" },
    ],
  },
  {
    id: "r3", requesterId: ME_ID, introducerId: "nakamura", targetId: "tanaka",
    note: "福岡の土地の情報を、一度うかがいたいです",
    maskedForRequester: false, status: "declined_by_introducer", fee: null,
    events: [
      { at: "2026-10-20", status: "requested", byId: ME_ID, note: "福岡の土地の情報を、一度うかがいたいです" },
      { at: "2026-10-21", status: "declined_by_introducer", byId: "nakamura", note: "いまは紹介を控えています" },
    ],
  },
];

// ---------- 引く・計算する ----------

export function findPerson(id: string): Person | null {
  return PEOPLE.find((p) => p.id === id) ?? null;
}

export function findCompany(id: string): Company | null {
  return COMPANIES.find((c) => c.id === id) ?? null;
}

export function companyOf(person: Person): Company | null {
  return findCompany(person.companyId);
}

export function peopleOf(companyId: string): Person[] {
  return PEOPLE.filter((p) => p.companyId === companyId);
}

/** 直接の知り合い。net の extraConnections（紹介でつながった人）も入れる */
export function friendsOf(id: string, net: NetState = BASE_NET): string[] {
  const out = new Set<string>();
  for (const [a, b] of [...CONNECTIONS, ...net.extraConnections]) {
    if (a === id) out.add(b);
    else if (b === id) out.add(a);
  }
  return [...out];
}

export type Relation =
  | { kind: "self" }
  | { kind: "direct" }
  /** 知り合いの知り合い。via＝最初の候補（今までの呼び出し元のため残す）、vias＝紹介をたのめる人の全員、canDirect＝だれか1人でも直接連絡OKにしている */
  | { kind: "via"; via: Person; vias: Person[]; canDirect: boolean }
  /** 名前を伏せて見せる。vias＝たのめる人、label＝「不動産業の役員」 */
  | { kind: "masked"; vias: Person[]; label: string }
  | { kind: "none" };

const INDUSTRY_NOUN: Readonly<Record<Industry, string>> = { 建設: "建設業", 不動産: "不動産業", 士業: "士業", その他: "" };

/** 伏せた人の札：「不動産業の役員」。業種が「その他」なら「役員」だけ。company を渡すと、編集中の会社の業種で決める */
export function maskedLabel(person: Pick<Person, "title" | "companyId">, company: Pick<Company, "industries"> | null = findCompany(person.companyId)): string {
  const noun = company ? INDUSTRY_NOUN[company.industries[0]] : "";
  const role = roleClass(person.title);
  return noun ? `${noun}の${role}` : role;
}

/**
 * 自分から見たその人とのつながり（つながりの判定はここ1か所）。紹介の道は2段まで（設計書7）。
 * 1. 自分 → self。直接の知り合い → direct
 * 2. 相手がいない、または相手が紹介の道を見せない設定（openToIntro=false）なら none（紹介される本人の設定がいちばん強い）
 * 3. 共通の知り合い B を、自分の知り合いの並びで見て、B が相手をどう見せているか（levelOf）で分ける：
 *    open・intro → 紹介をたのめる人（open の B がいれば canDirect）／masked → 名前を伏せる候補／hidden → 捨てる
 * 4. たのめる人がいれば via、いなければ伏せる候補があれば masked、どちらもなければ none
 */
export function relationTo(targetId: string, meId: string = ME_ID, net: NetState = BASE_NET): Relation {
  if (targetId === meId) return { kind: "self" };
  const mine = friendsOf(meId, net);
  if (mine.includes(targetId)) return { kind: "direct" };
  const target = findPerson(targetId);
  if (!target || !target.openToIntro) return { kind: "none" };
  const theirs = friendsOf(targetId, net);
  const vias: Person[] = [];
  const masked: Person[] = [];
  let canDirect = false;
  for (const bId of mine) {
    if (!theirs.includes(bId)) continue;
    const b = findPerson(bId);
    if (!b) continue;
    const level = levelOf(net.settings, bId, targetId);
    if (level === "open" || level === "intro") {
      vias.push(b);
      if (level === "open") canDirect = true;
    } else if (level === "masked") {
      masked.push(b);
    }
  }
  if (vias.length > 0) return { kind: "via", via: vias[0], vias, canDirect };
  if (masked.length > 0) return { kind: "masked", vias: masked, label: maskedLabel(target) };
  return { kind: "none" };
}

/** 人のページ・一覧に出すつながり。伏せた道は、その人の行・ページには出さない（道なし扱い） */
export function openRelation(relation: Relation): Relation {
  return relation.kind === "masked" ? { kind: "none" } : relation;
}

/** 会社とのつながり＝所属する人のうち、いちばん近い人。伏せた道は none と同じ（会社から、伏せた人が分からないように） */
export function relationToCompany(companyId: string, meId: string = ME_ID, net: NetState = BASE_NET): { relation: Relation; person: Person | null } {
  const rank = (r: Relation) => (r.kind === "self" ? 0 : r.kind === "direct" ? 1 : r.kind === "via" ? 2 : 3);
  let best: { relation: Relation; person: Person | null } = { relation: { kind: "none" }, person: null };
  for (const p of peopleOf(companyId)) {
    const r = relationTo(p.id, meId, net);
    if (rank(r) < rank(best.relation)) best = { relation: r, person: p };
  }
  return best;
}

/** 見せる相手の設定と、見る人とのつながりから、見せてよいかを決める。本人にはいつも見える。画面ごとに判定を書かない（ここを読む） */
export function canReveal(reveal: Reveal, relation: Relation): boolean {
  if (relation.kind === "self") return true;
  // 伏せた相手には、連絡先を見せない
  if (relation.kind === "masked") return false;
  if (reveal === "hidden") return false;
  return reveal === "all" || relation.kind === "direct";
}

/** その人に見せてよい本人の連絡先（空の項目は出さない） */
export function personContactRows(person: Person, relation: Relation): { label: string; value: string }[] {
  const rows = [
    { label: "電話", value: person.contact.phone, reveal: person.contactReveal.phone },
    { label: "メール", value: person.contact.email, reveal: person.contactReveal.email },
  ];
  return rows.filter((r) => r.value && canReveal(r.reveal, relation)).map(({ label, value }) => ({ label, value }));
}

/** つながりの一文（一覧・詳しいページで同じ言い方にする） */
export function relationText(relation: Relation): string {
  switch (relation.kind) {
    case "self": return "あなたです";
    case "direct": return "あなたの知り合いです";
    case "via": {
      const others = relation.vias.length - 1;
      const who = others > 0 ? `${shortName(relation.via)}さんほか${others}人` : `${shortName(relation.via)}さん`;
      return `${who}経由で紹介できます${relation.canDirect ? "。直接連絡もできます" : ""}`;
    }
    case "masked": return `${shortName(relation.vias[0])}さんがつながりあり（名前は伏せています）`;
    case "none": return "まだ紹介できる道がありません";
  }
}

/** 「山本 隆」→「山本」 */
export function shortName(person: Pick<Person, "name">): string {
  return person.name.split(/\s+/)[0];
}

export type SearchFilter = {
  query: string;
  regions: readonly string[];
  industries: readonly Industry[];
  prefectures?: readonly string[];
  areaMode?: "service" | "location";
  estateTransactions?: readonly EstateTransaction[];
  estateProperties?: readonly EstateProperty[];
  constructionTrades?: readonly ConstructionTrade[];
  constructionPermit?: PermitFilter;
  professions?: readonly Profession[];
  otherBusiness?: string;
  workQueries?: Partial<Record<Industry, string>>;
  licensedOnly: boolean;
  introducibleOnly: boolean;
};

export const EMPTY_FILTER: SearchFilter = { query: "", regions: [], industries: [], licensedOnly: false, introducibleOnly: false };

/** 地方と都道府県を合わせてOR検索。所在地と対応エリアを切り替える。 */
function matchesCompanyFilters(c: Company, filter: SearchFilter): boolean {
  const prefs = [...filter.regions.flatMap((r) => REGIONS[r] ?? []), ...(filter.prefectures ?? [])];
  const areas = filter.areaMode === "location" ? [c.prefecture] : c.areas;
  if (prefs.length && !areas.some((a) => prefs.includes(a))) return false;
  if (filter.industries.length && !filter.industries.some((industry) => {
    if (!c.industries.includes(industry)) return false;
    if (!matchesBusinessKeywords([c.business, ...c.specialties, ...c.offer, ...(c.professions ?? []), ...(c.estate?.properties ?? [])], filter.workQueries?.[industry] ?? "")) return false;
    if (industry === "建設") return matchesConstruction(c.construction ?? [], filter.constructionTrades ?? [], filter.constructionPermit ?? "any");
    if (industry === "不動産") return matchesEstate(c.estate, filter.estateTransactions ?? [], filter.estateProperties ?? []);
    if (industry === "士業") return !filter.professions?.length || (c.professions ?? []).some((p) => filter.professions?.includes(p));
    if (industry === "その他") return matchesOtherBusiness([c.business, ...c.specialties, ...c.offer], filter.otherBusiness ?? "");
    return true;
  })) return false;
  if (filter.licensedOnly && !c.licenses.some((l) => l.verified)) return false;
  return true;
}

/** 対応エリアが少しでもかかる地域の名前（「関東」で探せるように） */
function regionsTouching(areas: readonly string[]): string[] {
  return REGION_NAMES.filter((r) => REGIONS[r].some((p) => areas.includes(p)));
}

function matchesQuery(texts: readonly string[], query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = texts.join(" ");
  return words.every((w) => hay.includes(w));
}

const RELATION_ORDER: Record<Relation["kind"], number> = { self: 3, direct: 0, via: 1, masked: 2, none: 2 };

/** 会社を探す。並びは「紹介できる順」（知り合い → 知り合いの知り合い → それ以外）。mine は編集後の自分の会社（探すにそのまま効かせる） */
export function searchCompanies(filter: SearchFilter, meId: string = ME_ID, mine?: Company, net: NetState = BASE_NET): Company[] {
  return COMPANIES.map((c) => (c.id === mine?.id ? mine : c)).filter((c) => {
    if (!matchesCompanyFilters(c, filter)) return false;
    const rel = relationToCompany(c.id, meId, net).relation;
    if (filter.introducibleOnly && rel.kind !== "direct" && rel.kind !== "via") return false;
    return matchesQuery([c.name, c.kana, c.business, c.prefecture, c.city, ...c.specialties, ...c.offer, ...c.areas, ...regionsTouching(c.areas)], filter.query);
  }).sort((a, b) => RELATION_ORDER[relationToCompany(a.id, meId, net).relation.kind] - RELATION_ORDER[relationToCompany(b.id, meId, net).relation.kind]);
}

/** 人を探す。会社の対応エリア・業種・許可で絞る。自分は出さない */
export function searchPeople(filter: SearchFilter, meId: string = ME_ID, net: NetState = BASE_NET): Person[] {
  return PEOPLE.filter((p) => {
    if (p.id === meId) return false;
    const c = companyOf(p);
    if (!c) return false;
    if (!matchesCompanyFilters(c, filter)) return false;
    const rel = relationTo(p.id, meId, net);
    if (filter.introducibleOnly && rel.kind !== "direct" && rel.kind !== "via") return false;
    return matchesQuery([p.name, p.kana, p.say, p.now, ...p.offer, c.name, c.kana, c.business, c.city, ...c.specialties, ...c.areas, ...regionsTouching(c.areas)], filter.query);
  }).sort((a, b) => RELATION_ORDER[relationTo(a.id, meId, net).kind] - RELATION_ORDER[relationTo(b.id, meId, net).kind]);
}

/** 対応エリアの見せ方。地域を丸ごと覆っていれば「関東全域」のようにまとめる */
export function areaText(areas: readonly string[]): string {
  const whole = REGION_NAMES.filter((r) => REGIONS[r].every((p) => areas.includes(p)));
  const rest = areas.filter((a) => !whole.some((r) => REGIONS[r].includes(a)));
  return [...whole.map((r) => `${r}全域`), ...rest].join("・");
}

// ---------- 人脈 ----------

/** 直接の知り合い（相互承認済み）。ふりがなの五十音順 */
export function directPeople(meId: string = ME_ID, net: NetState = BASE_NET): Person[] {
  return friendsOf(meId, net).flatMap((id) => {
    const p = findPerson(id);
    return p ? [p] : [];
  }).sort((a, b) => a.kana.localeCompare(b.kana, "ja"));
}

/** 知り合いの知り合い。紹介の道を見せない人は出さない（relationTo と同じ判定） */
export function secondDegreePeople(meId: string = ME_ID, net: NetState = BASE_NET): Person[] {
  return PEOPLE.filter((p) => relationTo(p.id, meId, net).kind === "via");
}

/** 名前を伏せたつながり（マイページの「名前を伏せたつながり」）。名前・id・会社名は画面に出さない。targetId は紹介依頼の記録にだけ使う */
export type MaskedConnection = { key: string; label: string; vias: Person[]; targetId: string };

export function maskedConnections(meId: string = ME_ID, net: NetState = BASE_NET): MaskedConnection[] {
  const out: MaskedConnection[] = [];
  for (const p of PEOPLE) {
    const r = relationTo(p.id, meId, net);
    if (r.kind === "masked") out.push({ key: `masked-${r.vias[0].id}-${out.length + 1}`, label: r.label, vias: r.vias, targetId: p.id });
  }
  return out;
}

/** 伏せたつながりの見出し：「不動産業の役員と佐藤さんがつながりあり」 */
export function maskedHeadline(m: Pick<MaskedConnection, "label" | "vias">): string {
  const names = m.vias.map((v) => `${shortName(v)}さん`).join("・");
  return `${m.label}と${names}がつながりあり`;
}

// ---------- 直接メッセージ・つながりの設定の反映 ----------

/** 直接送ったメッセージ（見本では送った一覧に並ぶだけ） */
export type SentMessage = { id: string; toId: string; text: string; at: string };

/**
 * 直接メッセージを作る。直接連絡OK（canDirect）の相手にしか作れない（ここでも確かめる。許されなければ null）。
 * 文章は空不可・上限まで。
 */
export function makeDirectMessage(net: NetState, toId: string, text: string, at: string, meId: string = ME_ID): SentMessage | null {
  const relation = relationTo(toId, meId, net);
  if (relation.kind !== "via" || !relation.canDirect) return null;
  const body = text.trim();
  if (body === "" || body.length > INTRO_NOTE_MAX) return null;
  return { id: `${meId}-${toId}-${at}-${body.length}`, toId, text: body, at };
}

/** owner の一括の設定と個別の設定を置き換える（元の net は変えない）。個別は friend → 設定 */
export function withOwnerSettings(net: NetState, ownerId: string, level: NetLevel, overrides: Readonly<Record<string, NetLevel>>): NetState {
  return {
    ...net,
    settings: {
      defaults: { ...net.settings.defaults, [ownerId]: level },
      overrides: { ...net.settings.overrides, [ownerId]: { ...overrides } },
    },
  };
}

/** 紹介でつながった2人を足す（もうつながっていれば何もしない） */
export function withConnection(net: NetState, a: string, b: string): NetState {
  if (friendsOf(a, net).includes(b)) return net;
  return { ...net, extraConnections: [...net.extraConnections, [a, b]] };
}

/** その人の一括の設定（書いていなければ初期値） */
export function defaultLevelOf(net: NetState, ownerId: string): NetLevel {
  return net.settings.defaults[ownerId] ?? DEFAULT_NET_LEVEL;
}

/** 招待URL（LINEで送る）。見本のURLで、開いても何も起きない */
export const INVITE_BASE = "https://kensetsu-sakaba.example/invite";
export function inviteUrl(ownerId: string): string {
  return `${INVITE_BASE}/${ownerId}`;
}

// ---------- 案件 ----------

export type WantPost = Extract<Post, { kind: "want" }>;

export function categoryLabel(key: PostCategory): string {
  return POST_CATEGORIES.find((c) => c.key === key)?.label ?? "";
}
export function visibilityLabel(key: PostVisibility): string {
  return POST_VISIBILITIES.find((v) => v.key === key)?.label ?? "";
}

/** 「探しています」の投稿。自分が足した投稿（extra）を先頭に */
export function wantPosts(extra: readonly WantPost[] = []): WantPost[] {
  const seeded = POSTS.filter((p): p is WantPost => p.kind === "want");
  return [...extra, ...seeded];
}

/** カテゴリーで絞る（null＝すべて） */
export function filterWantPosts(posts: readonly WantPost[], category: PostCategory | null): WantPost[] {
  return category === null ? [...posts] : posts.filter((p) => p.category === category);
}

export function findWantPost(id: string, extra: readonly WantPost[] = []): WantPost | null {
  return wantPosts(extra).find((p) => p.id === id) ?? null;
}

/** 投稿への返事。know＝知り合いを紹介する／can＝うちで受けたい（10-31：「相談」より「依頼」「案件」の言葉に） */
export type AnswerKind = "know" | "can";
export const ANSWER_LABEL: Readonly<Record<AnswerKind, string>> = { know: "知り合いを紹介する", can: "うちで受けたい" };
export type WantAnswer = { postId: string; kind: AnswerKind; personId: string; note: string };

export const WANT_ANSWERS: readonly WantAnswer[] = [
  { postId: "p1", kind: "know", personId: "sato", note: "大阪の塗装屋さんで、関東の現場にも出ている会社があります" },
  { postId: "p1", kind: "know", personId: "ono", note: "九州の職人さんですが、関東の現場に入ったことがある人を知っています" },
  { postId: "p1", kind: "know", personId: "mori", note: "お客さまで、外壁が得意な会社があります。聞いてみます" },
  { postId: "p1", kind: "can", personId: "minato", note: "外壁の改修なら協力会社と請けられます" },
  { postId: "p4", kind: "know", personId: "sato", note: "吹田に空いている土地があると聞きました" },
];

/** その投稿への答え（見本のもの＋自分が送ったもの）。送った順 */
export function answersFor(postId: string, mine: readonly WantAnswer[] = []): WantAnswer[] {
  return [...WANT_ANSWERS, ...mine].filter((a) => a.postId === postId);
}

export function answerCount(postId: string, kind: AnswerKind, mine: readonly WantAnswer[] = []): number {
  return answersFor(postId, mine).filter((a) => a.kind === kind).length;
}

export type PostDraft = {
  title: string;
  category: PostCategory | "";
  industry: Industry | "";
  regions: readonly string[];
  detail: string;
  deadline: string;
  contact: string;
  visibility: PostVisibility;
};

export const POST_TITLE_MAX = 60;
export const POST_DETAIL_MAX = 600;

export const EMPTY_POST_DRAFT: PostDraft = { title: "", category: "", industry: "", regions: [], detail: "", deadline: "", contact: "", visibility: "friends2" };

export type PostDraftErrors = Partial<Record<"title" | "category" | "industry" | "regions" | "detail" | "deadline" | "contact", string>>;

/** 今日の日付（YYYY-MM-DD）。期限の確かめに使う */
export function todayIso(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 投稿の入力の確かめ。空なら {}。理由は画面にそのまま赤字で出す */
export function validatePostDraft(d: PostDraft, today: string = todayIso()): PostDraftErrors {
  const e: PostDraftErrors = {};
  if (d.title.trim() === "") e.title = "タイトルを書いてください";
  else if (d.title.trim().length > POST_TITLE_MAX) e.title = `タイトルは${POST_TITLE_MAX}字までです`;
  if (d.category === "") e.category = "カテゴリーを選んでください";
  if (d.industry === "") e.industry = "対象の業種を選んでください";
  if (d.regions.length === 0) e.regions = "対象の地域をひとつ以上選んでください";
  if (d.detail.trim() === "") e.detail = "内容を書いてください。答える人が判断しやすくなります";
  else if (d.detail.trim().length > POST_DETAIL_MAX) e.detail = `内容は${POST_DETAIL_MAX}字までです`;
  if (d.deadline !== "" && d.deadline < today) e.deadline = "募集期限は今日より先の日にしてください";
  if (d.contact.trim() === "") e.contact = "問い合わせ先を書いてください（電話・メールなど）";
  return e;
}

/** 確かめ済みの入力から投稿を作る（自分の投稿） */
export function makeWantPost(d: PostDraft, id: string, meId: string = ME_ID): WantPost {
  if (d.category === "" || d.industry === "") throw new Error("入力の確かめを通っていない投稿です");
  return {
    id, kind: "want", authorId: meId, ago: "いま", text: d.title.trim(), category: d.category, industry: d.industry,
    areas: [...d.regions], detail: d.detail.trim(), deadline: d.deadline === "" ? null : d.deadline, contact: d.contact.trim(),
    visibility: d.visibility, knowCount: 0, canDoCount: 0,
  };
}

// ---------- 自分のプロフィール ----------

/** 1行に1つ書いた欄を並べ直す。空行・重複は捨て、上限で切る */
export function splitLines(text: string, max: number = 8): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const v = raw.trim();
    if (v !== "" && !out.includes(v)) out.push(v);
  }
  return out.slice(0, max);
}

/** 欄に戻すとき（splitLines の逆向き） */
export function joinLines(list: readonly string[]): string {
  return list.join("\n");
}

// ---------- 管理者：名刺の仮登録 ----------

/** 未招待 → 招待中 → 本人が承認（設計書4章。承認するまで、登録した運営者以外には見せない） */
export type CardStatus = "uninvited" | "invited" | "approved";
export const CARD_STATUSES: readonly { key: CardStatus; label: string; rank: number }[] = [
  { key: "uninvited", label: "未招待", rank: 0 },
  { key: "invited", label: "招待中", rank: 1 },
  { key: "approved", label: "本人が承認", rank: 2 },
];
export function cardStatusLabel(key: CardStatus): string {
  return CARD_STATUSES.find((s) => s.key === key)?.label ?? "";
}
export function cardStatusRank(key: CardStatus): number {
  return CARD_STATUSES.find((s) => s.key === key)?.rank ?? 0;
}

export type BusinessCard = { id: string; name: string; company: string; registeredOn: string; status: CardStatus };

export const BUSINESS_CARDS: readonly BusinessCard[] = [
  { id: "c1", name: "山本 隆", company: "株式会社山本電設", registeredOn: "2026-10-12", status: "approved" },
  { id: "c2", name: "湊 浩二", company: "有限会社ミナト設備", registeredOn: "2026-10-12", status: "approved" },
  { id: "c3", name: "田中 誠", company: "田中リアルティ", registeredOn: "2026-10-20", status: "invited" },
  { id: "c4", name: "小川 美咲", company: "株式会社オガワ設計", registeredOn: "2026-10-25", status: "uninvited" },
  { id: "c5", name: "山本 隆", company: "山本電設株式会社", registeredOn: "2026-10-26", status: "uninvited" },
  { id: "c6", name: "山本 翔", company: "山本電設", registeredOn: "2026-10-26", status: "uninvited" },
  { id: "c7", name: "森 由紀", company: "森行政書士事務所", registeredOn: "2026-10-18", status: "invited" },
  { id: "c8", name: "林 大輔", company: "林エステート", registeredOn: "2026-10-15", status: "approved" },
  { id: "c9", name: "木村 俊", company: "木村建装", registeredOn: "2026-10-27", status: "uninvited" },
];

const normalizeName = (s: string) => s.replace(/[\s　]/g, "");
const normalizeCompany = (s: string) =>
  s.replace(/[\s　]/g, "").replace(/株式会社|有限会社|合同会社|[(（]株[)）]|[(（]有[)）]|㈱|㈲/g, "");

export type CardInput = { name: string; company: string };
export type CardInputErrors = Partial<Record<"name" | "company", string>>;

export function validateCardInput(input: CardInput): CardInputErrors {
  const e: CardInputErrors = {};
  if (input.name.trim() === "") e.name = "名前を入れてください";
  if (input.company.trim() === "") e.company = "会社名を入れてください";
  return e;
}

/** 名前も会社も同じ名刺（空白・「株式会社」などの違いは無視）が既にあるか */
export function hasSameCard(cards: readonly BusinessCard[], input: CardInput): boolean {
  return cards.some((c) => normalizeName(c.name) === normalizeName(input.name) && normalizeCompany(c.company) === normalizeCompany(input.company));
}

export function nextCardId(cards: readonly BusinessCard[]): string {
  const max = cards.reduce((m, c) => Math.max(m, Number(c.id.replace(/^c/, "")) || 0), 0);
  return `c${max + 1}`;
}

/** 手で入れた名刺は、非公開・未招待から始まる */
export function makeCard(cards: readonly BusinessCard[], input: CardInput, registeredOn: string): BusinessCard {
  return { id: nextCardId(cards), name: input.name.trim(), company: input.company.trim(), registeredOn, status: "uninvited" };
}

export type DuplicateReason = "同じ名前" | "同じ会社";
export type DuplicatePair = { key: string; a: BusinessCard; b: BusinessCard; reasons: readonly DuplicateReason[] };

export function pairKey(aId: string, bId: string): string {
  return [aId, bId].sort().join("|");
}

/** 重複の候補：同じ名前か同じ会社の2件。「別の人」と選んだ組（distinct）は出さない */
export function duplicatePairs(cards: readonly BusinessCard[], distinct: ReadonlySet<string> = new Set()): DuplicatePair[] {
  const out: DuplicatePair[] = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i];
      const b = cards[j];
      const key = pairKey(a.id, b.id);
      if (distinct.has(key)) continue;
      const reasons: DuplicateReason[] = [];
      if (normalizeName(a.name) !== "" && normalizeName(a.name) === normalizeName(b.name)) reasons.push("同じ名前");
      if (normalizeCompany(a.company) !== "" && normalizeCompany(a.company) === normalizeCompany(b.company)) reasons.push("同じ会社");
      if (reasons.length > 0) out.push({ key, a, b, reasons });
    }
  }
  return out;
}

/** まとめるとき、残す方と消す方。先に登録した方を残す（同じ日なら一覧で先の方） */
export function mergeOrder(a: BusinessCard, b: BusinessCard): { keep: BusinessCard; drop: BusinessCard } {
  return b.registeredOn < a.registeredOn ? { keep: b, drop: a } : { keep: a, drop: b };
}

/** 同じ人としてまとめる。消す方を取り除き、残す方は進んだ方の状態にする */
export function mergeCards(cards: readonly BusinessCard[], keepId: string, dropId: string): BusinessCard[] {
  const keep = cards.find((c) => c.id === keepId);
  const drop = cards.find((c) => c.id === dropId);
  if (!keep || !drop) return [...cards];
  const status = cardStatusRank(drop.status) > cardStatusRank(keep.status) ? drop.status : keep.status;
  return cards.filter((c) => c.id !== dropId).map((c) => (c.id === keepId ? { ...c, status } : c));
}

/** 名刺の本人に送る招待URL */
export function cardInviteUrl(cardId: string): string {
  return `${INVITE_BASE}/${cardId}`;
}

/** 招待URLを渡した名刺は「招待中」にする（承認済みはそのまま） */
export function markInvited(cards: readonly BusinessCard[], cardId: string): BusinessCard[] {
  return cards.map((c) => (c.id === cardId && c.status === "uninvited" ? { ...c, status: "invited" } : c));
}

// ---------- 業種の色・紹介の道・地域・期限（23「紹介の道＋地域」） ----------

/** 人の色の種類。自分は「me」、会社のある人はその会社の最初の業種、会社が無ければ「other」 */
export function kindOfPerson(person: Pick<Person, "id" | "companyId">, viewerId: string | null = ME_ID): KindKey {
  if (person.id === viewerId) return "me";
  const company = findCompany(person.companyId);
  return company ? INDUSTRY_KIND[company.industries[0]] : "other";
}

export function kindOfCompany(company: Pick<Company, "industries">): Exclude<KindKey, "me"> {
  return INDUSTRY_KIND[company.industries[0]];
}

/**
 * 相手までの紹介の道（自分は含めない）。直接の知り合いは [相手]、知り合いの知り合いは [間の知り合い, 相手]、
 * 自分・道なしは空。画面の線は「あなた → ここに並ぶ人」の順につなぐ（直接＝実線、2人目から点線）。
 */
export function routeTo(targetId: string, meId: string = ME_ID, net: NetState = BASE_NET): Person[] {
  const target = findPerson(targetId);
  if (!target) return [];
  const rel = relationTo(targetId, meId, net);
  if (rel.kind === "direct") return [target];
  if (rel.kind === "via") return [rel.via, target];
  return [];
}

/** 案件の地域（地域名にそろえて重複なし）。入力は地域名・仮データは都道府県のどちらでも同じ結果 */
export function postRegions(post: Pick<WantPost, "areas">): string[] {
  const out: string[] = [];
  for (const a of post.areas) {
    const r = regionOf(a);
    if (r && !out.includes(r)) out.push(r);
  }
  return out;
}

/** 地域ごとの案件の数（0件の地域も入れる） */
export function regionCounts(posts: readonly WantPost[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(REGION_NAMES.map((r) => [r, 0]));
  for (const p of posts) for (const r of postRegions(p)) counts[r] += 1;
  return counts;
}

/** 直接の知り合いがいる地域（所在地の都道府県から） */
export function friendRegions(meId: string = ME_ID, net: NetState = BASE_NET): Set<string> {
  const out = new Set<string>();
  for (const id of friendsOf(meId, net)) {
    const p = findPerson(id);
    const r = p ? regionOf(p.prefecture) : null;
    if (r) out.add(r);
  }
  return out;
}

/** 地域で絞る（null＝すべて） */
export function filterByRegion(posts: readonly WantPost[], region: string | null): WantPost[] {
  return region === null ? [...posts] : posts.filter((p) => postRegions(p).includes(region));
}

export const DUE_SOON_DAYS = 7;

/** 募集期限の見せ方。7日以内は soon（赤）。期限なしは null */
export function dueInfo(deadline: string | null, today: string = todayIso()): { label: string; soon: boolean; past: boolean } | null {
  if (!deadline) return null;
  const [y, m, d] = deadline.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
  if (days < 0) return { label: "期限が過ぎました", soon: false, past: true };
  return { label: `${m}/${String(d).padStart(2, "0")}まで`, soon: days <= DUE_SOON_DAYS, past: false };
}

/** 案件に「この人を紹介する」と出せる知り合い。同じ業種の知り合いのうち、案件の地域に対応できる人を先に。いなければ null */
export function suggestIntroducee(post: WantPost, meId: string = ME_ID, net: NetState = BASE_NET): Person | null {
  const regions = postRegions(post);
  const fits = directPeople(meId, net).filter((p) => p.id !== post.authorId && companyOf(p)?.industries.includes(post.industry));
  const inArea = (p: Person) => {
    const c = companyOf(p);
    return !!c && c.areas.some((a) => regions.includes(regionOf(a) ?? ""));
  };
  return fits.find(inArea) ?? fits[0] ?? null;
}

/** 案件を近い順に並べる（自分の依頼 → 知り合い → 知り合いの知り合い → 道なし。同じ近さの中は元の並びのまま） */
export function sortByCloseness(posts: readonly WantPost[], meId: string = ME_ID, net: NetState = BASE_NET): WantPost[] {
  const rank = (p: WantPost) => (p.authorId === meId ? 0 : routeTo(p.authorId, meId, net).length || 3);
  return posts.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map((x) => x.p);
}

// ---------- 紹介の記録の見せ方（名前を入れた一文。判定は sns-network.ts） ----------

/** 「11-07」（記録の日付の見せ方） */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${m}-${d}`;
}

/** 依頼した人（自分）の画面で、まだ C の名前を出してはいけないか（つながるまで伏せる） */
function hidesTarget(rec: IntroRecord, id: string, meId: string): boolean {
  return id === rec.targetId && rec.maskedForRequester && rec.requesterId === meId && rec.status !== "connected";
}

/** 記録の中の人の呼び方（「田中 誠さん」）。自分は「あなた」。伏せるときは札（「不動産業の役員の方」） */
export function introName(rec: IntroRecord, id: string, meId: string = ME_ID): string {
  if (id === meId) return "あなた";
  const person = findPerson(id);
  if (!person) return "（不明）";
  if (hidesTarget(rec, id, meId)) return `${maskedLabel(person)}の方`;
  return `${person.name}さん`;
}

/** 記録の中の人の短い呼び方（「佐藤さん」）。自分・伏せるときは introName と同じ */
export function introShortName(rec: IntroRecord, id: string, meId: string = ME_ID): string {
  const person = findPerson(id);
  if (!person || id === meId || hidesTarget(rec, id, meId)) return introName(rec, id, meId);
  return `${shortName(person)}さん`;
}

/** いまの状態の一文（「中村さんの返事待ち」など） */
export function introStatusText(rec: IntroRecord, meId: string = ME_ID): string {
  switch (rec.status) {
    case "requested": return `${introShortName(rec, rec.introducerId, meId)}の返事待ち`;
    case "asking_target": return `${introShortName(rec, rec.targetId, meId)}の返事待ち`;
    case "connected": return "つながりました";
    case "declined_by_introducer": return `${introShortName(rec, rec.introducerId, meId)}が辞退しました`;
    case "declined_by_target": return `${introShortName(rec, rec.targetId, meId)}がお断りしました`;
  }
}

/** 履歴の1行（「11-07 田中さんが依頼」「11-07 あなたが承認（成約時 3%）」） */
export function introEventText(rec: IntroRecord, ev: IntroEvent, meId: string = ME_ID): string {
  const who = introShortName(rec, ev.byId, meId);
  const what: Record<IntroEvent["status"], string> = {
    requested: "依頼",
    asking_target: `承認（${feeText(rec.fee)}）`,
    connected: "了承（つながりました）",
    declined_by_introducer: "辞退",
    declined_by_target: "お断り",
  };
  return `${shortDate(ev.at)} ${who}が${what[ev.status]}`;
}

/** 紹介の記録に自分が入っているか（A・B・C のどれか） */
export function involvesMe(rec: IntroRecord, meId: string = ME_ID): boolean {
  return rec.requesterId === meId || rec.introducerId === meId || rec.targetId === meId;
}

/** 新しい順（最後の出来事の日付が新しい順。同じ日は後から作った記録を先に） */
export function newestFirst(records: readonly IntroRecord[]): IntroRecord[] {
  const last = (r: IntroRecord) => r.events[r.events.length - 1]?.at ?? "";
  return records.map((r, i) => ({ r, i })).sort((a, b) => (last(a.r) < last(b.r) ? 1 : last(a.r) > last(b.r) ? -1 : b.i - a.i)).map((x) => x.r);
}
