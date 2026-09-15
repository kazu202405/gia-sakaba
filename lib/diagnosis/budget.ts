// 予算（選択レンジ or 自由入力）→ その予算でできる施策の目安。
// レポートにルールベースで即表示する（AI生成に依存しない）。

export interface BudgetTactics {
  heading: string;
  items: string[];
  note?: string;
}

const TIERS: Record<"none" | "low" | "mid" | "high" | "top", BudgetTactics> = {
  none: {
    heading: "まずはお金をかけずにできること",
    items: [
      "既存のお客様・知人へ紹介をお願いする",
      "SNSやブログで発信を始める（無料）",
      "問い合わせ→次の一歩（LINE登録・無料相談）の導線を整える",
      "放置している見込み客に再連絡する",
    ],
  },
  low: {
    heading: "〜月10万円：自分でできる低コスト施策",
    items: [
      "SNS運用・ショート動画を自分で継続",
      "LP・プロフィールの見直し（自作 / 安価ツール）",
      "LINE公式・メールでリスト化の仕組み",
      "スポットで小さく広告テスト",
    ],
  },
  mid: {
    heading: "月10〜50万円：部分外注・小さく投資",
    items: [
      "制作（動画・LP）の一部を外注",
      "広告を少額から運用してデータを取る",
      "CRM・予約導線などツール導入",
      "営業資料・提案書の整備",
    ],
  },
  high: {
    heading: "月50〜200万円：継続外注・仕組み化",
    items: [
      "SNS運用代行・広告運用を継続委託",
      "集客〜商談の導線をまとめて設計",
      "セミナー・定期コンテンツの発信",
      "紹介の仕組み化・CRM本格導入",
    ],
  },
  top: {
    heading: "月200万円〜：採用・本格投資",
    items: [
      "人材採用・専属チーム化",
      "複数チャネルを同時に運用",
      "システム / プロダクト開発で仕組み化",
      "ブランディング・大型施策",
    ],
  },
};

// 全角数字→半角＋カンマ除去
function normalizeNum(s: string): string {
  return s
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/,/g, "");
}

// 自由入力から月額（円）をざっくり推定。読めなければ null。
function parseYen(raw: string): number | null {
  const s = normalizeNum(raw);
  const oku = s.match(/([0-9.]+)\s*億/);
  if (oku) return Math.round(parseFloat(oku[1]) * 1e8);
  const man = s.match(/([0-9.]+)\s*万/);
  if (man) return Math.round(parseFloat(man[1]) * 1e4);
  const yen = s.match(/([0-9]+)\s*円/);
  if (yen) return parseInt(yen[1], 10);
  const bare = s.match(/([0-9]+)/);
  if (bare) return parseInt(bare[1], 10); // 単位なしは円とみなす
  return null;
}

export function budgetTactics(budget: string): BudgetTactics | null {
  const b = (budget ?? "").trim();
  if (!b) return null;

  // 「かけられない・未定」
  if (b.includes("かけられない") || b.includes("未定")) return TIERS.none;

  // プリセットのレンジ
  if (b === "〜10万円") return TIERS.low;
  if (b === "10〜50万円") return TIERS.mid;
  if (b === "50〜200万円") return TIERS.high;
  if (b === "200万円〜") return TIERS.top;

  // 自由入力：金額を推定して帯に振る
  const yen = parseYen(b);
  if (yen == null) {
    return {
      heading: "予算別の打ち手の目安",
      items: [
        "〜月10万円：SNS・動画を自分で／LP・リスト化の整備",
        "月10〜50万円：制作やLPを一部外注／広告を小さくテスト",
        "月50〜200万円：運用代行・導線設計をまとめて委託",
        "月200万円〜：採用・チーム化・本格投資",
      ],
      note: `入力された予算（${b}）に近いところを目安にしてください。`,
    };
  }
  if (yen < 100000) return TIERS.low;
  if (yen < 500000) return TIERS.mid;
  if (yen < 2000000) return TIERS.high;
  return TIERS.top;
}
