// 誕生日カラー — 誕生月／数秘ライフパス／西洋星座 から
// 3 系統のパーソナルカラーを総合提示。
// Python 側 engine/energy/birthday_color.py の完全移植版。

import { ZODIAC_SIGNS, ZODIAC_START_DATES, type Zodiac } from "../kanshi/constants";

export interface ColorInfo {
  name: string;
  hex: string;
  meaning: string;
}

export interface MonthColor extends ColorInfo {}

export const MONTH_COLORS: Record<number, MonthColor> = {
  1:  { name: "ガーネットレッド", hex: "#9B2335", meaning: "情熱・勇気・新たな始まり" },
  2:  { name: "アメジストパープル", hex: "#6B3FA0", meaning: "直感・精神性・高貴" },
  3:  { name: "アクアマリンブルー", hex: "#7FCDCD", meaning: "清浄・勇気・幸福" },
  4:  { name: "ダイヤモンドホワイト", hex: "#F0F0F0", meaning: "純粋・永遠・強さ" },
  5:  { name: "エメラルドグリーン", hex: "#50C878", meaning: "成長・調和・再生" },
  6:  { name: "パールホワイト", hex: "#F5F5DC", meaning: "純真・知恵・月の力" },
  7:  { name: "ルビーレッド", hex: "#E0115F", meaning: "愛・活力・王者の力" },
  8:  { name: "ペリドットグリーン", hex: "#B4C424", meaning: "太陽の力・豊穣・保護" },
  9:  { name: "サファイアブルー", hex: "#0F52BA", meaning: "真実・知恵・神聖" },
  10: { name: "オパールホワイト", hex: "#A8C3BC", meaning: "希望・創造性・多面性" },
  11: { name: "トパーズゴールド", hex: "#FFC87C", meaning: "友情・知性・温かさ" },
  12: { name: "タンザナイトブルー", hex: "#3B2F8A", meaning: "変容・直感・覚醒" },
};

export interface NumerologyColor extends ColorInfo {
  chakra: string;
}

export const NUMEROLOGY_COLORS: Record<number, NumerologyColor> = {
  1: { name: "レッド",      hex: "#FF0000", chakra: "ルートチャクラ",          meaning: "行動力・生命力" },
  2: { name: "オレンジ",    hex: "#FF8C00", chakra: "サクラルチャクラ",        meaning: "感受性・創造性" },
  3: { name: "イエロー",    hex: "#FFD700", chakra: "ソーラープレクサスチャクラ", meaning: "自信・表現力" },
  4: { name: "グリーン",    hex: "#228B22", chakra: "ハートチャクラ",          meaning: "安定・調和" },
  5: { name: "ブルー",      hex: "#4169E1", chakra: "スロートチャクラ",        meaning: "自由・コミュニケーション" },
  6: { name: "インディゴ",  hex: "#4B0082", chakra: "サードアイチャクラ",      meaning: "愛情・洞察力" },
  7: { name: "バイオレット", hex: "#8B00FF", chakra: "クラウンチャクラ",       meaning: "霊性・内省" },
  8: { name: "ローズゴールド", hex: "#B76E79", chakra: "ハイハートチャクラ",   meaning: "達成・豊かさ" },
  9: { name: "ゴールド",    hex: "#FFD700", chakra: "ソウルスターチャクラ",    meaning: "叡智・完成" },
};

export const ZODIAC_COLORS: Record<Zodiac, ColorInfo> = {
  牡羊座:   { name: "レッド",          hex: "#FF0000", meaning: "情熱・開拓精神" },
  牡牛座:   { name: "グリーン",        hex: "#228B22", meaning: "豊かさ・安定" },
  双子座:   { name: "イエロー",        hex: "#FFD700", meaning: "知性・コミュニケーション" },
  蟹座:     { name: "シルバー",        hex: "#C0C0C0", meaning: "感受性・母性" },
  獅子座:   { name: "ゴールド",        hex: "#FFD700", meaning: "威厳・創造性" },
  乙女座:   { name: "ネイビー",        hex: "#000080", meaning: "分析力・誠実さ" },
  天秤座:   { name: "ピンク",          hex: "#FF69B4", meaning: "美・調和" },
  蠍座:     { name: "ダークレッド",    hex: "#8B0000", meaning: "深い情念・変容" },
  射手座:   { name: "パープル",        hex: "#800080", meaning: "冒険・哲学" },
  山羊座:   { name: "ダークブラウン",  hex: "#654321", meaning: "堅実・伝統" },
  水瓶座:   { name: "エレクトリックブルー", hex: "#7DF9FF", meaning: "革新・独創性" },
  魚座:     { name: "シーグリーン",    hex: "#2E8B57", meaning: "直感・共感" },
};

/** 西洋星座を月日から判定。 */
export function getZodiacSign(month: number, day: number): Zodiac {
  for (let i = 0; i < ZODIAC_START_DATES.length; i++) {
    const [startM, startD] = ZODIAC_START_DATES[i];
    const [nextM, nextD] = ZODIAC_START_DATES[(i + 1) % 12];

    if (startM <= nextM) {
      const inRange =
        (month === startM && day >= startD)
        || (month > startM && month < nextM)
        || (month === nextM && day < nextD);
      if (inRange) return ZODIAC_SIGNS[i];
    } else {
      // 年をまたぐ星座（山羊座：12/22〜1/19）
      const inRange =
        (month === startM && day >= startD)
        || month > startM
        || month < nextM
        || (month === nextM && day < nextD);
      if (inRange) return ZODIAC_SIGNS[i];
    }
  }
  return ZODIAC_SIGNS[0];
}

function reduceToSingle(n: number): number {
  let v = n;
  while (v > 9) {
    v = String(v).split("").reduce((s, c) => s + Number(c), 0);
  }
  return v;
}

/** ライフパスナンバー（誕生日カラー用の簡易版・マスターナンバー無視）。 */
function calcLifePath(year: number, month: number, day: number): number {
  const digitSum = (n: number) =>
    String(n).split("").reduce((s, c) => s + Number(c), 0);
  return reduceToSingle(digitSum(year) + digitSum(month) + digitSum(day));
}

export interface BirthInput {
  year: number;
  month: number;
  day: number;
}

export interface BirthdayColorResult {
  monthColor: MonthColor;
  numerologyColor: NumerologyColor & { lifePathNumber: number };
  zodiacColor: ColorInfo & { zodiac: Zodiac };
}

export function calculateBirthdayColor(input: BirthInput): BirthdayColorResult {
  const month = input.month;
  const lifePath = calcLifePath(input.year, month, input.day);
  const zodiac = getZodiacSign(month, input.day);

  return {
    monthColor: MONTH_COLORS[month],
    numerologyColor: { ...NUMEROLOGY_COLORS[lifePath], lifePathNumber: lifePath },
    zodiacColor: { ...ZODIAC_COLORS[zodiac], zodiac },
  };
}
