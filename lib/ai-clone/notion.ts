import { Client } from "@notionhq/client";

function getClient(): Client | null {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  return new Client({ auth: token });
}

// 経営コンテキストの全ページを連結して返す
// NOTION_CONTEXT_PAGE_1 〜 NOTION_CONTEXT_PAGE_5 を読み込む。
// 各ページは独立に fetch して、1ページが失敗しても残りを残す（部分失敗を許容）。
// 全ページ失敗 / env 未設定の時だけフォールバックを返す。
export async function fetchExecutiveContext(): Promise<string> {
  const status = await fetchExecutiveContextWithStatus();
  return status.context;
}

// 取得状況も含めて返す版（dashboard などで「どのページが取れたか」を出す用）
export async function fetchExecutiveContextWithStatus(): Promise<{
  context: string;
  pages: { slot: number; pageId: string; title: string; ok: boolean; error?: string }[];
  source: "notion" | "fallback" | "legacy";
}> {
  const client = getClient();
  if (!client) {
    return {
      context: getFallbackContext(),
      pages: [],
      source: "fallback",
    };
  }

  const pageEntries = [1, 2, 3, 4, 5]
    .map((n) => ({ slot: n, pageId: process.env[`NOTION_CONTEXT_PAGE_${n}`] }))
    .filter((e): e is { slot: number; pageId: string } => Boolean(e.pageId));

  // 旧フォーマット（親ページ1個）の後方互換
  const legacyParent = process.env.NOTION_CONTEXT_PAGE_ID;
  if (pageEntries.length === 0 && legacyParent) {
    const ctx = await fetchFromParentPage(client, legacyParent);
    return { context: ctx, pages: [], source: "legacy" };
  }

  if (pageEntries.length === 0) {
    return {
      context: getFallbackContext(),
      pages: [],
      source: "fallback",
    };
  }

  // 各ページ独立 fetch（1ページ失敗しても他は読む）
  const results = await Promise.all(
    pageEntries.map(async (e) => {
      try {
        const [title, blocks] = await Promise.all([
          fetchPageTitle(client, e.pageId),
          fetchAllBlocks(client, e.pageId),
        ]);
        const text = blocksToPlainText(blocks);
        return {
          slot: e.slot,
          pageId: e.pageId,
          title,
          ok: true as const,
          section: `# ${title}\n\n${text}`,
        };
      } catch (err: any) {
        console.error(
          `[ai-clone] Notion page${e.slot}(${e.pageId})取得失敗:`,
          err?.message || err
        );
        return {
          slot: e.slot,
          pageId: e.pageId,
          title: "(取得失敗)",
          ok: false as const,
          error: err?.code || err?.message || "unknown",
        };
      }
    })
  );

  const okSections = results
    .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
    .map((r) => r.section)
    .filter((s) => s.trim().length > 0);

  if (okSections.length === 0) {
    return {
      context: getFallbackContext(),
      pages: results.map((r) => ({
        slot: r.slot,
        pageId: r.pageId,
        title: r.title,
        ok: r.ok,
        error: r.ok ? undefined : r.error,
      })),
      source: "fallback",
    };
  }

  return {
    context: okSections.join("\n\n---\n\n"),
    pages: results.map((r) => ({
      slot: r.slot,
      pageId: r.pageId,
      title: r.title,
      ok: r.ok,
      error: r.ok ? undefined : r.error,
    })),
    source: "notion",
  };
}

// 方法論コンテキスト（紹介の枠組み等）を読み込む。
// NOTION_METHODOLOGY_PAGE_ID（親ページ1個、子ページに分割可）または
// NOTION_METHODOLOGY_PAGE_1〜5（複数ページ並列）に対応。
// 経営コンテキストと別管理。アドバイス生成にだけ使う。
export async function fetchMethodologyContext(): Promise<string> {
  const client = getClient();
  if (!client) return "";

  const pageIds = [1, 2, 3, 4, 5]
    .map((n) => process.env[`NOTION_METHODOLOGY_PAGE_${n}`])
    .filter(Boolean) as string[];

  const parent = process.env.NOTION_METHODOLOGY_PAGE_ID;
  if (pageIds.length === 0 && parent) {
    return fetchFromParentPage(client, parent);
  }
  if (pageIds.length === 0) return "";

  try {
    const sections = await Promise.all(
      pageIds.map(async (id) => {
        const [title, blocks] = await Promise.all([
          fetchPageTitle(client, id),
          fetchAllBlocks(client, id),
        ]);
        const text = blocksToPlainText(blocks);
        return `# ${title}\n\n${text}`;
      })
    );
    return sections.filter((s) => s.trim().length > 0).join("\n\n---\n\n");
  } catch (err) {
    console.error("[ai-clone] 方法論コンテキスト取得失敗:", err);
    return "";
  }
}

// ページタイトル取得
async function fetchPageTitle(client: Client, pageId: string): Promise<string> {
  try {
    const page: any = await client.pages.retrieve({ page_id: pageId });
    // 通常ページは properties.title.title[0].plain_text
    const props = page.properties;
    if (props) {
      for (const key of Object.keys(props)) {
        const prop = props[key];
        if (prop?.type === "title" && Array.isArray(prop.title)) {
          return prop.title.map((t: any) => t.plain_text || "").join("") || "(無題)";
        }
      }
    }
    return "(無題)";
  } catch {
    return "(タイトル取得失敗)";
  }
}

