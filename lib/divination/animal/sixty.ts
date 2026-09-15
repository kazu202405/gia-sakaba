// 動物占い 60分類（個性心理學・弦本式）。
// 六十干支（甲子=1 〜 癸亥=60）と完全に 1 対 1 対応している。
// ユーザー（2026-05-16）から提供された正規リストをそのまま埋め込み。
//
// 各柱の干支 → 動物 を出すのは単純なインデックス引き。
// 個性心理學の 5 キャラ（本質・表面・希望・意思決定・隠れ）の計算は
// 同フォルダの koseishin.ts に分離。

import { JIKKAN, JUNISHI, type Jikkan, type Junishi } from "../kanshi/constants";
import type { BasicAnimal } from "./twelve";

export interface Animal60 {
  number: number;          // 1〜60
  kanshi: string;          // 「甲子」「乙丑」など
  name: string;            // 「長距離ランナーのチータ」など修飾子付き
  baseAnimal: BasicAnimal; // 12 基本動物名（正規表記）
}

// 60動物。配列インデックス = number - 1。
export const SIXTY_ANIMALS: Animal60[] = [
  { number: 1,  kanshi: "甲子", name: "長距離ランナーのチータ",       baseAnimal: "チータ" },
  { number: 2,  kanshi: "乙丑", name: "社交家のたぬき",               baseAnimal: "たぬき" },
  { number: 3,  kanshi: "丙寅", name: "落ち着きのない猿",             baseAnimal: "猿" },
  { number: 4,  kanshi: "丁卯", name: "フットワークの軽い子守熊",     baseAnimal: "子守熊" },
  { number: 5,  kanshi: "戊辰", name: "面倒見のいい黒ひょう",         baseAnimal: "黒ひょう" },
  { number: 6,  kanshi: "己巳", name: "愛情あふれる虎",               baseAnimal: "虎" },
  { number: 7,  kanshi: "庚午", name: "全力疾走するチータ",           baseAnimal: "チータ" },
  { number: 8,  kanshi: "辛未", name: "磨き上げられたたぬき",         baseAnimal: "たぬき" },
  { number: 9,  kanshi: "壬申", name: "大きな志をもった猿",           baseAnimal: "猿" },
  { number: 10, kanshi: "癸酉", name: "母性豊かな子守熊",             baseAnimal: "子守熊" },
  { number: 11, kanshi: "甲戌", name: "正直なこじか",                 baseAnimal: "こじか" },
  { number: 12, kanshi: "乙亥", name: "人気者のゾウ",                 baseAnimal: "ゾウ" },
  { number: 13, kanshi: "丙子", name: "ネアカの狼",                   baseAnimal: "狼" },
  { number: 14, kanshi: "丁丑", name: "協調性のないひつじ",           baseAnimal: "ひつじ" },
  { number: 15, kanshi: "戊寅", name: "どっしりとした猿",             baseAnimal: "猿" },
  { number: 16, kanshi: "己卯", name: "コアラのなかの子守熊",         baseAnimal: "子守熊" },
  { number: 17, kanshi: "庚辰", name: "強い意志をもったこじか",       baseAnimal: "こじか" },
  { number: 18, kanshi: "辛巳", name: "デリケートなゾウ",             baseAnimal: "ゾウ" },
  { number: 19, kanshi: "壬午", name: "放浪の狼",                     baseAnimal: "狼" },
  { number: 20, kanshi: "癸未", name: "物静かなひつじ",               baseAnimal: "ひつじ" },
  { number: 21, kanshi: "甲申", name: "落ち着きのあるペガサス",       baseAnimal: "ペガサス" },
  { number: 22, kanshi: "乙酉", name: "強靭な翼をもつペガサス",       baseAnimal: "ペガサス" },
  { number: 23, kanshi: "丙戌", name: "無邪気なひつじ",               baseAnimal: "ひつじ" },
  { number: 24, kanshi: "丁亥", name: "クリエイティブな狼",           baseAnimal: "狼" },
  { number: 25, kanshi: "戊子", name: "穏やかな狼",                   baseAnimal: "狼" },
  { number: 26, kanshi: "己丑", name: "粘り強いひつじ",               baseAnimal: "ひつじ" },
  { number: 27, kanshi: "庚寅", name: "波乱に満ちたペガサス",         baseAnimal: "ペガサス" },
  { number: 28, kanshi: "辛卯", name: "優雅なペガサス",               baseAnimal: "ペガサス" },
  { number: 29, kanshi: "壬辰", name: "チャレンジ精神旺盛なひつじ",   baseAnimal: "ひつじ" },
  { number: 30, kanshi: "癸巳", name: "順応性のある狼",               baseAnimal: "狼" },
  { number: 31, kanshi: "甲午", name: "リーダーとなるゾウ",           baseAnimal: "ゾウ" },
  { number: 32, kanshi: "乙未", name: "しっかり者のこじか",           baseAnimal: "こじか" },
  { number: 33, kanshi: "丙申", name: "活動的な子守熊",               baseAnimal: "子守熊" },
  { number: 34, kanshi: "丁酉", name: "気分屋の猿",                   baseAnimal: "猿" },
  { number: 35, kanshi: "戊戌", name: "頼られると嬉しいひつじ",       baseAnimal: "ひつじ" },
  { number: 36, kanshi: "己亥", name: "好感のもたれる狼",             baseAnimal: "狼" },
  { number: 37, kanshi: "庚子", name: "まっしぐらに突き進むゾウ",     baseAnimal: "ゾウ" },
  { number: 38, kanshi: "辛丑", name: "華やかなこじか",               baseAnimal: "こじか" },
  { number: 39, kanshi: "壬寅", name: "夢とロマンの子守熊",           baseAnimal: "子守熊" },
  { number: 40, kanshi: "癸卯", name: "尽くす猿",                     baseAnimal: "猿" },
  { number: 41, kanshi: "甲辰", name: "大器晩成のたぬき",             baseAnimal: "たぬき" },
  { number: 42, kanshi: "乙巳", name: "足腰の強いチータ",             baseAnimal: "チータ" },
  { number: 43, kanshi: "丙午", name: "動きまわる虎",                 baseAnimal: "虎" },
  { number: 44, kanshi: "丁未", name: "情熱的な黒ひょう",             baseAnimal: "黒ひょう" },
  { number: 45, kanshi: "戊申", name: "サービス精神旺盛な子守熊",     baseAnimal: "子守熊" },
  { number: 46, kanshi: "己酉", name: "守りの猿",                     baseAnimal: "猿" },
  { number: 47, kanshi: "庚戌", name: "人間味あふれるたぬき",         baseAnimal: "たぬき" },
  { number: 48, kanshi: "辛亥", name: "品格のあるチータ",             baseAnimal: "チータ" },
  { number: 49, kanshi: "壬子", name: "ゆったりとした悠然の虎",       baseAnimal: "虎" },
  { number: 50, kanshi: "癸丑", name: "落ち込みの激しい黒ひょう",     baseAnimal: "黒ひょう" },
  { number: 51, kanshi: "甲寅", name: "我が道を行くライオン",         baseAnimal: "ライオン" },
  { number: 52, kanshi: "乙卯", name: "統率力のあるライオン",         baseAnimal: "ライオン" },
  { number: 53, kanshi: "丙辰", name: "感情豊かな黒ひょう",           baseAnimal: "黒ひょう" },
  { number: 54, kanshi: "丁巳", name: "楽天的な虎",                   baseAnimal: "虎" },
  { number: 55, kanshi: "戊午", name: "パワフルな虎",                 baseAnimal: "虎" },
  { number: 56, kanshi: "己未", name: "気どらない黒ひょう",           baseAnimal: "黒ひょう" },
  { number: 57, kanshi: "庚申", name: "感情的なライオン",             baseAnimal: "ライオン" },
  { number: 58, kanshi: "辛酉", name: "傷つきやすいライオン",         baseAnimal: "ライオン" },
  { number: 59, kanshi: "壬戌", name: "束縛を嫌う黒ひょう",           baseAnimal: "黒ひょう" },
  { number: 60, kanshi: "癸亥", name: "慈悲深い虎",                   baseAnimal: "虎" },
];

/**
 * 干支ペア（天干＋地支）から 60 分類のインデックス（1〜60）を返す。
 * 不正な組み合わせの場合は -1 を返す。
 * 算出ロジック: 六十干支は (kan_i + 2k) % 10 == kan_i かつ (shi_i + 2k) % 12 == shi_i を満たす k で
 *               インデックス = 10k + kan_i だが、簡便に上記テーブルから引く。
 */
export function getAnimalNumber(kan: Jikkan, shi: Junishi): number {
  const kanshi = `${kan}${shi}`;
  const found = SIXTY_ANIMALS.find((a) => a.kanshi === kanshi);
  return found ? found.number : -1;
}

/** 番号（1〜60）から動物情報を返す。範囲外なら null。 */
export function getAnimalByNumber(n: number): Animal60 | null {
  if (n < 1 || n > 60) return null;
  return SIXTY_ANIMALS[n - 1];
}

/** 干支ペアから動物情報を返す。不正な組み合わせなら null。 */
export function getAnimalByKanshi(kan: Jikkan, shi: Junishi): Animal60 | null {
  const n = getAnimalNumber(kan, shi);
  return n > 0 ? SIXTY_ANIMALS[n - 1] : null;
}
