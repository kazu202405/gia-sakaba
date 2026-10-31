// 建設・不動産の酒場の作り直し（人脈ネットワークSNS）の見本（DBなし）の仮データと、つながりの計算。
// 仕様：contexts/projects/gia/sakaba_kensetsu_sns_spec_v0.1.md。本物の /guild/<店> の画面・DBとは関係しない。
// 画面はここの値と関数だけを読む（同じ計算を画面ごとに書かない）。

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

/** 都道府県（または地域の名前）→ 地域。どちらで持っていても同じ地域にそろえる（案件の入力は地域名、仮データは都道府県） */
export function regionOf(area: string): string | null {
  if (area in REGIONS) return area;
  return REGION_NAMES.find((r) => REGIONS[r].includes(area)) ?? null;
}

/** 許可・免許・登録。自己申告と確認済みを混同しない（設計書5-2） */
/** number は名刺に書く並び（許可行政庁・番号）。見本の番号は架空 */
export type License = { name: string; number?: string; verified: boolean };

export type Company = {
  id: string;
  name: string;
  /** ロゴの代わりの1文字 */
  mark: string;
  prefecture: string;
  industries: readonly Industry[];
  /** 業種の言い方（電気工事業・売買仲介 など） */
  business: string;
  areas: readonly string[];
  specialties: readonly string[];
  licenses: readonly License[];
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
  /** 直接の知り合いにだけ見える連絡先 */
  contact: { phone: string; email: string };
};

export const ME_ID = "me";

