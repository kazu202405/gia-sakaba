// タロット誕生日カード（大アルカナ22枚）。
// パーソナリティカード（YYYYMMDD 桁合計）、ソウルカード（更に1桁還元）、
// イヤーカード（誕生月＋誕生日＋対象年の桁合計）の 3 枚を導く。
// Python 側 engine/symbol/tarot_birthday.py の完全移植版。

export interface MajorArcana {
  number: number;   // 0〜21
  name: string;     // 「愚者」「魔術師」など
  keyword: string;
  meaning: string;
}

export const MAJOR_ARCANA: MajorArcana[] = [
  { number: 0,  name: "愚者", keyword: "自由・冒険・無限の可能性", meaning: "既成概念にとらわれず自由に生きる。無邪気さと冒険心が人生を導く。" },
  { number: 1,  name: "魔術師", keyword: "創造・意志・スキル", meaning: "優れた技術と意志の力で現実を創造する。コミュニケーション能力に長ける。" },
  { number: 2,  name: "女教皇", keyword: "直感・神秘・内なる知恵", meaning: "深い直感力と内なる知恵を持つ。静かな力で真理を見抜く。" },
  { number: 3,  name: "女帝", keyword: "豊穣・美・母性", meaning: "豊かな創造力と包容力。美と愛を通じて周囲を潤す。" },
  { number: 4,  name: "皇帝", keyword: "権威・安定・リーダーシップ", meaning: "確固たる意志と統率力。秩序と安定を築くリーダー。" },
  { number: 5,  name: "教皇", keyword: "教え・伝統・精神性", meaning: "知恵と慈悲の指導者。伝統を守りつつ人々を導く。" },
  { number: 6,  name: "恋人", keyword: "選択・調和・パートナーシップ", meaning: "重要な選択を通じて成長する。人間関係の調和を重視。" },
  { number: 7,  name: "戦車", keyword: "勝利・意志力・前進", meaning: "強い意志で障害を乗り越える。勝利への情熱と行動力。" },
  { number: 8,  name: "力", keyword: "内なる力・忍耐・勇気", meaning: "優しさの中に秘めた強さ。忍耐と勇気で困難を克服。" },
  { number: 9,  name: "隠者", keyword: "探究・内省・知恵", meaning: "真理を求めて内なる旅をする。深い洞察力と精神的成熟。" },
  { number: 10, name: "運命の輪", keyword: "転機・チャンス・サイクル", meaning: "人生の大きな転機を経験する。変化の波に乗る力。" },
  { number: 11, name: "正義", keyword: "公正・真実・バランス", meaning: "正しさを追求し公平な判断を下す。因果応報の理解者。" },
  { number: 12, name: "吊るされた男", keyword: "視点転換・犠牲・悟り", meaning: "異なる視点から物事を見る力。犠牲を通じた精神的成長。" },
  { number: 13, name: "死神", keyword: "変容・終わりと始まり・再生", meaning: "古いものを手放し新しく生まれ変わる力。根本的な変容。" },
  { number: 14, name: "節制", keyword: "調和・バランス・統合", meaning: "対立するものを調和させる力。忍耐強くバランスを保つ。" },
  { number: 15, name: "悪魔", keyword: "束縛からの解放・欲望・物質", meaning: "物質世界の誘惑と向き合い、真の自由を見出す力。" },
  { number: 16, name: "塔", keyword: "崩壊・啓示・解放", meaning: "既存の構造を壊して真実を明らかにする。劇的な変化の力。" },
  { number: 17, name: "星", keyword: "希望・インスピレーション・癒し", meaning: "困難の後に訪れる希望の光。直感とインスピレーションの源。" },
  { number: 18, name: "月", keyword: "幻想・潜在意識・不安", meaning: "潜在意識の深い世界を探求する。直感と想像力の持ち主。" },
  { number: 19, name: "太陽", keyword: "成功・喜び・活力", meaning: "明るいエネルギーと成功の運。周囲に喜びと活力をもたらす。" },
  { number: 20, name: "審判", keyword: "覚醒・復活・使命", meaning: "人生の使命に目覚める。過去を清算し新たなステージへ。" },
  { number: 21, name: "世界", keyword: "完成・達成・統合", meaning: "すべてが統合された完成の境地。世界との一体感。" },
];

const BY_NUMBER = new Map<number, MajorArcana>(MAJOR_ARCANA.map((c) => [c.number, c]));

function digitSum(n: number | string): number {
  return String(n).split("").reduce((s, c) => s + (Number(c) || 0), 0);
}

/** 0〜21 のアルカナ範囲に還元。22 は 0（愚者）にマッピング。 */
function reduceToArcana(n: number): number {
  let v = n;
  while (v > 22) v = digitSum(v);
  if (v === 22) v = 0;
  return v;
}

/** 1〜9 の 1 桁に還元（マスターナンバーは扱わない）。 */
function reduceToSingleDigit(n: number): number {
  let v = n;
  while (v > 9) v = digitSum(v);
  return v;
}

export interface TarotBirthdayResult {
  personalityCard: MajorArcana;
  soulCard: MajorArcana;
  yearCard: MajorArcana;
  targetYear: number;
}

export interface BirthInput {
  year: number;
  month: number;
  day: number;
}

export function calculateTarotBirthday(
  input: BirthInput,
  targetYear: number = new Date().getFullYear(),
): TarotBirthdayResult {
  // パーソナリティ：YYYYMMDD 全桁合計をアルカナ範囲へ
  const dateStr = `${input.year}${String(input.month).padStart(2, "0")}${String(input.day).padStart(2, "0")}`;
  const personalityNum = reduceToArcana(digitSum(dateStr));

  // ソウル：パーソナリティが 2 桁なら 1 桁に還元
  const soulNum = personalityNum >= 10 ? reduceToSingleDigit(personalityNum) : personalityNum;

  // イヤー：(月 + 日 + 対象年の桁合計) をアルカナ範囲へ
  const yearNum = reduceToArcana(input.month + input.day + digitSum(targetYear));

  return {
    personalityCard: BY_NUMBER.get(personalityNum)!,
    soulCard: BY_NUMBER.get(soulNum)!,
    yearCard: BY_NUMBER.get(yearNum)!,
    targetYear,
  };
}