// 親ページ1個から子ページを辿って読む（旧フォーマット互換）
async function fetchFromParentPage(client: Client, parentId: string): Promise<string> {
  try {
    const blocks = await fetchAllBlocks(client, parentId);
    const baseText = blocksToPlainText(blocks);

    const childPageIds = blocks
      .filter((b: any) => b.type === "child_page")
      .map((b: any) => b.id as string);

    const childTexts = await Promise.all(
      childPageIds.map(async (id) => {
        const [title, childBlocks] = await Promise.all([
          fetchPageTitle(client, id),
          fetchAllBlocks(client, id),
        ]);
        const text = blocksToPlainText(childBlocks);
        return `# ${title}\n\n${text}`;
      })
    );

    return [baseText, ...childTexts]
      .filter((s) => s.trim().length > 0)
      .join("\n\n---\n\n");
  } catch (err) {
    console.error("[ai-clone] Notion親ページ取得失敗:", err);
    return getFallbackContext();
  }
}

async function fetchAllBlocks(client: Client, blockId: string): Promise<any[]> {
  const all: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    all.push(...res.results);
    cursor = res.has_more ? res.next_cursor || undefined : undefined;
  } while (cursor);

  // table / toggle / column 系は子ブロック（行や中身）を別取得しないと内容が落ちる
  for (const block of all as any[]) {
    if (
      block.has_children &&
      (block.type === "table" ||
        block.type === "toggle" ||
        block.type === "column_list" ||
        block.type === "column")
    ) {
      try {
        block._children = await fetchAllBlocks(client, block.id);
      } catch {
        block._children = [];
      }
    }
  }

  return all;
}

function blocksToPlainText(blocks: any[]): string {
  return blocks
    .map((b) => formatBlock(b))
    .filter((s) => s !== null)
    .join("\n");
}

// ブロックタイプごとに整形
function formatBlock(b: any): string | null {
  const type = b.type;
  const data = b[type];

  // rich_text を持つ標準ブロック
  const richText = (data?.rich_text as any[]) || [];
  const text = richText.map((r: any) => r.plain_text || "").join("");

  switch (type) {
    case "heading_1":
      return `\n## ${text}`;
    case "heading_2":
      return `\n### ${text}`;
    case "heading_3":
      return `\n#### ${text}`;
    case "paragraph":
      return text;
    case "bulleted_list_item":
      return `- ${text}`;
    case "numbered_list_item":
      return `1. ${text}`;
    case "to_do":
      return `${data.checked ? "[x]" : "[ ]"} ${text}`;
    case "quote":
      return `> ${text}`;
    case "callout":
      return `💡 ${text}`;
    case "code":
      return `\`\`\`${data.language || ""}\n${text}\n\`\`\``;
    case "toggle": {
      const inner = formatChildren(b._children);
      return `${text}${inner ? "\n" + inner : ""}`;
    }
    case "table":
      return formatTable(b._children || []);
    case "column_list":
    case "column":
      return formatChildren(b._children);
    case "child_page":
      return null; // 別途処理
    case "divider":
      return "\n---\n";
    default:
      // unknown block type with rich_text fallback
      return text || null;
  }
}

// table の子（table_row）を Markdown 表に整形
function formatTable(rows: any[]): string {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const cellsArr = rows
    .filter((r: any) => r.type === "table_row")
    .map((r: any) =>
      ((r.table_row?.cells || []) as any[][]).map((cell) =>
        cell.map((ct: any) => ct.plain_text || "").join("").trim()
      )
    );
  if (cellsArr.length === 0) return "";
  const colCount = cellsArr[0].length;
  const lines: string[] = [];
  lines.push("\n| " + cellsArr[0].join(" | ") + " |");
  lines.push("| " + Array(colCount).fill("---").join(" | ") + " |");
  for (let i = 1; i < cellsArr.length; i++) {
    lines.push("| " + cellsArr[i].join(" | ") + " |");
  }
  return lines.join("\n");
}

// 子ブロックを再帰整形
function formatChildren(children: any[] | undefined): string | null {
  if (!Array.isArray(children) || children.length === 0) return null;
  const out = children
    .map((c) => formatBlock(c))
    .filter((s) => s !== null)
    .join("\n");
  return out || null;
}

// Notion未設定時のフォールバック
function getFallbackContext(): string {
  return `# 経営コンテキスト（フォールバック）

## ミッション
中小企業の現場で人の価値を最大化する仕組みを、行動心理学とAIで実装する。

## 最重要KPI
月収300万円をできるだけ早く達成する。

## 判断基準
- 数字より直感を信じる
- 短期売上より関係性を優先
- 既存メンバーを伸ばす > 人を増やす
- 完璧より結果スピード優先

## やる / やらない
- やる: 「人の行動を動かす」領域
- やらない（看板に）: 議事録ToDo / 予約管理 / 純粋な事務効率化
`;
}
