// 売上ボトルネック診断 — 採点エンジン（純関数）。
// 即時に出す部分（スコア・ランク・レーダー・前提フラグ・施策）をここで算出する。
// 診断タイプ説明・課題Top3・STEPは AI 生成（app/api/diagnosis/report）に委譲。
// 正本: contexts/projects/gia/sales_bottleneck_diagnosis.md

import { DIMENSIONS, type Dimension, type DimensionKey } from "./questions";
import { SERVICES, FALLBACK_TYPE_NAME } from "./proposals";

export type Rank = "S" | "A" | "B" | "C";
export type Answers = Record<string, number>;

export interface DimensionResult {
  key: DimensionKey;
  no: number;
  title: string;
  subtitle: string;
  score: number; // 0〜100
}

export interface Flag {
  active: boolean;
  message: string;
}

export interface DiagnosisResult {
  total: number; // 0〜100
  rank: Rank;
  rankState: string; // 状態の一言（ヘッダー右）
  rankTag: string; // ランク下の短いタグ
  dimensions: DimensionResult[];
  bottleneck: DimensionResult; // 最弱
  secondWeakest: DimensionResult;
  fallbackTypeName: string; // AI未生成時の診断タイプ名
  pricing: Flag; // 単価フラグ
  supply: Flag; // 供給フラグ（需要vs供給ゲート込み）
  recommendedServices: string[]; // おすすめ施策チップ
}

export function rankFor(total: number): Rank {
  if (total >= 85) return "S";
  if (total >= 70) return "A";
  if (total >= 50) return "B";
  return "C";
}

const RANK_STATE: Record<Rank, string> = {
  S: "売上導線が整っています",
  A: "かなり良い状態。あと少しで大きく伸びます",
  B: "伸ばせるポイントがいくつかあります",
  C: "伸びしろが大きく、仕組み化で大きく変わります",
};

const RANK_TAG: Record<Rank, string> = {
  S: "好調・維持タイプ",
  A: "あと一歩タイプ",
  B: "伸びしろ集中改善タイプ",
  C: "仕組み化 急務タイプ",
};

function dimensionScore(dim: Dimension, answers: Answers): number {
  const max = dim.questions.length * 3;
  const sum = dim.questions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
  return Math.round((sum / max) * 100);
}

export function scoreDiagnosis(answers: Answers): DiagnosisResult {
  const dimensions: DimensionResult[] = DIMENSIONS.map((dim) => ({
    key: dim.key,
    no: dim.no,
    title: dim.title,
    subtitle: dim.subtitle,
    score: dimensionScore(dim, answers),
  }));

  const total = Math.round(
    DIMENSIONS.reduce((acc, dim, i) => acc + dimensions[i].score * dim.weight, 0)
  );
  const rank = rankFor(total);

  // 弱い順（同点は no が小さい＝上流を優先）
  const sorted = [...dimensions].sort(
    (a, b) => a.score - b.score || a.no - b.no
  );
  const bottleneck = sorted[0];
  const secondWeakest = sorted[1] ?? sorted[0];

  // ─── 前提フラグ（採点外・単価/供給） ───
  const p1 = answers["pricing-1"] ?? 3;
  const p2 = answers["pricing-2"] ?? 3;
  const pricingLow = p1 <= 1 || p2 <= 1;
  const pricing: Flag = {
    active: pricingLow,
    message:
      "単価が相場より低い可能性。同じ導線でも利益が薄くなります。値上げや上位商品づくりも並行して検討を。",
  };

  const c1 = answers["capacity-1"] ?? 3;
  const c2 = answers["capacity-2"] ?? 3;
  const capacityTight = c1 <= 1 || c2 <= 1;
  const awareness = dimensions.find((d) => d.key === "awareness")!;
  // 需要vs供給ゲート: 捌けていない かつ 集客は足りている → 集客より体制
  const supplyGate = capacityTight && awareness.score >= 70;
  const supply: Flag = {
    active: capacityTight,
    message: supplyGate
      ? "需要はあるのに捌けていません（需要 > 供給）。集客を増やす前に、仕組み化・外注・採用で“捌く力”を。今広告を増やすのは逆効果です。"
      : "人手・キャパに余裕が少なめです。施策を増やす前に、仕組み化・外注で取りこぼしを防ぐ余地があります。",
  };

  // ─── おすすめ施策（弱い2項目の施策＋前提フラグの施策・重複排除・最大6） ───
  const services: string[] = [];
  const push = (arr: string[]) => {
    for (const s of arr) if (!services.includes(s)) services.push(s);
  };
  push(SERVICES[bottleneck.key]);
  push(SERVICES[secondWeakest.key]);
  if (pricingLow) push(["値づけ・上位商品づくり"]);
  if (capacityTight) push(["仕組み化・外注/採用"]);
  const recommendedServices = services.slice(0, 6);

  return {
    total,
    rank,
    rankState: RANK_STATE[rank],
    rankTag: RANK_TAG[rank],
    dimensions,
    bottleneck,
    secondWeakest,
    fallbackTypeName: FALLBACK_TYPE_NAME[bottleneck.key],
    pricing,
    supply,
    recommendedServices,
  };
}

// ─── AI 生成レポートの型（app/api/diagnosis/report が返す） ───
export interface ReportItem {
  title: string;
  detail: string;
}
export interface DiagnosisReportContent {
  type: { name: string; description: string };
  issues: ReportItem[]; // 現在の主なボトルネック（最大3）
  steps: ReportItem[]; // 優先して取り組むべきこと（最大3）
}
