// 干支計算ユーティリティ。
// Python 側 system/python/birth/engine/utils/kanshi.py の完全移植。
// 年干支は立春境、月干支は節入り日境（簡易テーブル）、日干支は基準日からの経過日数で算出。

import {
  JIKKAN, JUNISHI, SETSU_DAYS,
  KAN_TO_GOGYO, KAN_TO_INYO, ZOUKAN_MAIN,
  type Jikkan, type Junishi, type Gogyo, type Inyo,
} from "./constants";
import { getSetsuDay } from "./setsu-by-year";

// ── 日付ユーティリティ ──────────────────────────────────────

/** 1900-01-01 を基準にした経過日数（UTC で計算してタイムゾーン依存を避ける）。 */
function daysSince1900(year: number, month: number, day: number): number {
  const base = Date.UTC(1900, 0, 1);
  const target = Date.UTC(year, month - 1, day);
  return Math.round((target - base) / 86400000);
}

// ── 節入り日（節月）判定 ──────────────────────────────────────

/** 年・月から節入り日を返す（年別テーブル優先、無い年は固定値フォールバック）。 */
function setsuDayOf(year: number, month: number): number {
  return getSetsuDay(year, month, SETSU_DAYS);
}

/**
 * 節入り日を考慮した月（節月）を返す。
 * 節入り日前ならその年の前月扱い、1月の節入り前なら 12 月扱い。
 */
export function getSetsuMonth(year: number, month: number, day: number): number {
  const setsuDay = setsuDayOf(year, month);
  if (day < setsuDay) {
    return month > 1 ? month - 1 : 12;
  }
  return month;
}

/**
 * 節入り日を考慮した年（節年）を返す。立春前なら前年扱い。
 * 算命学／四柱推命の年柱はこの節年で決まる（西暦の元日切替ではない）。
 */
export function getSetsuYear(year: number, month: number, day: number): number {
  if (month < 2 || (month === 2 && day < setsuDayOf(year, 2))) {
    return year - 1;
  }
  return year;
}

/**
 * 月支の節入り日から、対象日までの経過日数を返す（0 始まり）。
 * 例：1986/8/10 → 立秋（8/8）から 2 日目 → 2 を返す。
 * 月律分野（節気司令分日法）で蔵干を切り替える際に使う。
 */
export function getDaysSinceSetsuiri(
  year: number, month: number, day: number,
): number {
  // 節月（節入り日前なら前月扱い）
  const setsuMonth = getSetsuMonth(year, month, day);
  // 節月の節入り日が属する年・月
  let setsuYear = year;
  const setsuMonthOfDate = setsuMonth;
  if (setsuMonth > month) {
    // 1 月で節入り前の場合 → 前年 12 月の節入りが起点
    setsuYear = year - 1;
  }
  const setsuiriDay = setsuDayOf(setsuYear, setsuMonthOfDate);
  const base = Date.UTC(setsuYear, setsuMonthOfDate - 1, setsuiriDay);
  const target = Date.UTC(year, month - 1, day);
  return Math.round((target - base) / 86400000);
}

// ── 年・月・日・時の干支算出 ──────────────────────────────────

/** 年干支（節入り日考慮）。戻り値 [天干, 地支]。 */
export function getYearKanshi(year: number, month: number, day: number): [Jikkan, Junishi] {
  const y = getSetsuYear(year, month, day);
  // 紀元前考慮のため正の余りに正規化
  const kanIdx = ((y - 4) % 10 + 10) % 10;
  const shiIdx = ((y - 4) % 12 + 12) % 12;
  return [JIKKAN[kanIdx], JUNISHI[shiIdx]];
}

/**
 * 月干支。年干（節年の天干）から月干を導く五虎遁。
 * 月支：寅月＝立春後の2月節月、卯月＝啓蟄後の3月節月、…の固定マップ。
 */
export function getMonthKanshi(
  year: number,
  month: number,
  day: number,
  yearKan: Jikkan,
): [Jikkan, Junishi] {
  const setsuMonth = getSetsuMonth(year, month, day);
  // 月支：節月をそのまま地支インデックスに対応させる
  // 1月（小寒後）→丑(1)、2月（立春後）→寅(2)、3月→卯(3)、…
  const shiIdx = setsuMonth % 12;
  // 月干：年干から算出（甲己年→丙寅始まり、乙庚年→戊寅始まり、…）
  const yearKanIdx = JIKKAN.indexOf(yearKan);
  const baseKan = (yearKanIdx % 5) * 2 + 2; // 甲→丙(2)、乙→戊(4)、…
  const kanIdx = ((baseKan + setsuMonth - 2) % 10 + 10) % 10;
  return [JIKKAN[kanIdx], JUNISHI[shiIdx]];
}

