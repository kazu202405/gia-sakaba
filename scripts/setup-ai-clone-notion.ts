/**
 * AI Clone Notion DB Setup Script
 *
 * 親ページ「AI Clone OS」配下に22個のDBを一括作成する。
 *   - Core OS層: 7DB
 *   - Hub層:    3DB
 *   - Memory層: 9DB
 *   - Review層: 3DB
 * その後、リレーションを一括設定する。
 *
 * 使い方:
 *   cd system/react/gia-next
 *   npx tsx scripts/setup-ai-clone-notion.ts
 *
 * 前提:
 *   - .env.local に NOTION_AI_CLONE_SETUP_TOKEN=ntn_... が設定済み
 *   - 親ページ「AI Clone OS」と4つのサブページが手動で作成済み
 *   - 親ページに該当インテグレーションが「コネクト」追加済み
 */

import { Client } from "@notionhq/client";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================
// 設定
// ============================================================
const PARENT_PAGE_ID = "89122101-5005-4a8c-9406-821d1beed79a";

const LAYER_TITLES = {
  core_os: "1. Core OS｜正式情報",
  hub: "2. Hub｜親DB",
  memory: "3. Memory｜日々の蓄積",
  review: "4. Review｜整理・昇格",
} as const;

type Layer = keyof typeof LAYER_TITLES;

// ============================================================
// .env.local 手動ロード（dotenv 依存なし）
// ============================================================
function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("[setup] .env.local が見つかりません:", envPath);
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const TOKEN = process.env.NOTION_AI_CLONE_SETUP_TOKEN;
if (!TOKEN) {
  console.error(
    "❌ NOTION_AI_CLONE_SETUP_TOKEN が .env.local に設定されていません。"
  );
  console.error(
    "   .env.local に NOTION_AI_CLONE_SETUP_TOKEN=ntn_... を追加してください。"
  );
  process.exit(1);
}

const notion = new Client({ auth: TOKEN });

// ============================================================
// スキーマ型定義
// ============================================================
type PropDef =
  | { name: string; kind: "title" }
  | { name: string; kind: "rich_text" }
  | { name: string; kind: "number" }
  | { name: string; kind: "select"; options?: string[] }
  | { name: string; kind: "multi_select"; options?: string[] }
  | { name: string; kind: "date" }
  | { name: string; kind: "checkbox" }
  | { name: string; kind: "people" }
  | { name: string; kind: "formula"; expression: string }
  | { name: string; kind: "created_time" }
  | { name: string; kind: "last_edited_time" };

type RelationDef = { name: string; targetKey: string };

type DbDef = {
  key: string;
  displayName: string;
  layer: Layer;
  properties: PropDef[];
  relations: RelationDef[];
};

const TIMESTAMPS: PropDef[] = [
  { name: "作成日時", kind: "created_time" },
  { name: "更新日時", kind: "last_edited_time" },
];

