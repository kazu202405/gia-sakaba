// 算命学 — 陰占（命式）。
// 生年月日から年柱・月柱・日柱の干支を出し、各柱の通変星・十二運星を導く。
// 鑑定書左半分の「命式テーブル」と「五行バランス」「日干説明」を生成するためのデータ層。
// 時柱は時刻入力があれば算出（任意）。

import {
  JIKKAN, JUNISHI,
  KAN_TO_GOGYO, KAN_TO_INYO,
  SHI_TO_GOGYO, SHI_TO_INYO,
  ZOUKAN_FULL,
  GOGYO,
  type Jikkan, type Junishi, type Gogyo, type Inyo,
} from "../kanshi/constants";
import {
  getPillars, getHourKanshi, getKuubou, shiToZoukan,
  type Pillars,
} from "../kanshi/calc";
import {
  TSUHEN_TO_JUDAI, JUNI_UNSEI_NAMES, CHOSHO_SHI_ACCURATE,
  type Tsuhensei, type JuniUnsei, type Judai,
} from "./descriptions";

// ── 通変星算出 ────────────────────────────────────────────

const GOGYO_ORDER: Record<Gogyo, number> = { 木: 0, 火: 1, 土: 2, 金: 3, 水: 4 };

/**
 * 日干と他の干から通変星を算出する。
 * 五行の関係（同/生む/剋す/生まれる/剋される）× 陰陽の同極性で10通り。
 */
export function getTsuhensei(dayKan: Jikkan, otherKan: Jikkan): Tsuhensei {
  const dayG = GOGYO_ORDER[KAN_TO_GOGYO[dayKan]];
  const otherG = GOGYO_ORDER[KAN_TO_GOGYO[otherKan]];
  const relation = ((otherG - dayG) % 5 + 5) % 5;

  const dayIdx = JIKKAN.indexOf(dayKan);
  const otherIdx = JIKKAN.indexOf(otherKan);
  const samePolarity = (dayIdx % 2) === (otherIdx % 2);

  const map: Record<string, Tsuhensei> = {
    "0_true": "比肩",  "0_false": "劫財",
    "1_true": "食神",  "1_false": "傷官",
    "2_true": "偏財",  "2_false": "正財",
    "3_true": "偏官",  "3_false": "正官",
    "4_true": "偏印",  "4_false": "印綬",
  };
  return map[`${relation}_${samePolarity}`];
}

/** 通変星 → 十大主星（陽占の星名）への変換。 */
export function tsuhenseiToJudai(t: Tsuhensei): Judai {
  return TSUHEN_TO_JUDAI[t];
}

// ── 十二運星算出 ────────────────────────────────────────────

/**
 * 日干と地支から十二運星（長生/沐浴/…/養）を返す。
 * 陽干は順行、陰干は逆行で 12 地支を巡る。
 */
export function getJuniUnsei(dayKan: Jikkan, shi: Junishi): JuniUnsei {
  const start = CHOSHO_SHI_ACCURATE[dayKan];
  const shiIdx = JUNISHI.indexOf(shi);
  const dayIdx = JIKKAN.indexOf(dayKan);
  const isYang = dayIdx % 2 === 0;
  const offset = isYang
    ? ((shiIdx - start) % 12 + 12) % 12
    : ((start - shiIdx) % 12 + 12) % 12;
  return JUNI_UNSEI_NAMES[offset];
}

// ── 五行バランス算出 ────────────────────────────────────────

/**
 * 命式 3柱から五行をカウントし、パーセンテージで返す。
 * 鑑定書の円グラフはこの結果から描画する。
 * 蔵干も含めてカウントする（伝統的には主気のみ、副気はオプション）。
 */
export function countGogyo(p: Pillars): Record<Gogyo, number> {
  const counts: Record<Gogyo, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const pillar of [p.year, p.month, p.day]) {
    counts[KAN_TO_GOGYO[pillar.kan]] += 1;
    counts[SHI_TO_GOGYO[pillar.shi]] += 1;
  }
  return counts;
}

export interface GogyoBalance {
  counts: Record<Gogyo, number>;
  percentages: Record<Gogyo, number>;
  strong: Gogyo[];
  weak: Gogyo[];
  flow: Gogyo[]; // 相生の流れ（上位 3 五行を相生順に並べたもの）
}

export function analyzeGogyoBalance(p: Pillars): GogyoBalance {
  const counts = countGogyo(p);
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const percentages: Record<Gogyo, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const g of GOGYO) {
    percentages[g] = total > 0 ? Math.round((counts[g] / total) * 100) : 0;
  }
  const strong = GOGYO.filter((g) => counts[g] >= 3);
  const weak = GOGYO.filter((g) => counts[g] === 0);

  // 相生の流れ：上位 3 つの五行を、相生順（木→火→土→金→水→木）で並べ替える
  const top3 = [...GOGYO]
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 3)
    .filter((g) => counts[g] > 0);
  const flow = sortBySoushou(top3);

  return { counts, percentages, strong, weak, flow };
}

