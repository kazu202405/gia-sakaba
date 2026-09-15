// 算命学 — 陽占（人体星図 + 宇宙盤）。
// 5 主星（頭・中心・腰・左手・右手）と 3 大従星（左肩・右足・左足）を導く。
// 鑑定書右半分の人体図と「陽占の特徴まとめ」を生成するためのデータ層。

import { JIKKAN, JUNISHI, type Jikkan, type Junishi } from "../kanshi/constants";
import { getPillars, getDaysSinceSetsuiri } from "../kanshi/calc";
import { getZoukanWithBunya } from "../kanshi/zoukan-bunya";
import { getTsuhensei, tsuhenseiToJudai } from "./inyo";
import {
  JUNI_UNSEI_NAMES, JUNI_TO_DAIJUSEI, CHOSHO_SHI_ACCURATE, DAIJUSEI_DESCRIPTIONS,
  type Judai, type Daijusei,
} from "./descriptions";

// ── 5 主星（人体星図）─────────────────────────────────────
// 配置ルール（高尾義政系 / 宿命多門学理 05講「陽占算出」準拠）：
//   ① head     （頭・北）   = 日干 × 年干
//   ② belly    （腹・南）   = 日干 × 月干
//   ③ center   （中心）     = 日干 × 月支蔵干
//   ④ leftHand （左手・東） = 日干 × 年支蔵干
//   ⑤ rightHand（右手・西） = 日干 × 日支蔵干
//
// ※ 三支（年・月・日）すべての蔵干を「節気司令分日法（月律分野）」で
//   切り替える。節入りからの経過日数は共通（出生月の節入り起点）で、
//   各地支の蔵干分野テーブルを参照して余気／中気／本気を決める。
//   例：1986/8/10（立秋+2日 → 全支で余気フェーズ）
//        月支申余気=戊、年支寅余気=戊、日支戌余気=辛
//   詳細：lib/divination/kanshi/zoukan-bunya.ts
// ※ 「東＝左手」「西＝右手」は人体側から見た左右。鑑定書 SVG は人体向き
//   （body-perspective）で配置するため、左手は viewer 右側、右手は viewer 左側に表示する。

export interface JintaiSeizu {
  center: Judai;     // 中心：本来の自分
  head: Judai;       // 頭・北：親／目上／上司
  belly: Judai;      // 腹・南：子供／部下
  leftHand: Judai;   // 左手・東：兄弟姉妹／友人／同僚
  rightHand: Judai;  // 右手・西：配偶者／片腕と頼む人
}

function kanToJudai(dayKan: Jikkan, otherKan: Jikkan): Judai {
  return tsuhenseiToJudai(getTsuhensei(dayKan, otherKan));
}

export function buildJintaiSeizu(
  dayKan: Jikkan,
  monthKan: Jikkan, yearKan: Jikkan,
  dayShi: Junishi, monthShi: Junishi, yearShi: Junishi,
  daysSinceSetsuiri: number,
): JintaiSeizu {
  // 三支すべて節入りからの日数で蔵干を切り替える。
  // 各支の蔵干分野テーブル（lib/divination/kanshi/zoukan-bunya.ts）を参照。
  const monthZoukan = getZoukanWithBunya(monthShi, daysSinceSetsuiri);
  const yearZoukan = getZoukanWithBunya(yearShi, daysSinceSetsuiri);
  const dayZoukan = getZoukanWithBunya(dayShi, daysSinceSetsuiri);

  return {
    center: kanToJudai(dayKan, monthZoukan),
    head: kanToJudai(dayKan, yearKan),
    belly: kanToJudai(dayKan, monthKan),
    leftHand: kanToJudai(dayKan, yearZoukan),
    rightHand: kanToJudai(dayKan, dayZoukan),
  };
}

// ── 3 大従星（宇宙盤の角・人体図上の補助位置）────────────────
// 配置ルール（高尾義政系）：
//   leftShoulder（左肩）= 日干 × 年支 → 年柱大従星
//   rightFoot  （右足）= 日干 × 日支 → 日柱大従星
//   leftFoot   （左足）= 日干 × 月支 → 月柱大従星
// エネルギー合計は 3 つの大従星エネルギー値を足したもの（1〜36 のレンジ）。

function getDaijusei(dayKan: Jikkan, shi: Junishi): Daijusei {
  const start = CHOSHO_SHI_ACCURATE[dayKan];
  const shiIdx = JUNISHI.indexOf(shi);
  const dayIdx = JIKKAN.indexOf(dayKan);
  const isYang = dayIdx % 2 === 0;
  const offset = isYang
    ? ((shiIdx - start) % 12 + 12) % 12
    : ((start - shiIdx) % 12 + 12) % 12;
  const unsei = JUNI_UNSEI_NAMES[offset];
  return JUNI_TO_DAIJUSEI[unsei];
}

export interface Uchuban {
  leftShoulder: Daijusei;  // 年柱：目上からの援助・先祖縁
  rightFoot: Daijusei;     // 日柱：自分自身のエネルギー
  leftFoot: Daijusei;      // 月柱：現実社会での処世
  totalEnergy: number;     // 3 大従星のエネルギー合計
}

export function buildUchuban(
  dayKan: Jikkan, yearShi: Junishi, monthShi: Junishi, dayShi: Junishi,
): Uchuban {
  const leftShoulder = getDaijusei(dayKan, yearShi);
  const rightFoot = getDaijusei(dayKan, dayShi);
  const leftFoot = getDaijusei(dayKan, monthShi);
  const totalEnergy =
    DAIJUSEI_DESCRIPTIONS[leftShoulder].energy
    + DAIJUSEI_DESCRIPTIONS[rightFoot].energy
    + DAIJUSEI_DESCRIPTIONS[leftFoot].energy;

  return { leftShoulder, rightFoot, leftFoot, totalEnergy };
}

// ── 陽占の総合結果 ──────────────────────────────────────────

export interface YojoResult {
  jintai: JintaiSeizu;
  uchuban: Uchuban;
  /** 中心星以外でユニークな主星（重複は除外）。陽占の特徴まとめで参照する。 */
  otherStars: Judai[];
}

export function calculateYojo(year: number, month: number, day: number): YojoResult {
  const p = getPillars(year, month, day);
  const dayKan = p.day.kan;
  const daysSinceSetsuiri = getDaysSinceSetsuiri(year, month, day);

  const jintai = buildJintaiSeizu(
    dayKan,
    p.month.kan, p.year.kan,
    p.day.shi, p.month.shi, p.year.shi,
    daysSinceSetsuiri,
  );
  const uchuban = buildUchuban(dayKan, p.year.shi, p.month.shi, p.day.shi);

  const others = new Set<Judai>();
  for (const pos of ["head", "belly", "leftHand", "rightHand"] as const) {
    const s = jintai[pos];
    if (s !== jintai.center) others.add(s);
  }

  return {
    jintai,
    uchuban,
    otherStars: Array.from(others),
  };
}
