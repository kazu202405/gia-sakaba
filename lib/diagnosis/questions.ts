// 売上ボトルネック診断 — 質問バンク（データ）。
// 正本: contexts/projects/gia/sales_bottleneck_diagnosis.md
//
// モデル: 売上導線ファネル5項目（採点・レーダー軸）＋ 前提チェック（単価・供給／採点外フラグ）。
//   認知・集客 → 見込み客化 → 商談化 → 成約 → 継続・紹介
// 質問は特定の手法（LINE/SNS/CRM 等）に誘導しない中立な一般質問にする。
//   ＝「何を聞けばどのスコアに反映されるか」を素直に問う。施策提案は別レイヤー（proposals.ts）。
// 各選択肢は上から 3 / 2 / 1 / 0 点（「良い→悪い」の並び）。各項目3問（満点9）→ 0〜100 正規化。

export type DimensionKey =
  | "awareness" // 認知・集客力
  | "capture" // 見込み客化
  | "meeting" // 商談化力
  | "closing" // 成約力
  | "retention"; // 継続・紹介力

export interface Choice {
  label: string;
  points: 0 | 1 | 2 | 3;
}

export interface Question {
  id: string;
  text: string;
  choices: Choice[];
}

export interface Dimension {
  key: DimensionKey;
  no: number;
  title: string;
  subtitle: string;
  weight: number;
  questions: Question[];
}

// 事業規模・予算（任意・採点外）。予算に応じた打ち手の出し分けとセグメント分析に使う。
// レンジは広め＋上限高めにして「細かすぎ」を回避。
export const REVENUE_RANGES = [
  "〜100万円",
  "100〜500万円",
  "500〜1000万円",
  "1000〜5000万円",
  "5000万円〜",
] as const;
export const PROFIT_RANGES = [
  "赤字〜トントン",
  "〜100万円",
  "100〜500万円",
  "500〜1000万円",
  "1000万円〜",
] as const;
// 売上アップに使える月額予算
export const BUDGET_RANGES = [
  "かけられない・未定",
  "〜10万円",
  "10〜50万円",
  "50〜200万円",
  "200万円〜",
] as const;

export const INDUSTRIES = [
  "店舗・サービス業",
  "士業・コンサル・コーチ",
  "制作・クリエイティブ",
  "IT・オンライン",
  "物販・EC",
  "BtoB・法人向け",
  "その他",
] as const;

const choices = (
  labels: [string, string, string, string]
): Choice[] => labels.map((label, i) => ({ label, points: (3 - i) as 0 | 1 | 2 | 3 }));

