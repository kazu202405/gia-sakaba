// 建設・不動産の酒場の作り直し（人脈ネットワークSNS）の見本（DBなし）の仮データと、つながりの計算。
// 仕様：contexts/projects/gia/sakaba_kensetsu_sns_spec_v0.1.md。本物の /guild/<店> の画面・DBとは関係しない。
// 画面はここの値と関数だけを読む（同じ計算を画面ごとに書かない）。

export const SNS_BASE = "/guild-look/sns";
export const SNS_NAME = "建設・不動産の酒場";

/** 見本の上で切り替える色（10-30：11 深緑と真鍮／12 常磐と真鍮の二択を実機で決める）。値は sns.css の [data-palette] */
export const PALETTES = [
  { key: "fukamidori", label: "深緑" },
  { key: "tokiwa", label: "常磐" },
] as const;
export type PaletteKey = (typeof PALETTES)[number]["key"];
export const DEFAULT_PALETTE: PaletteKey = "fukamidori";

/** ホームの形（10-30：探す中心か、近況が流れるか。見本で押して比べる） */
export const HOME_STYLES = [
  { key: "search", label: "探す中心" },
  { key: "feed", label: "近況が流れる" },
] as const;
export type HomeStyle = (typeof HOME_STYLES)[number]["key"];
export const DEFAULT_HOME_STYLE: HomeStyle = "search";

export const INDUSTRIES = ["建設", "不動産", "士業", "その他"] as const;
export type Industry = (typeof INDUSTRIES)[number];

/** 探すときの地域のまとまり。対応エリアは都道府県で持ち、ここで束ねる */
export const REGIONS: Readonly<Record<string, readonly string[]>> = {
  関東: ["東京都", "神奈川県", "埼玉県", "千葉県", "茨城県", "栃木県", "群馬県"],
  関西: ["大阪府", "京都府", "兵庫県", "奈良県", "滋賀県", "和歌山県"],
  九州: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"],
};
export const REGION_NAMES = Object.keys(REGIONS);

/** 許可・免許・登録。自己申告と確認済みを混同しない（設計書5-2） */
export type License = { name: string; verified: boolean };

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
    licenses: [{ name: "建設業許可　電気工事業（特定）", verified: true }],
    about: "ビル・工場の受変電設備の更新を中心に、関東一円で工事をしています。",
    offer: ["受変電設備の更新工事", "LED改修の見積り"], want: ["九州の電気工事会社", "工場の設備担当の方"],
  },
  {
    id: "minato-setsubi", name: "有限会社ミナト設備", mark: "ミ", prefecture: "神奈川県", industries: ["建設"], business: "管工事・電気工事",
    areas: ["神奈川県", "東京都"], specialties: ["空調", "店舗の設備", "外壁改修"],
    licenses: [{ name: "建設業許可　管工事業（一般）", verified: false }],
    about: "店舗・小さなビルの空調と電気をまとめて見ています。外壁の改修も協力会社と請けます。",
    offer: ["店舗の空調・電気の工事", "外壁の改修"], want: ["横浜の不動産会社"],
  },
  {
    id: "hokushin", name: "北辰エンジニアリング", mark: "北", prefecture: "埼玉県", industries: ["建設"], business: "電気工事業",
    areas: ["埼玉県", "群馬県", "栃木県"], specialties: ["太陽光", "蓄電池"],
    licenses: [{ name: "建設業許可　電気工事業（一般）", verified: true }],
    about: "住宅・工場の太陽光と蓄電池の設置と保守。",
    offer: ["太陽光の設置・保守"], want: ["工場の屋根を持つオーナー"],
  },
  {
    id: "sato-komuten", name: "株式会社佐藤工務店", mark: "佐", prefecture: "大阪府", industries: ["建設"], business: "工務店",
    areas: ["大阪府", "京都府", "兵庫県"], specialties: ["木造の新築", "リフォーム"],
    licenses: [{ name: "建設業許可　建築工事業（一般）", verified: true }],
    about: "木造の注文住宅とリフォーム。関西で40年。",
    offer: ["木造住宅の新築・リフォーム"], want: ["関東の協力会社"],
  },
  {
    id: "nakamura-fudosan", name: "中村不動産", mark: "中", prefecture: "神奈川県", industries: ["不動産"], business: "売買仲介・賃貸管理",
    areas: ["神奈川県", "東京都"], specialties: ["一棟アパート", "収益物件"],
    licenses: [{ name: "宅地建物取引業　神奈川県知事（3）", verified: true }],
    about: "横浜を中心に、一棟アパートの売買と管理をしています。",
    offer: ["収益物件の紹介", "賃貸管理"], want: ["外壁塗装の会社", "不動産投資家"],
  },
  {
    id: "hayashi-estate", name: "林エステート", mark: "林", prefecture: "大阪府", industries: ["不動産"], business: "売買仲介・買取再販",
    areas: ["大阪府", "兵庫県"], specialties: ["事業用地", "買取再販"],
    licenses: [{ name: "宅地建物取引業　大阪府知事（2）", verified: false }],
    about: "大阪市内の事業用地と、中古の買取再販。",
    offer: ["事業用地の情報"], want: ["300坪前後の事業用地"],
  },
  {
    id: "ono-design", name: "小野設計室", mark: "小", prefecture: "福岡県", industries: ["建設", "士業"], business: "設計事務所",
    areas: ["福岡県", "佐賀県", "熊本県"], specialties: ["中古リノベ", "店舗設計"],
    licenses: [{ name: "一級建築士事務所", verified: true }],
    about: "福岡で中古住宅のリノベと店舗の設計。",
    offer: ["リノベの設計", "店舗の設計"], want: ["九州の工務店"],
  },
  {
    id: "tanaka-realty", name: "田中リアルティ", mark: "田", prefecture: "福岡県", industries: ["不動産"], business: "売買仲介",
    areas: ["福岡県", "長崎県"], specialties: ["土地", "戸建て"],
    licenses: [{ name: "宅地建物取引業　福岡県知事（1）", verified: true }],
    about: "福岡の土地と戸建ての売買。",
    offer: ["福岡の土地情報"], want: ["関東に対応できる不動産会社"],
  },
  {
    id: "mori-gyosei", name: "森行政書士事務所", mark: "森", prefecture: "東京都", industries: ["士業"], business: "行政書士",
    areas: ["東京都", "神奈川県", "埼玉県", "千葉県"], specialties: ["建設業許可", "経営事項審査"],
    licenses: [{ name: "行政書士　登録", verified: true }],
    about: "建設業許可の取得・更新と、経審の手続き。",
    offer: ["建設業許可の相談"], want: ["許可を取りたい工事会社"],
  },
];