/** 与えられた五行集合を相生の循環順に整列する。 */
function sortBySoushou(gs: Gogyo[]): Gogyo[] {
  const cycle: Gogyo[] = ["木", "火", "土", "金", "水"];
  if (gs.length === 0) return [];
  // どの起点なら最も自然な並びになるかを試す
  let best = gs;
  let bestScore = -1;
  for (let start = 0; start < 5; start++) {
    const ordered = cycle.slice(start).concat(cycle.slice(0, start));
    const reordered = ordered.filter((g) => gs.includes(g));
    if (reordered.length !== gs.length) continue;
    // 隣接が相生連続している数をスコアにする
    let score = 0;
    for (let i = 0; i < reordered.length - 1; i++) {
      const idxA = cycle.indexOf(reordered[i]);
      const idxB = cycle.indexOf(reordered[i + 1]);
      if ((idxA + 1) % 5 === idxB) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = reordered;
    }
  }
  return best;
}

// ── 陰占（命式テーブル）─────────────────────────────────────

/** 蔵干1つ分のメタ。主気・中気・余気を陰占テーブルに縦並びで表示するために使う。 */
export interface ZoukanEntry {
  kan: Jikkan;
  gogyo: Gogyo;
  inyo: Inyo;
  /** "主気" | "中気" | "余気" */
  role: "主気" | "中気" | "余気";
}

export interface InyoPillar {
  label: "年柱" | "月柱" | "日柱" | "時柱";
  kan: Jikkan;
  shi: Junishi;
  kanGogyo: Gogyo;
  kanInyo: Inyo;
  shiGogyo: Gogyo;
  shiInyo: Inyo;
  /** 主気 (後方互換)。陽占の人体図はこれを使う。 */
  zoukan: Jikkan;
  zoukanGogyo: Gogyo;
  zoukanInyo: Inyo;
  /** 主気＋中気＋余気を含むフル。陰占テーブルの「蔵干」行はこちらを表示する。 */
  zoukanList: ZoukanEntry[];
  tsuhensei: Tsuhensei;
  juniUnsei: JuniUnsei;
}

export interface InyoResult {
  pillars: InyoPillar[];      // 年・月・日（時刻入力ありなら +時）
  dayKan: Jikkan;
  dayGogyo: Gogyo;
  dayInyo: Inyo;
  gogyo: GogyoBalance;
  tenchuuSatsu: [Junishi, Junishi]; // 天中殺（空亡）
}

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour?: number;   // 0-23、未指定なら時柱は出さない
  minute?: number; // 0-59、現状ロジック（時支は2時間刻み）では未使用。
                   // 将来「夜子時を翌日扱い」等の流派切替で参照する余地。
}

export function calculateInyo(input: BirthInput): InyoResult {
  const pillars3 = getPillars(input.year, input.month, input.day);
  const dayKan = pillars3.day.kan;

  const buildPillar = (
    label: InyoPillar["label"],
    kan: Jikkan,
    shi: Junishi,
  ): InyoPillar => {
    const zoukan = shiToZoukan(shi);
    const fullList = ZOUKAN_FULL[shi];
    const roles: ZoukanEntry["role"][] = ["主気", "中気", "余気"];
    const zoukanList: ZoukanEntry[] = fullList.map((k, i) => ({
      kan: k,
      gogyo: KAN_TO_GOGYO[k],
      inyo: KAN_TO_INYO[k],
      role: roles[i] ?? "余気",
    }));

    return {
      label,
      kan, shi,
      kanGogyo: KAN_TO_GOGYO[kan],
      kanInyo: KAN_TO_INYO[kan],
      shiGogyo: SHI_TO_GOGYO[shi],
      shiInyo: SHI_TO_INYO[shi],
      zoukan,
      zoukanGogyo: KAN_TO_GOGYO[zoukan],
      zoukanInyo: KAN_TO_INYO[zoukan],
      zoukanList,
      tsuhensei: getTsuhensei(dayKan, kan),
      juniUnsei: getJuniUnsei(dayKan, shi),
    };
  };

  // 陰占テーブルの並び：日柱 → 月柱 → 年柱（→ 時柱）。
  // 算命学では日柱が「自分」を表す中心の柱で、左端に置く流派も多い。
  // ユーザー指定（2026-05-16）でこの順に統一。
  const pillars: InyoPillar[] = [
    buildPillar("日柱", pillars3.day.kan, pillars3.day.shi),
    buildPillar("月柱", pillars3.month.kan, pillars3.month.shi),
    buildPillar("年柱", pillars3.year.kan, pillars3.year.shi),
  ];

  // 時柱（時刻入力があれば算出、末尾に追加）
  if (typeof input.hour === "number") {
    const [hKan, hShi] = getHourKanshi(input.hour, dayKan);
    pillars.push(buildPillar("時柱", hKan, hShi));
  }

  const balance = analyzeGogyoBalance(pillars3);
  const tenchuuSatsu = getKuubou(dayKan, pillars3.day.shi);

  return {
    pillars,
    dayKan,
    dayGogyo: KAN_TO_GOGYO[dayKan],
    dayInyo: KAN_TO_INYO[dayKan],
    gogyo: balance,
    tenchuuSatsu,
  };
}