/**
 * 日干支。基準日（1900-01-01＝甲戌、index 10）からの経過日数で算出。
 * JDN ベース (JDN+49)%60 と等価。1949-10-01（甲子日）からの逆算で検証済み。
 */
export function getDayKanshi(year: number, month: number, day: number): [Jikkan, Junishi] {
  const diff = daysSince1900(year, month, day);
  // 1900-01-01 は六十干支インデックス 10（甲戌）
  const kanshiIdx = ((diff + 10) % 60 + 60) % 60;
  const kanIdx = kanshiIdx % 10;
  const shiIdx = kanshiIdx % 12;
  return [JIKKAN[kanIdx], JUNISHI[shiIdx]];
}

/**
 * 時干支。hour は 0-23 の整数。
 * 時支：23-1時→子、1-3時→丑、…（2時間ごと）。
 * 時干：日干から算出（甲己日→甲子始まり、乙庚日→丙子始まり、…）。
 */
export function getHourKanshi(hour: number, dayKan: Jikkan): [Jikkan, Junishi] {
  const shiIdx = (Math.floor((hour + 1) / 2)) % 12;
  const dayKanIdx = JIKKAN.indexOf(dayKan);
  const baseKan = (dayKanIdx % 5) * 2;
  const kanIdx = ((baseKan + shiIdx) % 10 + 10) % 10;
  return [JIKKAN[kanIdx], JUNISHI[shiIdx]];
}

// ── 派生情報 ──────────────────────────────────────────────

export function kanshiToGogyo(kan: Jikkan): Gogyo {
  return KAN_TO_GOGYO[kan];
}

export function kanshiToInyo(kan: Jikkan): Inyo {
  return KAN_TO_INYO[kan];
}

/** 天干・地支から六十干支インデックス (0-59) を返す。組み合わせ不正なら -1。 */
export function getKanshiIndex(kan: Jikkan, shi: Junishi): number {
  const kanI = JIKKAN.indexOf(kan);
  const shiI = JUNISHI.indexOf(shi);
  for (let i = 0; i < 60; i++) {
    if (i % 10 === kanI && i % 12 === shiI) return i;
  }
  return -1;
}

/**
 * 空亡（天中殺）。日柱の干支が属する10干支グループに含まれない地支2つ。
 * 算命学では「天中殺」、四柱推命では「空亡」。
 */
export function getKuubou(dayKan: Jikkan, dayShi: Junishi): [Junishi, Junishi] {
  const idx = getKanshiIndex(dayKan, dayShi);
  if (idx < 0) throw new Error(`不正な干支組み合わせ: ${dayKan}${dayShi}`);
  const groupStart = Math.floor(idx / 10) * 10;
  const used = new Set<Junishi>();
  for (let i = groupStart; i < groupStart + 10; i++) {
    used.add(JUNISHI[i % 12]);
  }
  const empty = JUNISHI.filter((s) => !used.has(s));
  return [empty[0], empty[1]];
}

/** 地支から蔵干（主気）を返す。月支から月干変換を導く時などに使う。 */
export function shiToZoukan(shi: Junishi): Jikkan {
  return ZOUKAN_MAIN[shi];
}

// ── 一括算出（命式3柱）──────────────────────────────────────

export interface Pillar {
  kan: Jikkan;
  shi: Junishi;
  zoukan: Jikkan; // 地支の蔵干（主気）
}

export interface Pillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
}

/** 生年月日から3柱（年・月・日）の干支＋蔵干をまとめて算出。 */
export function getPillars(year: number, month: number, day: number): Pillars {
  const [yearKan, yearShi] = getYearKanshi(year, month, day);
  const [monthKan, monthShi] = getMonthKanshi(year, month, day, yearKan);
  const [dayKan, dayShi] = getDayKanshi(year, month, day);

  return {
    year: { kan: yearKan, shi: yearShi, zoukan: shiToZoukan(yearShi) },
    month: { kan: monthKan, shi: monthShi, zoukan: shiToZoukan(monthShi) },
    day: { kan: dayKan, shi: dayShi, zoukan: shiToZoukan(dayShi) },
  };
}
