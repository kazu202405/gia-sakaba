// 数秘術（ピタゴラス式ヌメロロジー）。
// ライフパスナンバー（人生のテーマ）、バースデーナンバー（生まれ持った才能）、
// パーソナルイヤー（対象年のテーマ）、ピナクル／チャレンジナンバーを算出。
// Python 側 engine/western/numerology.py の完全移植版。

const MASTER_NUMBERS = new Set([11, 22, 33]);

export const LIFE_PATH_MEANINGS: Record<number, string> = {
  1: "リーダーシップ・独立・開拓精神。自分の道を切り開く先駆者。",
  2: "協調・調和・パートナーシップ。人と人をつなぐ橋渡し役。",
  3: "創造性・表現力・社交性。芸術的才能と喜びを広げる人。",
  4: "安定・堅実・努力。確実な基盤を築く実務家。",
  5: "自由・変化・冒険。多様な経験を通じて成長する人。",
  6: "愛情・責任・奉仕。家庭やコミュニティを守る人。",
  7: "探究・内省・精神性。真理を追い求める思索家。",
  8: "達成・権威・豊かさ。物質的・精神的成功を目指す人。",
  9: "博愛・完成・叡智。人類への奉仕と精神的完成を目指す人。",
  11: "【マスターナンバー】直感・霊感・啓示。高い理想とビジョンを持つ人。",
  22: "【マスターナンバー】大規模建設・実現力。壮大なビジョンを形にする人。",
  33: "【マスターナンバー】無条件の愛・癒し。高次の奉仕と慈悲の人。",
};

function digitSum(n: number | string): number {
  return String(n).split("").reduce((s, c) => s + (Number(c) || 0), 0);
}

/** 数字を 1 桁に還元する（マスターナンバー 11/22/33 は保持）。 */
function reduceToSingle(n: number): number {
  let v = n;
  while (v > 9 && !MASTER_NUMBERS.has(v)) v = digitSum(v);
  return v;
}

export interface BirthInput {
  year: number;
  month: number;
  day: number;
}

export interface PinnacleNumber {
  period: string;
  number: number;
}

export interface NumerologyResult {
  lifePathNumber: number;
  lifePathMeaning: string;
  birthdayNumber: number;       // 生まれた日を還元（人生の才能）
  personalYear: number;          // 対象年のテーマ
  personalYearTarget: number;
  pinnacleNumbers: PinnacleNumber[];
  challengeNumbers: number[];
  isMasterNumber: boolean;
}

function lifePathNumber(b: BirthInput): number {
  const y = reduceToSingle(digitSum(b.year));
  const m = reduceToSingle(b.month);
  const d = reduceToSingle(b.day);
  return reduceToSingle(y + m + d);
}

function birthdayNumber(day: number): number {
  return reduceToSingle(day);
}

function personalYear(b: BirthInput, targetYear: number): number {
  const m = reduceToSingle(b.month);
  const d = reduceToSingle(b.day);
  const y = reduceToSingle(digitSum(targetYear));
  return reduceToSingle(m + d + y);
}

function pinnacleNumbers(b: BirthInput): PinnacleNumber[] {
  const m = reduceToSingle(b.month);
  const d = reduceToSingle(b.day);
  const y = reduceToSingle(digitSum(b.year));
  const lp = lifePathNumber(b);
  const firstEnd = 36 - lp;

  return [
    { period: `誕生〜${firstEnd}歳`,                       number: reduceToSingle(m + d) },
    { period: `${firstEnd}歳〜${firstEnd + 9}歳`,           number: reduceToSingle(d + y) },
    { period: `${firstEnd + 9}歳〜${firstEnd + 18}歳`,      number: reduceToSingle(reduceToSingle(m + d) + reduceToSingle(d + y)) },
    { period: `${firstEnd + 18}歳〜`,                       number: reduceToSingle(m + y) },
  ];
}

function challengeNumbers(b: BirthInput): number[] {
  const m = reduceToSingle(b.month);
  const d = reduceToSingle(b.day);
  const y = reduceToSingle(digitSum(b.year));
  const c1 = Math.abs(m - d);
  const c2 = Math.abs(d - y);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(m - y);
  return [c1, c2, c3, c4];
}

export function calculateNumerology(
  input: BirthInput,
  targetYear: number = new Date().getFullYear(),
): NumerologyResult {
  const lp = lifePathNumber(input);
  return {
    lifePathNumber: lp,
    lifePathMeaning: LIFE_PATH_MEANINGS[lp] ?? "",
    birthdayNumber: birthdayNumber(input.day),
    personalYear: personalYear(input, targetYear),
    personalYearTarget: targetYear,
    pinnacleNumbers: pinnacleNumbers(input),
    challengeNumbers: challengeNumbers(input),
    isMasterNumber: MASTER_NUMBERS.has(lp),
  };
}