// ============================================================
// 22DB の定義
// ============================================================
const DBS: DbDef[] = [
  // === Core OS (7) ===
  {
    key: "mission_db",
    displayName: "01_ミッション・理念",
    layer: "core_os",
    properties: [
      { name: "名称", kind: "title" },
      { name: "ミッション", kind: "rich_text" },
      { name: "価値観", kind: "multi_select" },
      { name: "目指す世界", kind: "rich_text" },
      { name: "やらないこと", kind: "rich_text" },
      { name: "お客様に届けたい価値", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [],
  },
  {
    key: "three_year_plan_db",
    displayName: "02_3年計画",
    layer: "core_os",
    properties: [
      { name: "計画名", kind: "title" },
      { name: "3年後の理想状態", kind: "rich_text" },
      { name: "事業の柱", kind: "multi_select" },
      { name: "収益モデル", kind: "rich_text" },
      { name: "作りたい資産", kind: "rich_text" },
      { name: "やめたい働き方", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [],
  },
  {
    key: "annual_kpi_db",
    displayName: "03_単年計画・今年のKPI",
    layer: "core_os",
    properties: [
      { name: "年度", kind: "title" },
      { name: "今年の重点テーマ", kind: "rich_text" },
      { name: "売上目標", kind: "number" },
      { name: "月額課金目標", kind: "number" },
      { name: "商談数", kind: "number" },
      { name: "投稿数", kind: "number" },
      { name: "セミナー数", kind: "number" },
      { name: "導入件数", kind: "number" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "関連週次レビュー", targetKey: "weekly_review_db" },
      { name: "関連月次レビュー", targetKey: "monthly_review_db" },
    ],
  },
  {
    key: "decision_principle_db",
    displayName: "04_判断基準",
    layer: "core_os",
    properties: [
      { name: "判断名", kind: "title" },
      { name: "判断カテゴリ", kind: "select" },
      { name: "判断ルール", kind: "rich_text" },
      { name: "理由", kind: "rich_text" },
      { name: "優先度", kind: "select", options: ["高", "中", "低"] },
      { name: "例外条件", kind: "rich_text" },
      { name: "関連する価値観", kind: "multi_select" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "関連判断履歴", targetKey: "decision_log_db" },
      { name: "関連更新待ちルール", targetKey: "pending_rule_db" },
    ],
  },
  {
    key: "tone_rule_db",
    displayName: "05_口調・対応ルール",
    layer: "core_os",
    properties: [
      { name: "ルール名", kind: "title" },
      { name: "基本の口調", kind: "rich_text" },
      { name: "丁寧さ", kind: "select" },
      { name: "NG表現", kind: "rich_text" },
      { name: "返信の長さ", kind: "select" },
      { name: "提案前に必ず確認すること", kind: "rich_text" },
      { name: "押し売り感を出さないルール", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [],
  },
  {
    key: "ng_decision_db",
    displayName: "06_NG判断・確認ルール",
    layer: "core_os",
    properties: [
      { name: "領域名", kind: "title" },
      {
        name: "領域",
        kind: "select",
        options: [
          "契約金額",
          "法的判断",
          "税務判断",
          "医療・投資助言",
          "クレーム対応",
          "重大な約束",
          "本人確認",
        ],
      },
      { name: "AIに任せない理由", kind: "rich_text" },
      { name: "必須エスカレ先", kind: "rich_text" },
      { name: "確認手順", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [],
  },
  {
    key: "faq_db",
    displayName: "08_FAQ・返答案",
    layer: "core_os",
    properties: [
      { name: "質問", kind: "title" },
      { name: "基本回答", kind: "rich_text" },
      { name: "補足", kind: "rich_text" },
      { name: "注意点", kind: "rich_text" },
      { name: "最終確認が必要か", kind: "checkbox" },
      ...TIMESTAMPS,
    ],
    relations: [],
  },

  // === Hub (3) ===
  {
    key: "service_db",
    displayName: "07_サービス・商品",
    layer: "hub",
    properties: [
      { name: "サービス名", kind: "title" },
      { name: "対象者", kind: "rich_text" },
      { name: "解決する悩み", kind: "rich_text" },
      { name: "提供内容", kind: "rich_text" },
      { name: "料金", kind: "rich_text" },
      { name: "導入の流れ", kind: "rich_text" },
      { name: "よくある質問", kind: "rich_text" },
      { name: "提案に向く相手", kind: "rich_text" },
      { name: "提案しない方がいい相手", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "関連案件", targetKey: "project_db" },
      { name: "関連FAQ", targetKey: "faq_db" },
      { name: "関連ナレッジ", targetKey: "knowledge_candidate_db" },
    ],
  },
  {
    key: "person_db",
    displayName: "09_人物",
    layer: "hub",
    properties: [
      { name: "名前", kind: "title" },
      { name: "会社名", kind: "rich_text" },
      { name: "役職", kind: "rich_text" },
      { name: "関係性", kind: "select" },
      { name: "重要度", kind: "select", options: ["S", "A", "B", "C"] },
      { name: "信頼度", kind: "select" },
      { name: "温度感", kind: "select" },
      { name: "紹介元", kind: "rich_text" },
      { name: "紹介先", kind: "rich_text" },
      { name: "関心ごと", kind: "multi_select" },
      { name: "課題", kind: "rich_text" },
      { name: "注意点", kind: "rich_text" },
      { name: "次のアクション", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "関連案件", targetKey: "project_db" },
      { name: "関連会話ログ", targetKey: "conversation_log_db" },
      { name: "関連活動ログ", targetKey: "activity_log_db" },
      { name: "関連経費", targetKey: "expense_db" },
    ],
  },
  {
    key: "project_db",
    displayName: "10_案件",
    layer: "hub",
    properties: [
      { name: "案件名", kind: "title" },
      {
        name: "ステータス",
        kind: "select",
        options: ["リード", "提案", "受注", "進行中", "完了", "失注"],
      },
      { name: "提案金額", kind: "number" },
      { name: "受注金額", kind: "number" },
      { name: "売上合計", kind: "number" },
      { name: "原価・経費合計", kind: "number" },
      {
        name: "粗利",
        kind: "formula",
        expression: 'prop("売上合計") - prop("原価・経費合計")',
      },
      {
        name: "粗利率",
        kind: "formula",
        expression:
          'if(prop("売上合計") > 0, (prop("売上合計") - prop("原価・経費合計")) / prop("売上合計"), 0)',
      },
      { name: "投下時間", kind: "number" },
      {
        name: "時間単価",
        kind: "formula",
        expression:
          'if(prop("投下時間") > 0, prop("売上合計") / prop("投下時間"), 0)',
      },
      { name: "次アクション", kind: "rich_text" },
      { name: "判断待ち", kind: "rich_text" },
      { name: "期限", kind: "date" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "顧客・関係者", targetKey: "person_db" },
      { name: "関連サービス", targetKey: "service_db" },
      { name: "関連会話ログ", targetKey: "conversation_log_db" },
      { name: "関連活動ログ", targetKey: "activity_log_db" },
      { name: "関連タスク", targetKey: "task_db" },
      { name: "関連判断履歴", targetKey: "decision_log_db" },
    ],
  },

  // === Memory (9) ===
  {
    key: "conversation_log_db",
    displayName: "12_会話ログ",
    layer: "memory",
    properties: [
      { name: "日時", kind: "title" },
      { name: "発言者", kind: "select" },
      {
        name: "チャンネル",
        kind: "select",
        options: ["Slack", "LINE", "Email", "対面", "電話"],
      },
      { name: "会話内容", kind: "rich_text" },
      { name: "要約", kind: "rich_text" },
      {
        name: "用途タグ",
        kind: "multi_select",
        options: [
          "営業",
          "経営判断",
          "顧客対応",
          "案件管理",
          "ナレッジ化",
          "タスク化",
        ],
      },
      { name: "重要度", kind: "select", options: ["S", "A", "B", "C"] },
      { name: "次アクション", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "関連人物", targetKey: "person_db" },
      { name: "関連案件", targetKey: "project_db" },
      { name: "関連サービス", targetKey: "service_db" },
    ],
  },
  {
    key: "person_note_db",
    displayName: "13_人物メモ",
    layer: "memory",
    properties: [
      { name: "日時", kind: "title" },
      { name: "内容", kind: "rich_text" },
      { name: "関心ごと", kind: "multi_select" },
      { name: "課題", kind: "rich_text" },
      { name: "温度感", kind: "select" },
      { name: "注意点", kind: "rich_text" },
      { name: "次の接点", kind: "date" },
      { name: "反映状態", kind: "checkbox" },
      ...TIMESTAMPS,
    ],
    relations: [{ name: "関連人物", targetKey: "person_db" }],
  },
  {
    key: "project_progress_log_db",
    displayName: "14_案件進捗ログ",
    layer: "memory",
    properties: [
      { name: "日時", kind: "title" },
      { name: "進捗内容", kind: "rich_text" },
      { name: "現在の状態", kind: "select" },
      { name: "課題", kind: "rich_text" },
      { name: "次のアクション", kind: "rich_text" },
      { name: "判断が必要なこと", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [{ name: "関連案件", targetKey: "project_db" }],
  },
  {
    key: "task_db",
    displayName: "15_タスク",
    layer: "memory",
    properties: [
      { name: "タスク名", kind: "title" },
      { name: "期限", kind: "date" },
      { name: "優先度", kind: "select", options: ["高", "中", "低"] },
      {
        name: "ステータス",
        kind: "select",
        options: ["未着手", "進行中", "完了", "保留"],
      },
      { name: "発生元ログ", kind: "rich_text" },
      { name: "目的", kind: "rich_text" },
      { name: "対応者", kind: "people" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "関連人物", targetKey: "person_db" },
      { name: "関連案件", targetKey: "project_db" },
    ],
  },
  {
    key: "activity_log_db",
    displayName: "16_活動ログ",
    layer: "memory",
    properties: [
      { name: "日付", kind: "title" },
      { name: "活動内容", kind: "rich_text" },
      {
        name: "活動種別",
        kind: "select",
        options: [
          "初回面談",
          "商談",
          "紹介依頼",
          "既存顧客フォロー",
          "パートナー打合せ",
          "会食",
          "現地調査",
          "作業",
          "納品",
        ],
      },
      { name: "所要時間", kind: "number" },
      { name: "移動時間", kind: "number" },
      { name: "費用", kind: "number" },
      { name: "結果", kind: "rich_text" },
      { name: "次アクション", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "相手", targetKey: "person_db" },
      { name: "関連案件", targetKey: "project_db" },
    ],
  },
  {
    key: "expense_db",
    displayName: "17_経費",
    layer: "memory",
    properties: [
      { name: "日付", kind: "title" },
      { name: "金額", kind: "number" },
      {
        name: "カテゴリ",
        kind: "select",
        options: [
          "交通費",
          "会議費",
          "交際費",
          "通信費",
          "ツール代",
          "広告費",
          "外注費",
          "家賃",
          "光熱費",
          "学習費",
        ],
      },
      { name: "支払先", kind: "rich_text" },
      { name: "目的", kind: "rich_text" },
      { name: "固定費or変動費", kind: "select", options: ["固定", "変動"] },
      { name: "メモ", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "関連人物", targetKey: "person_db" },
      { name: "関連案件", targetKey: "project_db" },
    ],
  },
  {
    key: "revenue_db",
    displayName: "18_売上",
    layer: "memory",
    properties: [
      { name: "日付", kind: "title" },
      { name: "顧客", kind: "rich_text" },
      { name: "売上金額", kind: "number" },
      { name: "入金予定日", kind: "date" },
      {
        name: "入金状態",
        kind: "select",
        options: ["未入金", "一部入金", "入金済"],
      },
      { name: "備考", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "関連案件", targetKey: "project_db" },
      { name: "関連サービス", targetKey: "service_db" },
    ],
  },
  {
    key: "decision_log_db",
    displayName: "19_判断履歴",
    layer: "memory",
    properties: [
      { name: "日時", kind: "title" },
      { name: "判断テーマ", kind: "rich_text" },
      { name: "結論", kind: "rich_text" },
      { name: "判断理由", kind: "rich_text" },
      { name: "重視した価値観", kind: "multi_select" },
      { name: "次回使える判断ルール", kind: "rich_text" },
      { name: "Core OS反映候補", kind: "checkbox" },
      ...TIMESTAMPS,
    ],
    relations: [
      { name: "関連人物", targetKey: "person_db" },
      { name: "関連案件", targetKey: "project_db" },
      { name: "関連KPI", targetKey: "annual_kpi_db" },
    ],
  },
  {
    key: "knowledge_candidate_db",
    displayName: "20_ナレッジ候補",
    layer: "memory",
    properties: [
      { name: "内容", kind: "title" },
      {
        name: "種別",
        kind: "select",
        options: [
          "FAQ候補",
          "営業トーク候補",
          "サービス説明候補",
          "判断基準候補",
          "業務マニュアル候補",
          "NGルール候補",
        ],
      },
      { name: "反映候補先", kind: "select" },
      { name: "優先度", kind: "select", options: ["高", "中", "低"] },
      { name: "元ログ", kind: "rich_text" },
      {
        name: "確認状態",
        kind: "select",
        options: ["未確認", "確認中", "反映済", "却下"],
      },
      ...TIMESTAMPS,
    ],
    relations: [],
  },

  // === Review (3) ===
  {
    key: "pending_rule_db",
    displayName: "21_更新待ちルール",
    layer: "review",
    properties: [
      { name: "追加・変更したいルール", kind: "title" },
      {
        name: "ルール種別",
        kind: "select",
        options: ["判断基準", "口調・NG", "サービス情報", "FAQ", "その他"],
      },
      { name: "理由", kind: "rich_text" },
      { name: "反映先DB", kind: "select" },
      { name: "元ログ", kind: "rich_text" },
      {
        name: "承認状態",
        kind: "select",
        options: ["申請中", "承認", "却下", "保留"],
      },
      { name: "承認者", kind: "people" },
      ...TIMESTAMPS,
    ],
    relations: [],
  },
  {
    key: "weekly_review_db",
    displayName: "22_週次レビュー",
    layer: "review",
    properties: [
      { name: "対象期間", kind: "title" },
      { name: "今週の重要判断", kind: "rich_text" },
      { name: "進んだ案件", kind: "rich_text" },
      { name: "止まっている案件", kind: "rich_text" },
      { name: "新しく見えた判断基準", kind: "rich_text" },
      { name: "関係性の変化", kind: "rich_text" },
      { name: "来週の優先タスク", kind: "rich_text" },
      { name: "Core OSに反映すべきこと", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [],
  },
  {
    key: "monthly_review_db",
    displayName: "23_月次レビュー",
    layer: "review",
    properties: [
      { name: "対象月", kind: "title" },
      { name: "売上", kind: "number" },
      { name: "経費", kind: "number" },
      {
        name: "粗利",
        kind: "formula",
        expression: 'prop("売上") - prop("経費")',
      },
      { name: "時間を使った上位人物", kind: "rich_text" },
      { name: "時間を使った上位案件", kind: "rich_text" },
      { name: "利益率が高い案件", kind: "rich_text" },
      { name: "利益率が低い案件", kind: "rich_text" },
      { name: "減らすべき活動", kind: "rich_text" },
      { name: "増やすべき活動", kind: "rich_text" },
      { name: "来月の改善アクション", kind: "rich_text" },
      ...TIMESTAMPS,
    ],
    relations: [],
  },
];

// ============================================================
// プロパティビルダー
// ============================================================
function buildProperties(props: PropDef[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const p of props) {
    switch (p.kind) {
      case "title":
        out[p.name] = { title: {} };
        break;
      case "rich_text":
        out[p.name] = { rich_text: {} };
        break;
      case "number":
        out[p.name] = { number: {} };
        break;
      case "select":
        out[p.name] = {
          select: { options: (p.options || []).map((n) => ({ name: n })) },
        };
        break;
      case "multi_select":
        out[p.name] = {
          multi_select: {
            options: (p.options || []).map((n) => ({ name: n })),
          },
        };
        break;
      case "date":
        out[p.name] = { date: {} };
        break;
      case "checkbox":
        out[p.name] = { checkbox: {} };
        break;
      case "people":
        out[p.name] = { people: {} };
        break;
      case "formula":
        out[p.name] = { formula: { expression: p.expression } };
        break;
      case "created_time":
        out[p.name] = { created_time: {} };
        break;
      case "last_edited_time":
        out[p.name] = { last_edited_time: {} };
        break;
    }
  }
  return out;
}

// ============================================================
// サブページIDを取得
// ============================================================
async function findSubPageIds(): Promise<Record<Layer, string>> {
  console.log("\n=== サブページIDを取得中 ===");
  const result: Partial<Record<Layer, string>> = {};
  let cursor: string | undefined;
  do {
    const res: any = await notion.blocks.children.list({
      block_id: PARENT_PAGE_ID,
      start_cursor: cursor,
    });
    for (const block of res.results) {
      if (block.type === "child_page") {
        const title = block.child_page?.title || "";
        for (const [layer, layerTitle] of Object.entries(LAYER_TITLES)) {
          if (title === layerTitle) {
            result[layer as Layer] = block.id;
          }
        }
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  for (const layer of Object.keys(LAYER_TITLES) as Layer[]) {
    if (!result[layer]) {
      throw new Error(
        `❌ サブページが見つかりません: 「${LAYER_TITLES[layer]}」\n` +
          `  「AI Clone OS」配下に手動で作成してください。`
      );
    }
    console.log(`  ✓ ${LAYER_TITLES[layer]} → ${result[layer]}`);
  }
  return result as Record<Layer, string>;
}

// ============================================================
// DB情報（v5: database_id と data_source_id の両方が必要）
// ============================================================
type DbInfo = { dbId: string; dsId: string };

// ============================================================
// Pass 1: DB作成（v5 API: initial_data_source.properties で渡す）
// ============================================================
async function createDatabases(
  subpageIds: Record<Layer, string>
): Promise<Record<string, DbInfo>> {
  console.log("\n=== Pass 1: DB作成（リレーション以外） ===");
  const dbInfo: Record<string, DbInfo> = {};

  for (const def of DBS) {
    const parentPageId = subpageIds[def.layer];
    try {
      const created: any = await notion.databases.create({
        parent: { type: "page_id", page_id: parentPageId },
        title: [{ type: "text", text: { content: def.displayName } }],
        initial_data_source: {
          properties: buildProperties(def.properties),
        },
      } as any);
      const dbId = created.id;
      const dsId = created.data_sources?.[0]?.id;
      if (!dsId) {
        throw new Error(
          `data_source_id が取得できませんでした: ${def.displayName}`
        );
      }
      dbInfo[def.key] = { dbId, dsId };
      console.log(
        `  ✓ ${def.displayName} (${def.key}) → db:${dbId.slice(0, 8)}... ds:${dsId.slice(0, 8)}...`
      );
    } catch (err: any) {
      console.error(`  ❌ ${def.displayName} 作成失敗:`, err.message || err);
      throw err;
    }
  }
  return dbInfo;
}

// ============================================================
// Pass 2: リレーション設定（v5 API: dataSources.update + data_source_id）
// ============================================================
async function addRelations(
  dbInfo: Record<string, DbInfo>
): Promise<void> {
  console.log("\n=== Pass 2: リレーション設定 ===");
  let totalRelations = 0;
  for (const def of DBS) {
    if (def.relations.length === 0) continue;
    const myInfo = dbInfo[def.key];
    const relProps: Record<string, any> = {};
    for (const rel of def.relations) {
      const targetInfo = dbInfo[rel.targetKey];
      if (!targetInfo) {
        console.warn(
          `  ⚠ ${def.displayName} → ${rel.targetKey} が見つからずスキップ`
        );
        continue;
      }
      relProps[rel.name] = {
        relation: {
          data_source_id: targetInfo.dsId,
          single_property: {},
        },
      };
    }
    if (Object.keys(relProps).length === 0) continue;
    try {
      await (notion as any).dataSources.update({
        data_source_id: myInfo.dsId,
        properties: relProps,
      });
      totalRelations += Object.keys(relProps).length;
      console.log(
        `  ✓ ${def.displayName}: ${Object.keys(relProps).length}本追加`
      );
    } catch (err: any) {
      console.error(
        `  ❌ ${def.displayName} リレーション設定失敗:`,
        err.message || err
      );
      throw err;
    }
  }
  console.log(`  合計 ${totalRelations} 本のリレーションを設定`);
}

// ============================================================
// 出力保存
// ============================================================
function saveOutput(dbInfo: Record<string, DbInfo>): void {
  const outPath = path.join(
    process.cwd(),
    "scripts",
    "ai-clone-db-ids.json"
  );
  fs.writeFileSync(outPath, JSON.stringify(dbInfo, null, 2));
  console.log(`\n=== 出力 ===`);
  console.log(`  DB IDマップを保存: ${outPath}`);
}

// ============================================================
// メイン
// ============================================================
async function main() {
  console.log("==========================================");
  console.log("  AI Clone Notion DB セットアップ");
  console.log("==========================================");
  console.log(`  親ページID: ${PARENT_PAGE_ID}`);
  console.log(`  作成予定DB数: ${DBS.length}`);

  const subpageIds = await findSubPageIds();
  const dbInfo = await createDatabases(subpageIds);
  await addRelations(dbInfo);
  saveOutput(dbInfo);

  console.log("\n✅ 全完了");
  console.log(`  Notion で「AI Clone OS」を開いて確認してください。`);
}

main().catch((err) => {
  console.error("\n❌ エラー:", err.message || err);
  process.exit(1);
});
