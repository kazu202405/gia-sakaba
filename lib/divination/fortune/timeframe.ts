// 単一柱（年柱・月柱・日柱）の運勢解釈。
// balance.ts は3柱合算の総合バランス、personal.ts は本人 vs 3柱全体の総合解釈、
// timeframe.ts は「今年／今月／今日」を時間軸ごとに切り出して並べるためのテンプレ群。

import {
  KAN_TO_GOGYO, SHI_TO_GOGYO,
  GOGYO_SOUSHOU, GOGYO_SOUKOKU,
  type Gogyo, type Jikkan, type Junishi,
} from "../kanshi/constants";
import { type PersonalRelation } from "./personal";

export type TimeframeLabel = "今年" | "今月" | "今日";

// ── 汎用：1柱の運勢 ─────────────────────────────────────
export type PillarRelation =
  | "同気"        // 干も支も同じ五行（増幅）
  | "相生(干→支)" // 表が裏を生む（外から内へ）
  | "相生(支→干)" // 裏が表を生む（内から外へ）
  | "相剋(干→支)" // 表が裏を剋す（外が内を抑える）
  | "相剋(支→干)" // 裏が表を剋す（内が外を抑える）
  | "無関係";     // 上記いずれにも該当しない

export interface PillarFortune {
  label: TimeframeLabel;
  kan: Jikkan;
  shi: Junishi;
  kanGogyo: Gogyo;
  shiGogyo: Gogyo;
  relation: PillarRelation;
  /** 表に出るエネルギーの主軸となる五行（基本は干＝表）。 */
  dominant: Gogyo;
  headline: string;
  body: string;
  advice: string;
}

function detectRelation(kanGogyo: Gogyo, shiGogyo: Gogyo): PillarRelation {
  if (kanGogyo === shiGogyo) return "同気";
  if (GOGYO_SOUSHOU[kanGogyo] === shiGogyo) return "相生(干→支)";
  if (GOGYO_SOUSHOU[shiGogyo] === kanGogyo) return "相生(支→干)";
  if (GOGYO_SOUKOKU[kanGogyo] === shiGogyo) return "相剋(干→支)";
  if (GOGYO_SOUKOKU[shiGogyo] === kanGogyo) return "相剋(支→干)";
  return "無関係";
}

// 五行ごとの基本トーン（汎用解釈の素材）
const GOGYO_TONE: Record<Gogyo, { keyword: string; verb: string; risk: string }> = {
  木: { keyword: "立ち上がり・伸長", verb: "始める／伸ばす", risk: "勢いで詰めを欠く" },
  火: { keyword: "発信・拡散・熱量", verb: "広げる／見せる", risk: "過熱・摩擦が増える" },
  土: { keyword: "蓄積・地固め・育成", verb: "貯める／整える", risk: "動きが鈍る" },
  金: { keyword: "選別・締め・決断", verb: "決める／切る", risk: "硬直・冷たさが出る" },
  水: { keyword: "流動・知性・潜行", verb: "巡らせる／考える", risk: "決まらず流れる" },
};

const LABEL_OPENING: Record<TimeframeLabel, string> = {
  今年: "今年",
  今月: "今月",
  今日: "今日",
};

const RELATION_PHRASE: Record<PillarRelation, string> = {
  同気: "気が一本に重なって増幅される",
  "相生(干→支)": "表に立つ動きが内側を育てる流れ",
  "相生(支→干)": "内に溜まった力が表へ立ち上がる流れ",
  "相剋(干→支)": "表に立つ動きが内側を抑え込む構図",
  "相剋(支→干)": "内側の力が表に出るのを抑える構図",
  無関係: "二つの気が独立して並ぶ",
};