const P = (p: Person) => p;

export const PEOPLE: readonly Person[] = [
  P({ id: ME_ID, name: "五島 一将", kana: "ごしま かずまさ", companyId: "", title: "管理者", prefecture: "大阪府", say: "困りごとは、まず聞かせてください", past: "", now: "", future: "", talk: [], offer: [], want: [], openToIntro: true, contact: { phone: "", email: "" } }),
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

export type Post =
  | { id: string; kind: "want"; authorId: string; ago: string; text: string; industry: Industry; areas: readonly string[]; detail: string; knowCount: number; canDoCount: number }
  | { id: string; kind: "news"; authorId: string; ago: string; text: string; photo: string | null; likeCount: number; commentCount: number }
  | { id: string; kind: "connected"; authorId: string; otherId: string; ago: string }
  | { id: string; kind: "profile"; authorId: string; ago: string; field: string; text: string };

export const POSTS: readonly Post[] = [
  { id: "p1", kind: "want", authorId: "nakamura", ago: "1時間前", text: "関東で一棟アパートの外壁塗装、頼める会社を探しています", industry: "建設", areas: ["東京都", "神奈川県"], detail: "木造2階建て・12戸", knowCount: 3, canDoCount: 1 },
  { id: "p2", kind: "news", authorId: "yamamoto", ago: "3時間前", text: "品川のビル、受変電の入れ替えが終わりました。夜通しの作業、みんなお疲れさまでした。", photo: "現場の写真", likeCount: 12, commentCount: 3 },
  { id: "p3", kind: "connected", authorId: "sato", otherId: "hayashi", ago: "5時間前" },
  { id: "p4", kind: "want", authorId: "hayashi", ago: "1日前", text: "大阪市内で300坪前後の事業用地を探しています", industry: "不動産", areas: ["大阪府"], detail: "物流倉庫の用地", knowCount: 1, canDoCount: 0 },
  { id: "p5", kind: "profile", authorId: "ono", ago: "2日前", field: "これから", text: "福岡で、中古のリノベを始めます。九州の工務店さんとつながりたいです。" },
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
