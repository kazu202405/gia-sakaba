// 売上ボトルネック診断 — 項目別の施策・診断タイプ素材。
// 「商品別の売り込み」ではなく「ボトルネック診断 → 改善手段」として提示する。
// 正本: contexts/projects/gia/sales_bottleneck_diagnosis.md

import type { DimensionKey } from "./questions";

// 項目が弱いときに有効な施策（おすすめ施策チップの元）。
export const SERVICES: Record<DimensionKey, string[]> = {
  awareness: ["SNS運用設計", "ショート動画制作", "広告・LP見直し"],
  capture: ["LP改善", "LINE/CRM導入", "無料診断・資料設計"],
  meeting: ["セミナー設計", "相談・予約導線設計", "営業代行"],
  closing: ["営業資料・提案設計", "クロージング改善"],
  retention: ["紹介導線設計", "CRM・右腕AI", "会員/継続プラン設計", "商談後フォロー自動化"],
};

// AI 生成が使えない時のフォールバック用：診断タイプ名（最弱項目から）。
export const FALLBACK_TYPE_NAME: Record<DimensionKey, string> = {
  awareness: "認知・集客 伸ばしどきタイプ",
  capture: "見込み客化 伸ばしどきタイプ",
  meeting: "商談化 伸ばしどきタイプ",
  closing: "成約力 伸ばしどきタイプ",
  retention: "継続・紹介 伸ばしどきタイプ",
};

// フォールバック用：項目別の「伸ばせるポイント」ヒント（1行・前向き）。
export const FALLBACK_ISSUE: Record<DimensionKey, string> = {
  awareness:
    "見込み客との接点を増やすほど、売上の“入口”が大きく広がります。",
  capture:
    "接点を持った人をリスト化できれば、見込み客が着実に積み上がります。",
  meeting:
    "相談・商談への“きっかけ”を作るほど、商談数が伸びていきます。",
  closing:
    "提案・クロージングの型を整えるほど、成約率が上がります。",
  retention:
    "リピートと紹介の仕組みを作るほど、新規に頼らず売上が伸びます。",
};