function buildAdvice(dominant: Gogyo, relation: PillarRelation): string {
  const base: Record<Gogyo, string> = {
    木: "新規・着手・伸ばす方向に時間を割く。",
    火: "発信・見せる場・対外接点を優先する。",
    土: "整える・育てる・蓄積に時間を割く。",
    金: "決める・絞る・締めに時間を割く。",
    水: "考える・調べる・流れを設計する時間を取る。",
  };
  const augment: Record<PillarRelation, string> = {
    同気: " 強度が出るぶん、一点突破で進めると効きが速い。",
    "相生(干→支)": " 表で動きながら裏側にも投資する二段構えが噛み合う。",
    "相生(支→干)": " 内側の準備・仕込みを先に固めると、表の動きが伸びる。",
    "相剋(干→支)": " 表の動きが内側を疲れさせるので、ペース配分に注意。",
    "相剋(支→干)": " 表で空回りしやすい。基盤を整えてから打って出る。",
    無関係: " 二方向の動きを別個に走らせられる余裕がある。",
  };
  return base[dominant] + augment[relation];
}

export function calculatePillarFortune(
  label: TimeframeLabel,
  kan: Jikkan,
  shi: Junishi,
): PillarFortune {
  const kanGogyo = KAN_TO_GOGYO[kan];
  const shiGogyo = SHI_TO_GOGYO[shi];
  const relation = detectRelation(kanGogyo, shiGogyo);
  // 表のエネルギーは基本は干（顕在）。支が干を剋すときだけ支が主軸を奪う。
  const dominant: Gogyo = relation === "相剋(支→干)" ? shiGogyo : kanGogyo;

  const tone = GOGYO_TONE[dominant];
  const opening = LABEL_OPENING[label];

  return {
    label,
    kan,
    shi,
    kanGogyo,
    shiGogyo,
    relation,
    dominant,
    headline: `${opening}は「${tone.keyword}」のトーン`,
    // risk は「勢いで詰めを欠く」等の動詞句なので「〜に流れる」と繋ぐと文が壊れる。
    // そのまま述語として閉じる（2026-07-29 修正・/admin/divination の表示も同時に直る）。
    body: `${opening}の主気は${dominant}。${RELATION_PHRASE[relation]}。${tone.verb}方向の動きが噛み合いやすく、放置すると${tone.risk}。`,
    advice: buildAdvice(dominant, relation),
  };
}

// ── 個別：本人 vs 1柱 ───────────────────────────────────
export interface PersonalPillarFortune {
  label: TimeframeLabel;
  selfGogyo: Gogyo;
  pillarKanGogyo: Gogyo;
  pillarShiGogyo: Gogyo;
  /** 通変（本人日干 vs 対象柱の天干）。 */
  relation: PersonalRelation;
  headline: string;
  body: string;
  advice: string;
}

function relate(self: Gogyo, target: Gogyo): PersonalRelation {
  if (self === target) return "比和";
  if (GOGYO_SOUSHOU[target] === self) return "印";
  if (GOGYO_SOUSHOU[self] === target) return "食傷";
  if (GOGYO_SOUKOKU[self] === target) return "財";
  if (GOGYO_SOUKOKU[target] === self) return "官鬼";
  throw new Error(`unreachable: ${self} vs ${target}`);
}

// 通変 × 時間軸 のテンプレ（5 × 3 = 15 パターン）
const PERSONAL_PILLAR_DESC: Record<
  TimeframeLabel,
  Record<PersonalRelation, { headline: string; body: string; advice: string }>