export const COMPANIES: readonly Company[] = [
  {
    id: "yamamoto-densetsu", name: "株式会社山本電設", mark: "山", prefecture: "東京都", industries: ["建設"], business: "電気工事業",
    areas: ["東京都", "神奈川県", "埼玉県", "千葉県"], specialties: ["受変電設備", "LED改修"],
    licenses: [{ name: "電気工事業（特定）", number: "東京都知事 第12345号", verified: true }],
    about: "ビル・工場の受変電設備の更新を中心に、関東一円で工事をしています。",
    offer: ["受変電設備の更新工事", "LED改修の見積り"], want: ["九州の電気工事会社", "工場の設備担当の方"],
  },
  {
    id: "minato-setsubi", name: "有限会社ミナト設備", mark: "ミ", prefecture: "神奈川県", industries: ["建設"], business: "管工事・電気工事",
    areas: ["神奈川県", "東京都"], specialties: ["空調", "店舗の設備", "外壁改修"],
    licenses: [{ name: "管工事業（一般）", number: "神奈川県知事 第08812号", verified: false }],
    about: "店舗・小さなビルの空調と電気をまとめて見ています。外壁の改修も協力会社と請けます。",
    offer: ["店舗の空調・電気の工事", "外壁の改修"], want: ["横浜の不動産会社"],
  },
  {
    id: "hokushin", name: "北辰エンジニアリング", mark: "北", prefecture: "埼玉県", industries: ["建設"], business: "電気工事業",
    areas: ["埼玉県", "群馬県", "栃木県"], specialties: ["太陽光", "蓄電池"],
    licenses: [{ name: "電気工事業（一般）", number: "埼玉県知事 第20417号", verified: true }],
    about: "住宅・工場の太陽光と蓄電池の設置と保守。",
    offer: ["太陽光の設置・保守"], want: ["工場の屋根を持つオーナー"],
  },
  {
    id: "sato-komuten", name: "株式会社佐藤工務店", mark: "佐", prefecture: "大阪府", industries: ["建設"], business: "工務店",
    areas: ["大阪府", "京都府", "兵庫県"], specialties: ["木造の新築", "リフォーム"],
    licenses: [{ name: "建築工事業（一般）", number: "大阪府知事 第31560号", verified: true }],
    about: "木造の注文住宅とリフォーム。関西で40年。",
    offer: ["木造住宅の新築・リフォーム"], want: ["関東の協力会社"],
  },
  {
    id: "nakamura-fudosan", name: "中村不動産", mark: "中", prefecture: "神奈川県", industries: ["不動産"], business: "売買仲介・賃貸管理",
    areas: ["神奈川県", "東京都"], specialties: ["一棟アパート", "収益物件"],
    licenses: [{ name: "宅地建物取引業", number: "神奈川県知事（3）第27731号", verified: true }],
    about: "横浜を中心に、一棟アパートの売買と管理をしています。",
    offer: ["収益物件の紹介", "賃貸管理"], want: ["外壁塗装の会社", "不動産投資家"],
  },
  {
    id: "hayashi-estate", name: "林エステート", mark: "林", prefecture: "大阪府", industries: ["不動産"], business: "売買仲介・買取再販",
    areas: ["大阪府", "兵庫県"], specialties: ["事業用地", "買取再販"],
    licenses: [{ name: "宅地建物取引業", number: "大阪府知事（2）第58203号", verified: false }],
    about: "大阪市内の事業用地と、中古の買取再販。",
    offer: ["事業用地の情報"], want: ["300坪前後の事業用地"],
  },
  {
    id: "ono-design", name: "小野設計室", mark: "小", prefecture: "福岡県", industries: ["建設", "士業"], business: "設計事務所",
    areas: ["福岡県", "佐賀県", "熊本県"], specialties: ["中古リノベ", "店舗設計"],
    licenses: [{ name: "一級建築士事務所", number: "福岡県知事登録 第1-60112号", verified: true }],
    about: "福岡で中古住宅のリノベと店舗の設計。",
    offer: ["リノベの設計", "店舗の設計"], want: ["九州の工務店"],
  },
  {
    id: "tanaka-realty", name: "田中リアルティ", mark: "田", prefecture: "福岡県", industries: ["不動産"], business: "売買仲介",
    areas: ["福岡県", "長崎県"], specialties: ["土地", "戸建て"],
    licenses: [{ name: "宅地建物取引業", number: "福岡県知事（1）第19045号", verified: true }],
    about: "福岡の土地と戸建ての売買。",
    offer: ["福岡の土地情報"], want: ["関東に対応できる不動産会社"],
  },
  {
    id: "mori-gyosei", name: "森行政書士事務所", mark: "森", prefecture: "東京都", industries: ["士業"], business: "行政書士",
    areas: ["東京都", "神奈川県", "埼玉県", "千葉県"], specialties: ["建設業許可", "経営事項審査"],
    licenses: [{ name: "行政書士", number: "登録 第21081234号", verified: true }],
    about: "建設業許可の取得・更新と、経審の手続き。",
    offer: ["建設業許可の相談"], want: ["許可を取りたい工事会社"],
  },
];

const P = (p: Person) => p;

