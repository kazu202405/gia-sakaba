// 個別運勢：本人の日干（命式の主役）と、対象日の3柱（年・月・日）との関係から
// 「自分にとっての今日（その月・その年）」を解釈する。
//
// 五行関係（通変星の粗いまとめ）：
//   比和 ─ 同じ五行（自分と同じエネルギー）
//   印  ─ 対象が自分を生む（追い風・サポート）
//   食傷 ─ 自分が対象を生む（出力・消耗）
//   財  ─ 自分が対象を剋す（獲得・コントロール）
//   官鬼 ─ 対象が自分を剋す（圧力・規律）

import {
  KAN_TO_GOGYO, SHI_TO_GOGYO,
  GOGYO_SOUSHOU, GOGYO_SOUKOKU,
  type Gogyo, type Jikkan, type Junishi,
} from "../kanshi/constants";

export type PersonalRelation = "比和" | "印" | "食傷" | "財" | "官鬼";

export interface PersonalFortune {
  /** 本人の日干の五行（命式の主役）。 */
  selfGogyo: Gogyo;
  /** 対象日の日干との関係（最重要）。 */
  vsDay: PersonalRelation;
  /** 対象日の月柱（その月の主気）との関係。 */
  vsMonth: PersonalRelation;
  /** 対象日の年柱（その年の主気）との関係。 */
  vsYear: PersonalRelation;
  /** 総合コメント（日柱関係から導出）。 */
  headline: string;
  /** 本文（2〜3文）。 */
  body: string;
  /** 行動ヒント。 */
  advice: string;
}

/** 自分の五行 vs 対象の五行 → 関係を返す。 */
function relate(self: Gogyo, target: Gogyo): PersonalRelation {
  if (self === target) return "比和";
  if (GOGYO_SOUSHOU[target] === self) return "印";   // 対象→自分（自分は生まれる側）
  if (GOGYO_SOUSHOU[self] === target) return "食傷"; // 自分→対象（自分は生む側）
  if (GOGYO_SOUKOKU[self] === target) return "財";   // 自分→対象（自分が剋す）
  if (GOGYO_SOUKOKU[target] === self) return "官鬼"; // 対象→自分（自分が剋される）
  // ここに来ない想定（5五行の関係は必ず上記5つのどれか）
  throw new Error(`unreachable: ${self} vs ${target}`);
}

interface RelationDesc {
  headline: string;
  body: string;
  advice: string;
}

const RELATION_DESC: Record<PersonalRelation, RelationDesc> = {
  比和: {
    headline: "自分と同じ気が流れる日",
    body: "今日の気質は自分の本来の気質と同調する。違和感なくいつものペースで進められる一方、独りよがりにもなりやすい。",
    advice: "得意な型で勝負する日。違う視点が必要な案件は別日に置く。",
  },
  印: {
    headline: "支えられる・追い風の日",
    body: "今日の気が自分を生んでくれる。情報・人脈・タイミングの援護が入りやすく、相談ごとや学びがよく入る。受け取りに徹しても構わない。",
    advice: "頼みごと・相談・学びを置く。攻めるよりも受ける方が噛み合う。",
  },
  食傷: {
    headline: "出す日・表現の日",
    body: "自分から外へ出していく気の日。発信・提案・教えることに向く反面、エネルギーが出ていく分、終盤に消耗が来やすい。",
    advice: "発信・提案・指導を午前〜午後の早めに集中させ、夜は閉じる。",
  },
  財: {
    headline: "獲りに行く日・成果を取る日",
    body: "自分が対象をコントロール側に回れる日。営業のクロージング、価格交渉、案件の主導権を握る動きが噛み合う。",
    advice: "クロージング・受注・回収・締めを置く。譲歩は最後の最後まで取っておく。",
  },
  官鬼: {
    headline: "圧がかかる・試される日",
    body: "外から規律・要求・プレッシャーが入る日。逃げると傷を負うが、受けて立てば一段上がる類の負荷。重要な意思決定や独断は控える。",
    advice: "守りを固める。やるべきことを淡々と片づけ、感情的反応を保留する。",
  },
};

export function calculatePersonalFortune(
  selfDayKan: Jikkan,
  target: {
    year: { kan: Jikkan; shi: Junishi };
    month: { kan: Jikkan; shi: Junishi };
    day: { kan: Jikkan; shi: Junishi };
  },
): PersonalFortune {
  const self = KAN_TO_GOGYO[selfDayKan];
  // 各柱は天干＋地支があるが、最重要は天干（顕在のエネルギー）。
  // 解釈の主軸は日干 vs 対象日の日干。年柱・月柱は補助情報。
  const vsDay = relate(self, KAN_TO_GOGYO[target.day.kan]);
  const vsMonth = relate(self, KAN_TO_GOGYO[target.month.kan]);
  const vsYear = relate(self, KAN_TO_GOGYO[target.year.kan]);

  const d = RELATION_DESC[vsDay];

  return {
    selfGogyo: self,
    vsDay,
    vsMonth,
    vsYear,
    headline: d.headline,
    body: d.body,
    advice: d.advice,
  };
}