> = {
  今年: {
    比和: {
      headline: "自分の気と重なる1年",
      body: "今年の主気が自分と同じ五行に乗る。本来の型・本来の戦い方が噛み合いやすく、無理な変化を入れる必要はない。",
      advice: "得意な型をそのまま太らせる年。新規軸の追加より深掘りに投資する。",
    },
    印: {
      headline: "支えが厚くなる1年",
      body: "今年の気が自分を生む側に立つ。教え・人脈・情報・タイミングの援護が入りやすく、学びと仕入れの収率が高い。",
      advice: "学ぶ・任せる・任される。新規の関係構築・仕入れを年の前半に置く。",
    },
    食傷: {
      headline: "出して回す1年",
      body: "自分から外へ出していく気の年。発信・教育・量産が噛み合うが、入りより出が大きく終盤の消耗が来やすい。",
      advice: "発信量と媒体を増やす。下半期は補給・回収側の動きに切り替える。",
    },
    財: {
      headline: "獲りに行く1年",
      body: "自分が対象をコントロール側に回れる年。受注・回収・価格決定権の獲得に動きやすい。",
      advice: "獲得目標を年初に明示し、クロージング設計を先に固める。",
    },
    官鬼: {
      headline: "圧で鍛えられる1年",
      body: "外から規律・要求・プレッシャーが入る年。短期は窮屈だが、受けて立てば構造が一段強くなる類の負荷。",
      advice: "守りの体力（資金・体・組織）を先に整える。独断と感情反応を保留。",
    },
  },
  今月: {
    比和: {
      headline: "自分の気と重なる月",
      body: "月の主気が自分と同じ五行。違和感なく回る一方、クセも出やすい。同じ手で押し切れる月。",
      advice: "新規ツールより既存の型を磨く月にする。",
    },
    印: {
      headline: "援護が入る月",
      body: "外からのサポート・情報・人の縁が入る月。相談・学び・受信の収率が高い。",
      advice: "相談先・学び先を月初に固めて回す。",
    },
    食傷: {
      headline: "出す月・表現の月",
      body: "発信・提案・教える方向の動きが噛み合う月。出力が多い分、休息も先に組んでおく。",
      advice: "発信を月の前半に集中。後半は補給枠を確保。",
    },
    財: {
      headline: "獲りに行く月",
      body: "クロージング・回収・価格交渉が噛み合う月。主導権を握りに行く。",
      advice: "受注・締め・回収を月のテーマにする。",
    },
    官鬼: {
      headline: "圧がかかる月",
      body: "外圧・期限・要求が入る月。逃げると傷が残るが、受け止めれば地力が上がる。",
      advice: "守りを固め、淡々と片づける。新規拡大は控える。",
    },
  },
  今日: {
    比和: {
      headline: "自分のリズムで進める日",
      body: "今日の気は自分と同調する。いつもの型で進められるが、独りよがりに偏りやすい。",
      advice: "得意領域に集中。視点替えが要る案件は別日に。",
    },
    印: {
      headline: "支えられる日",
      body: "今日の気が自分を生んでくれる。相談・学び・受け取りに向く日。受信に徹してよい。",
      advice: "頼みごと・相談・学びを置く。受ける方が噛み合う。",
    },
    食傷: {
      headline: "出す日・表現の日",
      body: "自分から外へ出す日。発信・提案・教えが噛み合うが、夜にかけて消耗しやすい。",
      advice: "発信は早い時間帯に集中。夜は閉じる。",
    },
    財: {
      headline: "獲りに行く日",
      body: "自分が主導権を握れる日。クロージング・価格交渉・締めが噛み合う。",
      advice: "受注・回収・締めを今日に置く。譲歩は最後まで取っておく。",
    },
    官鬼: {
      headline: "圧がかかる日",
      body: "外圧・要求・規律が入る日。受け止めれば一段上がる類の負荷。重要な独断は控える。",
      advice: "守りを固め、淡々と片づける。感情反応を保留。",
    },
  },
};

export function calculatePersonalPillarFortune(
  selfDayKan: Jikkan,
  label: TimeframeLabel,
  kan: Jikkan,
  shi: Junishi,
): PersonalPillarFortune {
  const selfGogyo = KAN_TO_GOGYO[selfDayKan];
  const pillarKanGogyo = KAN_TO_GOGYO[kan];
  const pillarShiGogyo = SHI_TO_GOGYO[shi];
  // 通変は天干同士で判定（顕在エネルギーの軸）
  const relation = relate(selfGogyo, pillarKanGogyo);
  const desc = PERSONAL_PILLAR_DESC[label][relation];
  return {
    label,
    selfGogyo,
    pillarKanGogyo,
    pillarShiGogyo,
    relation,
    headline: desc.headline,
    body: desc.body,
    advice: desc.advice,
  };
}