export const PEOPLE: readonly Person[] = [
  P({ id: ME_ID, name: "五島 一将", kana: "ごしま かずまさ", companyId: "", title: "管理者", prefecture: "大阪府", say: "困りごとは、まず聞かせてください",
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
  { key: "seek-work", label: "仕事を探している" },
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
  { id: "p8", kind: "want", authorId: "mori", ago: "4日前", text: "建設業許可の相談を、工事会社さんから受けたいです", category: "seek-work", industry: "士業", areas: ["東京都", "神奈川県", "埼玉県", "千葉県"], detail: "許可の新規取得・更新・経営事項審査の手続きを承ります。", deadline: null, contact: "森まで 03-0000-0009", visibility: "friends2", knowCount: 0, canDoCount: 0 },
  { id: "p9", kind: "want", authorId: "sato", ago: "5日前", text: "リフォーム前提の築古の一棟アパートを紹介したいです", category: "offer-property", industry: "不動産", areas: ["大阪府", "兵庫県"], detail: "大阪北部の木造アパートです。持ち主が手放す相談を受けています。", deadline: "2026-12-15", contact: "佐藤まで 06-0000-0004", visibility: "friends", knowCount: 0, canDoCount: 0 },
];

/** ホームの「紹介のおねがい」（自分あてに届いたもの） */
export const INCOMING_INTRO_REQUESTS: readonly { id: string; fromId: string; toId: string; note: string }[] = [
  { id: "r1", fromId: "tanaka", toId: "minato", note: "関東に移るお客さまの住み替えで、横浜の設備に強い方を探しています" },
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

export function friendsOf(id: string): string[] {
  return CONNECTIONS.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
}

export type Relation =
  | { kind: "self" }
  | { kind: "direct" }
  /** 知り合いの知り合い。via＝紹介をおねがいする知り合い */
  | { kind: "via"; via: Person }
  | { kind: "none" };

/**
 * 自分から見たその人とのつながり。紹介の道は2段まで（設計書7）。
 * 相手が紹介の道を見せない設定なら、知り合いの知り合いでも「none」にする。
 */
export function relationTo(targetId: string, meId: string = ME_ID): Relation {
  if (targetId === meId) return { kind: "self" };
  const mine = friendsOf(meId);
  if (mine.includes(targetId)) return { kind: "direct" };
  const target = findPerson(targetId);
  if (!target || !target.openToIntro) return { kind: "none" };
  const viaId = friendsOf(targetId).find((id) => mine.includes(id));
  const via = viaId ? findPerson(viaId) : null;
  return via ? { kind: "via", via } : { kind: "none" };
}

/** 会社とのつながり＝所属する人のうち、いちばん近い人 */
export function relationToCompany(companyId: string, meId: string = ME_ID): { relation: Relation; person: Person | null } {
  const rank = (r: Relation) => (r.kind === "self" ? 0 : r.kind === "direct" ? 1 : r.kind === "via" ? 2 : 3);
  let best: { relation: Relation; person: Person | null } = { relation: { kind: "none" }, person: null };
  for (const p of peopleOf(companyId)) {
    const r = relationTo(p.id, meId);
    if (rank(r) < rank(best.relation)) best = { relation: r, person: p };
  }
  return best;
}

/** つながりの一文（一覧・詳しいページで同じ言い方にする） */
export function relationText(relation: Relation): string {
  switch (relation.kind) {
    case "self": return "あなたです";
    case "direct": return "あなたの知り合いです";
    case "via": return `${shortName(relation.via)}さん経由で紹介できます`;
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
  licensedOnly: boolean;
  introducibleOnly: boolean;
};

export const EMPTY_FILTER: SearchFilter = { query: "", regions: [], industries: [], licensedOnly: false, introducibleOnly: false };

function inRegions(areas: readonly string[], regions: readonly string[]): boolean {
  if (regions.length === 0) return true;
  const prefs = regions.flatMap((r) => REGIONS[r] ?? []);
  return areas.some((a) => prefs.includes(a));
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

const RELATION_ORDER: Record<Relation["kind"], number> = { self: 3, direct: 0, via: 1, none: 2 };

/** 会社を探す。並びは「紹介できる順」（知り合い → 知り合いの知り合い → それ以外） */
export function searchCompanies(filter: SearchFilter, meId: string = ME_ID): Company[] {
  return COMPANIES.filter((c) => {
    if (!inRegions(c.areas, filter.regions)) return false;
    if (filter.industries.length > 0 && !c.industries.some((i) => filter.industries.includes(i))) return false;
    if (filter.licensedOnly && !c.licenses.some((l) => l.verified)) return false;
    const rel = relationToCompany(c.id, meId).relation;
    if (filter.introducibleOnly && rel.kind !== "direct" && rel.kind !== "via") return false;
    return matchesQuery([c.name, c.business, c.prefecture, ...c.specialties, ...c.offer, ...c.areas, ...regionsTouching(c.areas)], filter.query);
  }).sort((a, b) => RELATION_ORDER[relationToCompany(a.id, meId).relation.kind] - RELATION_ORDER[relationToCompany(b.id, meId).relation.kind]);
}

/** 人を探す。会社の対応エリア・業種・許可で絞る。自分は出さない */
export function searchPeople(filter: SearchFilter, meId: string = ME_ID): Person[] {
  return PEOPLE.filter((p) => {
    if (p.id === meId) return false;
    const c = companyOf(p);
    if (!c) return false;
    if (!inRegions(c.areas, filter.regions)) return false;
    if (filter.industries.length > 0 && !c.industries.some((i) => filter.industries.includes(i))) return false;
    if (filter.licensedOnly && !c.licenses.some((l) => l.verified)) return false;
    const rel = relationTo(p.id, meId);
    if (filter.introducibleOnly && rel.kind !== "direct" && rel.kind !== "via") return false;
    return matchesQuery([p.name, p.kana, p.say, p.now, ...p.offer, c.name, c.business, ...c.specialties, ...c.areas, ...regionsTouching(c.areas)], filter.query);
  }).sort((a, b) => RELATION_ORDER[relationTo(a.id, meId).kind] - RELATION_ORDER[relationTo(b.id, meId).kind]);
}

/** 対応エリアの見せ方。地域を丸ごと覆っていれば「関東全域」のようにまとめる */
export function areaText(areas: readonly string[]): string {
  for (const [region, prefs] of Object.entries(REGIONS)) {
    if (prefs.every((p) => areas.includes(p))) return `${region}全域`;
  }
  return areas.join("・");
}

/** 紹介のおねがいの「ひとこと」の上限 */
export const INTRO_NOTE_MAX = 200;

// ---------- 人脈 ----------

/** 直接の知り合い（相互承認済み）。ふりがなの五十音順 */
export function directPeople(meId: string = ME_ID): Person[] {
  return friendsOf(meId).flatMap((id) => {
    const p = findPerson(id);
    return p ? [p] : [];
  }).sort((a, b) => a.kana.localeCompare(b.kana, "ja"));
}

/** 知り合いの知り合い。紹介の道を見せない人は出さない（relationTo と同じ判定） */
export function secondDegreePeople(meId: string = ME_ID): Person[] {
  return PEOPLE.filter((p) => relationTo(p.id, meId).kind === "via");
}

/** 招待URL（LINEで送る）。見本のURLで、開いても何も起きない */
export const INVITE_BASE = "https://kensetsu-sakaba.example/invite";
export function inviteUrl(ownerId: string): string {
  return `${INVITE_BASE}/${ownerId}`;
}

/** 届いた紹介のおねがいへの返事（ask＝間の人に聞いてみる／decline＝お断り） */
export type IntroReply = { answer: "ask" | "decline"; note: string };

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
export function kindOfPerson(person: Pick<Person, "id" | "companyId">): KindKey {
  if (person.id === ME_ID) return "me";
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
export function routeTo(targetId: string, meId: string = ME_ID): Person[] {
  const target = findPerson(targetId);
  if (!target) return [];
  const rel = relationTo(targetId, meId);
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
export function friendRegions(meId: string = ME_ID): Set<string> {
  const out = new Set<string>();
  for (const id of friendsOf(meId)) {
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
export function suggestIntroducee(post: WantPost, meId: string = ME_ID): Person | null {
  const regions = postRegions(post);
  const fits = directPeople(meId).filter((p) => p.id !== post.authorId && companyOf(p)?.industries.includes(post.industry));
  const inArea = (p: Person) => {
    const c = companyOf(p);
    return !!c && c.areas.some((a) => regions.includes(regionOf(a) ?? ""));
  };
  return fits.find(inArea) ?? fits[0] ?? null;
}

/** 案件を近い順に並べる（自分の依頼 → 知り合い → 知り合いの知り合い → 道なし。同じ近さの中は元の並びのまま） */
export function sortByCloseness(posts: readonly WantPost[], meId: string = ME_ID): WantPost[] {
  const rank = (p: WantPost) => (p.authorId === meId ? 0 : routeTo(p.authorId, meId).length || 3);
  return posts.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map((x) => x.p);
}
