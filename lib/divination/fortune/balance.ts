// 年柱・月柱・日柱の干支から「その日（その月・その年）の陰陽五行的運勢」のベースとなる
// 五行バランスを算出する。6つの五行要素（年干・年支・月干・月支・日干・日支）を数えて、
// 強い五行・弱い／不在の五行・相剋関係を抽出する。
//
// このモジュールは「日付単独」で動作する（生年月日不要）。
// 生年月日との関係性は personal.ts で扱う。

import {
  KAN_TO_GOGYO, SHI_TO_GOGYO,
  GOGYO, GOGYO_SOUSHOU, GOGYO_SOUKOKU,
  type Gogyo, type Jikkan, type Junishi,
} from "../kanshi/constants";

export interface PillarTrio {
  year: { kan: Jikkan; shi: Junishi };
  month: { kan: Jikkan; shi: Junishi };
  day: { kan: Jikkan; shi: Junishi };
}

export interface FortuneBalance {
  /** 各五行の登場回数（0〜6）。合計は6。 */
  counts: Record<Gogyo, number>;
  /** 最大カウントの五行（タイなら複数）。 */
  strongest: Gogyo[];
  /** 最大カウント値（2=やや強い、3+=強い、4+=極端）。 */
  strongestCount: number;
  /** カウント0の五行（不在の五行）。 */
  absent: Gogyo[];
  /** 強い五行が剋す対象（=圧迫される五行）。 */
  oppressed: Gogyo[];
  /** 強い五行を生む側（=消耗する五行）。 */
  drained: Gogyo[];
  /** バランス度合いを 0-100 で。100=完全均衡、0=偏り極大。 */
  evenness: number;
}

export function calculateFortuneBalance(pillars: PillarTrio): FortuneBalance {
  const counts: Record<Gogyo, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  const elements = [
    KAN_TO_GOGYO[pillars.year.kan],
    SHI_TO_GOGYO[pillars.year.shi],
    KAN_TO_GOGYO[pillars.month.kan],
    SHI_TO_GOGYO[pillars.month.shi],
    KAN_TO_GOGYO[pillars.day.kan],
    SHI_TO_GOGYO[pillars.day.shi],
  ];
  for (const g of elements) counts[g]++;

  const max = Math.max(...Object.values(counts));
  const strongest = GOGYO.filter((g) => counts[g] === max);
  const absent = GOGYO.filter((g) => counts[g] === 0);

  // 強い五行が剋す対象。タイなら全部を集合で持つ。
  const oppressed = Array.from(new Set(strongest.map((g) => GOGYO_SOUKOKU[g])));
  // 強い五行を生む側（=エネルギーを取られて消耗する側）。
  const drained = Array.from(new Set(strongest.map((g) => reverseSoushou(g))));

  // バランス度：標準偏差から算出。完全均等（1.2,1.2,1.2,1.2,1.2）で 100。
  const avg = 6 / 5;
  const variance = Object.values(counts).reduce((s, c) => s + (c - avg) ** 2, 0) / 5;
  const std = Math.sqrt(variance);
  const maxStd = Math.sqrt(((6 - avg) ** 2 + 4 * avg ** 2) / 5);
  const evenness = Math.max(0, Math.round((1 - std / maxStd) * 100));

  return { counts, strongest, strongestCount: max, absent, oppressed, drained, evenness };
}

/** 「G を生むのは誰か」を相生表の逆引きで返す（G が強いとき消耗する側）。 */
function reverseSoushou(g: Gogyo): Gogyo {
  for (const [src, dst] of Object.entries(GOGYO_SOUSHOU) as [Gogyo, Gogyo][]) {
    if (dst === g) return src;
  }
  throw new Error(`unreachable: no parent for ${g}`);
}
