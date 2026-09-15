// 干支・五行・節気の共通定数マスター。
// 算命学／陰陽五行／タロット／カラー など複数占術から共有される基礎テーブル。
// Python 側の system/python/birth/engine/utils/constants.py の完全移植版。
// 流派依存はここに溜めず、原則「高尾義政系（算命学主流）」準拠で並べる。

export const JIKKAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const JIKKAN_READING = [
  "きのえ", "きのと", "ひのえ", "ひのと", "つちのえ",
  "つちのと", "かのえ", "かのと", "みずのえ", "みずのと",
] as const;
export type Jikkan = (typeof JIKKAN)[number];

export const JUNISHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const JUNISHI_READING = [
  "ね", "うし", "とら", "う", "たつ", "み",
  "うま", "ひつじ", "さる", "とり", "いぬ", "い",
] as const;
export type Junishi = (typeof JUNISHI)[number];

// 六十干支（甲子〜癸亥）
export const ROKUJU_KANSHI: string[] = Array.from(
  { length: 60 },
  (_, i) => JIKKAN[i % 10] + JUNISHI[i % 12],
);

export const GOGYO = ["木", "火", "土", "金", "水"] as const;
export const GOGYO_READING = ["もく", "か", "ど", "きん", "すい"] as const;
export type Gogyo = (typeof GOGYO)[number];

export type Inyo = "陽" | "陰";

// 天干→五行
export const KAN_TO_GOGYO: Record<Jikkan, Gogyo> = {
  甲: "木", 乙: "木",
  丙: "火", 丁: "火",
  戊: "土", 己: "土",
  庚: "金", 辛: "金",
  壬: "水", 癸: "水",
};

// 天干→陰陽（甲=陽干、乙=陰干 …）
export const KAN_TO_INYO: Record<Jikkan, Inyo> = {
  甲: "陽", 乙: "陰",
  丙: "陽", 丁: "陰",
  戊: "陽", 己: "陰",
  庚: "陽", 辛: "陰",
  壬: "陽", 癸: "陰",
};

// 地支→五行
export const SHI_TO_GOGYO: Record<Junishi, Gogyo> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木",
  辰: "土", 巳: "火", 午: "火", 未: "土",
  申: "金", 酉: "金", 戌: "土", 亥: "水",
};

// 地支→陰陽
export const SHI_TO_INYO: Record<Junishi, Inyo> = {
  子: "陽", 丑: "陰", 寅: "陽", 卯: "陰",
  辰: "陽", 巳: "陰", 午: "陽", 未: "陰",
  申: "陽", 酉: "陰", 戌: "陽", 亥: "陰",
};

// 五行相生（A が B を生む）
export const GOGYO_SOUSHOU: Record<Gogyo, Gogyo> = {
  木: "火", 火: "土", 土: "金", 金: "水", 水: "木",
};

// 五行相剋（A が B を剋す）
export const GOGYO_SOUKOKU: Record<Gogyo, Gogyo> = {
  木: "土", 火: "金", 土: "水", 金: "木", 水: "火",
};

// 地支→蔵干（主気）。月支変換／陽占の角配置で使う。
export const ZOUKAN_MAIN: Record<Junishi, Jikkan> = {
  子: "癸", 丑: "己", 寅: "甲", 卯: "乙",
  辰: "戊", 巳: "丙", 午: "丁", 未: "己",
  申: "庚", 酉: "辛", 戌: "戊", 亥: "壬",
};

// 地支→蔵干フル（主気・中気・余気）。陰占の命式表に縦並びで表示する。
// 配列の先頭が主気。中気・余気がある地支のみ複数要素持つ。
export const ZOUKAN_FULL: Record<Junishi, Jikkan[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

// 天干→読み（ひらがな）
export function getKanReading(kan: Jikkan): string {
  return JIKKAN_READING[JIKKAN.indexOf(kan)];
}

// 地支→読み（ひらがな）
export function getShiReading(shi: Junishi): string {
  return JUNISHI_READING[JUNISHI.indexOf(shi)];
}

// 節入り日（各月の節気の開始日）— 簡易テーブル。
// 正確には年によって 1〜2 日ずれるが、五島さんの社内鑑定用途では許容範囲。
// 厳密対応が要るなら Phase 2 で天文計算ライブラリ（lunar-javascript 等）を導入。
export const SETSU_DAYS: Record<number, number> = {
  1: 6,   // 小寒
  2: 4,   // 立春 ★年の始まり
  3: 6,   // 啓蟄
  4: 5,   // 清明
  5: 6,   // 立夏
  6: 6,   // 芒種
  7: 7,   // 小暑
  8: 8,   // 立秋
  9: 8,   // 白露
  10: 8,  // 寒露
  11: 7,  // 立冬
  12: 7,  // 大雪
};

// 西洋12星座（誕生月カラーで使用）
export const ZODIAC_SIGNS = [
  "牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座",
  "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座",
] as const;
export type Zodiac = (typeof ZODIAC_SIGNS)[number];

// 星座の境界日（開始日、月日）
export const ZODIAC_START_DATES: ReadonlyArray<[number, number]> = [
  [3, 21], [4, 20], [5, 21], [6, 21], [7, 23], [8, 23],
  [9, 23], [10, 23], [11, 22], [12, 22], [1, 20], [2, 19],
];

// 五行カラー（円グラフ・テーブル装飾用）。
// 五行の伝統色に寄せた飽和度高めのトーン。陰占テーブルの大きな漢字を
// 一目で属性が分かる強さにするため、text は地味さよりコントラスト優先。
//   - 木：植物の緑
//   - 火：朱赤
//   - 土：黄土／琥珀
//   - 金：金色（白金ではなく金属色）
//   - 水：藍／群青
export const GOGYO_COLORS: Record<Gogyo, { hex: string; bg: string; text: string }> = {
  木: { hex: "#2e8c45", bg: "#e6f1e8", text: "#1f7a3a" },
  火: { hex: "#c83232", bg: "#f7e3e3", text: "#b02626" },
  土: { hex: "#c87a2e", bg: "#f5e7d3", text: "#a86220" },
  金: { hex: "#c8a32a", bg: "#f5edd3", text: "#a88420" },
  水: { hex: "#2a72c8", bg: "#e1ebf5", text: "#1c58a8" },
};