export const DIMENSIONS: Dimension[] = [
  {
    key: "awareness",
    no: 1,
    title: "認知・集客力",
    subtitle: "見込み客が集まっているか",
    weight: 0.2,
    questions: [
      {
        id: "awareness-1",
        text: "毎月、新しい見込み客との接点はどれくらいある？",
        choices: choices([
          "安定して十分にある",
          "ある程度ある",
          "少し足りない",
          "ほとんどない",
        ]),
      },
      {
        id: "awareness-2",
        text: "新しい人に知ってもらう機会づくりは？",
        choices: choices([
          "継続的にできている",
          "たまにできている",
          "始めたばかり",
          "ほぼしていない",
        ]),
      },
      {
        id: "awareness-3",
        text: "見込み客が来る経路は？",
        choices: choices([
          "複数あって安定している",
          "1つはある",
          "紹介・口コミ頼みで不安定",
          "ほぼ運任せ",
        ]),
      },
    ],
  },
  {
    key: "capture",
    no: 2,
    title: "見込み客化",
    subtitle: "接点が“次”につながっているか",
    weight: 0.2,
    questions: [
      {
        id: "capture-1",
        text: "一度接点を持った人と、また連絡を取れる状態にある？",
        choices: choices([
          "ほぼ全員と取れる",
          "半分くらい",
          "一部だけ",
          "その場限りが多い",
        ]),
      },
      {
        id: "capture-2",
        text: "興味を持った人が「次の一歩」に進む流れはある？",
        choices: choices([
          "明確にある",
          "なんとなくある",
          "弱い",
          "ない",
        ]),
      },
      {
        id: "capture-3",
        text: "すぐに決めない見込み客と、関係を続けられている？",
        choices: choices([
          "続けられている",
          "たまに連絡する",
          "ほぼ放置になる",
          "追えていない",
        ]),
      },
    ],
  },
  {
    key: "meeting",
    no: 3,
    title: "商談化力",
    subtitle: "相談・商談につながっているか",
    weight: 0.2,
    questions: [
      {
        id: "meeting-1",
        text: "見込み客が具体的な相談・商談に進む割合は？",
        choices: choices(["高い", "まずまず", "低い", "ほぼない"]),
      },
      {
        id: "meeting-2",
        text: "「会って話を聞きたい」と思ってもらえる理由はある？",
        choices: choices([
          "強くある",
          "一応ある",
          "弱い",
          "ない",
        ]),
      },
      {
        id: "meeting-3",
        text: "相談・商談の機会は安定して作れている？",
        choices: choices([
          "仕組みで安定して作れる",
          "努力すれば作れる",
          "ばらつきが大きい",
          "ほぼ作れない",
        ]),
      },
    ],
  },
  {
    key: "closing",
    no: 4,
    title: "成約力",
    subtitle: "相談から契約につながっているか",
    weight: 0.2,
    questions: [
      {
        id: "closing-1",
        text: "相談・商談から成約する割合は？",
        choices: choices(["8割以上", "半分前後", "2〜3割", "1割未満"]),
      },
      {
        id: "closing-2",
        text: "提案・クロージングの進め方は？",
        choices: choices([
          "型があり安定している",
          "なんとなく型がある",
          "毎回アドリブ",
          "苦手で避けがち",
        ]),
      },
      {
        id: "closing-3",
        text: "失注（断られた）理由を把握できている？",
        choices: choices([
          "把握して改善している",
          "なんとなく分かる",
          "よく分からない",
          "考えたことがない",
        ]),
      },
    ],
  },
  {
    key: "retention",
    no: 5,
    title: "継続・紹介力",
    subtitle: "リピート・紹介が生まれているか",
    weight: 0.2,
    questions: [
      {
        id: "retention-1",
        text: "売上に占めるリピート・継続の割合は？",
        choices: choices([
          "大半",
          "半分くらい",
          "2〜3割",
          "ほぼ新規頼み",
        ]),
      },
      {
        id: "retention-2",
        text: "お客様からの紹介は生まれている？",
        choices: choices([
          "安定して生まれている",
          "たまに生まれる",
          "ほとんどない",
          "頼んだことがない",
        ]),
      },
      {
        id: "retention-3",
        text: "一度のお客様と、関係が続いている？",
        choices: choices([
          "続く仕組みがある",
          "個別に努力している",
          "自然消滅が多い",
          "売って終わりが多い",
        ]),
      },
    ],
  },
];

// ─── 前提チェック（採点・レーダー外。単価／供給のフラグ判定に使う） ───
export const PRECHECKS: Question[] = [
  {
    id: "pricing-1",
    text: "客単価は同業と比べて？",
    choices: choices(["高め", "普通", "安め", "おそらく最安級"]),
  },
  {
    id: "pricing-2",
    text: "この1年で値上げした？",
    choices: choices([
      "した",
      "予定がある",
      "したいが怖い",
      "考えていない",
    ]),
  },
  {
    id: "capacity-1",
    text: "依頼が来ても断る・待たせることは？",
    choices: choices(["ない", "めったにない", "たまにある", "よくある"]),
  },
  {
    id: "capacity-2",
    text: "手が回らず取りこぼしている感覚は？",
    choices: choices(["ない", "あまりない", "少しある", "強くある"]),
  },
];

const WEIGHT_SUM = DIMENSIONS.reduce((acc, d) => acc + d.weight, 0);
if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(`診断の重み合計が 1.0 ではありません: ${WEIGHT_SUM}`);
}
