// 動物占い（個性心理學）5アニマル算出。
//
// ロジック（2026-05-17 doubutsu-uranai.com 公式サイトで5アニマル全件検証）：
//   本質     = 日柱の干支の十二運 → 12動物（さらに本質のみ 60 分類で深掘り）
//   表面     = 日干 vs 月柱地支 の十二運 → 12動物
//   意思決定 = 日干 vs 年柱地支 の十二運 → 12動物
//   希望     = 月干 vs 月支 の十二運 → 12動物（**簡易式**：五島さん等の一部のみ一致。
//             弦本流の正式アルゴリズムは非公開で、日柱＋月柱の組合せに依存することは判明。
//             正式テーブル化は将来課題：[[project_animal_hope_lookup_table_todo]]）
//   隠れ     = 日柱の60干支インデックス → 12動物（HIDDEN_ANIMAL_BY_DAYKANSHI 固定テーブル）
//
// 詳細：memory/reference_animal_divination_logic.md

import { getJuniUnsei } from "../sanmei/inyo";
import type { JuniUnsei } from "../sanmei/descriptions";
import { JIKKAN, JUNISHI, type Jikkan, type Junishi } from "../kanshi/constants";
import {
  JUNI_TO_ANIMAL, HIDDEN_ANIMAL_BY_DAYKANSHI, ANIMAL_PROFILES,
  type BasicAnimal, type AnimalProfile,
} from "./twelve";
import { getAnimalByKanshi, type Animal60 } from "./sixty";

export type CharacterRole = "本質" | "意思決定" | "表面" | "隠れ" | "希望";

export interface KoseishinCharacter {
  role: CharacterRole;
  animal: BasicAnimal;          // 12 動物名（本質も含めて必ず入る）
  profile: AnimalProfile;       // 12 動物のプロファイル
  juniUnsei: JuniUnsei | null;  // 算出元の十二運（隠れは null）
  source: string;               // 計算式の説明（UI 表示用）
  /** 本質キャラのみ 60 分類の詳細が入る（修飾子付き動物名・番号）。 */
  sixty?: Animal60;
  /** 算出不可（隠れキャラなど）の場合 true。 */
  unresolved?: boolean;
}

const ROLE_DESCRIPTIONS: Record<CharacterRole, string> = {
  本質:     "生まれ持った本来の自分。一人でいるとき・心を許した相手の前で出る素の姿。",
  意思決定: "判断するときの軸・決め方の癖。重要な決断を下す瞬間に出る性格。",
  表面:     "他人から見られる外向きの顔。第一印象や社交の場で表れる雰囲気。",
  隠れ:     "自分でも気づきにくい無意識のキャラ。窮地で顔を出すと言われる。",
  希望:     "人生で求めるもの・理想の姿。どんな自分になりたいかという憧れ。",
};

/** 日柱の天干・地支から 60干支インデックス (0=甲子 〜 59=癸亥) を返す。 */
function dayKanshiIndex(dayKan: Jikkan, dayShi: Junishi): number {
  const ki = JIKKAN.indexOf(dayKan);
  const si = JUNISHI.indexOf(dayShi);
  for (let i = 0; i < 60; i++) {
    if (i % 10 === ki && i % 12 === si) return i;
  }
  throw new Error(`不正な日柱: ${dayKan}${dayShi}`);
}

/**
 * 日柱・月柱・年柱の干支から動物占い 5 アニマルを算出する。
 * 並びは [本質, 意思決定, 表面, 隠れ, 希望]。
 * 希望は弦本流非公開のため unresolved=true で「調整中」表示。
 * 正式化の手順：[[project_animal_hope_lookup_table_todo]]
 */
export function calculateKoseishin(
  dayKan: Jikkan, dayShi: Junishi,
  monthKan: Jikkan, monthShi: Junishi,
  yearKan: Jikkan, yearShi: Junishi,
): KoseishinCharacter[] {
  // 本質：日柱の干と地支の十二運
  const essenceUnsei = getJuniUnsei(dayKan, dayShi);
  const essenceAnimal = JUNI_TO_ANIMAL[essenceUnsei];
  const essenceSixty = getAnimalByKanshi(dayKan, dayShi) ?? undefined;

  // 意思決定：日干 vs 年支の十二運
  const decisionUnsei = getJuniUnsei(dayKan, yearShi);
  const decisionAnimal = JUNI_TO_ANIMAL[decisionUnsei];

  // 表面：日干 vs 月支の十二運
  const surfaceUnsei = getJuniUnsei(dayKan, monthShi);
  const surfaceAnimal = JUNI_TO_ANIMAL[surfaceUnsei];

  // 隠れ：日柱の60干支インデックスから固定テーブル（doubutsu-uranai.com 逆算済）
  const hiddenIdx = dayKanshiIndex(dayKan, dayShi);
  const hiddenAnimal = HIDDEN_ANIMAL_BY_DAYKANSHI[hiddenIdx];

  return [
    {
      role: "本質",
      animal: essenceAnimal,
      profile: ANIMAL_PROFILES[essenceAnimal],
      juniUnsei: essenceUnsei,
      source: `日柱 ${dayKan}${dayShi} の十二運（${essenceUnsei}）`,
      sixty: essenceSixty,
    },
    {
      role: "意思決定",
      animal: decisionAnimal,
      profile: ANIMAL_PROFILES[decisionAnimal],
      juniUnsei: decisionUnsei,
      source: `日干 ${dayKan} × 年支 ${yearShi}（${decisionUnsei}）`,
    },
    {
      role: "表面",
      animal: surfaceAnimal,
      profile: ANIMAL_PROFILES[surfaceAnimal],
      juniUnsei: surfaceUnsei,
      source: `日干 ${dayKan} × 月支 ${monthShi}（${surfaceUnsei}）`,
    },
    {
      role: "隠れ",
      animal: hiddenAnimal,
      profile: ANIMAL_PROFILES[hiddenAnimal],
      juniUnsei: null,
      source: `日柱 ${dayKan}${dayShi}（60干支テーブル）`,
    },
    {
      role: "希望",
      // 弦本流の正式アルゴリズム（日柱×月柱の独自テーブル）は非公開のため、調整中として placeholder 表示。
      animal: "狼", // ダミー（unresolved=true なので UI には出ない）
      profile: ANIMAL_PROFILES["狼"],
      juniUnsei: null,
      source: "正式アルゴリズム調整中",
      unresolved: true,
    },
  ];
}

export { ROLE_DESCRIPTIONS };
