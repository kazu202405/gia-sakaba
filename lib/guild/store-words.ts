// 画面に出す言葉を、店ごとに差し替える仕組み（唯一の入口）。
// 表は lib/guild/words/ の店ごとのファイル。キーは全店で同じ。画面コードは文字を直書きせず、店の w("キー") から読む。
//  - 値の中の「{名前}」は、呼び出し側が w("キー", { 名前: 値 }) で差し込む（文を語の差し込みで組むと日本語が崩れる所は、文ごと表に持つ）
//  - GIAの酒場の値は、昔の画面の文字と同じ（words-gia-snapshot.test.ts が見張る）
// 呼び名の5語（クエスト・パーティなど）は stores.ts の terms。ここは、それで足りない言い回しの表。

import type { GIA_WORDS } from "./words/gia";

export type WordKey = keyof typeof GIA_WORDS;
export type StoreWords = Record<WordKey, string>;
export type WordVars = Record<string, string | number>;
export type Wording = (key: WordKey, vars?: WordVars) => string;

/** 「{名前}」を差し込む。渡されなかった名前は、そのまま残る（画面を止めない。見つけやすいようにテストが両店の穴を数える） */
export function fillWords(text: string, vars?: WordVars): string {
  if (!vars) return text;
  return text.replace(/\{([A-Za-z0-9_]+)\}/g, (whole, name: string) => (Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole));
}

export function makeWording(words: StoreWords): Wording {
  return (key, vars) => fillWords(words[key], vars);
}
