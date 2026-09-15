/**
 * AI Clone Notion DB Cleanup Script
 *
 * scripts/ai-clone-db-ids.json に記載されたDBを全部アーカイブする。
 * 失敗した setup スクリプトの後始末用。
 *
 * 使い方:
 *   npx tsx scripts/cleanup-ai-clone-notion.ts
 */

import { Client } from "@notionhq/client";
import * as fs from "node:fs";
import * as path from "node:path";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
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
  console.error("❌ NOTION_AI_CLONE_SETUP_TOKEN が設定されていません。");
  process.exit(1);
}

const notion = new Client({ auth: TOKEN });

async function main() {
  const idMapPath = path.join(process.cwd(), "scripts", "ai-clone-db-ids.json");
  if (!fs.existsSync(idMapPath)) {
    console.log("ai-clone-db-ids.json が見つかりません。クリーンアップ不要。");
    return;
  }

  const idMap: Record<string, string | { dbId: string; dsId: string }> =
    JSON.parse(fs.readFileSync(idMapPath, "utf8"));
  const entries = Object.entries(idMap);
  console.log(`=== ${entries.length}個のDBをアーカイブ中 ===`);

  let success = 0;
  let failed = 0;
  for (const [key, val] of entries) {
    const dbId = typeof val === "string" ? val : val.dbId;
    try {
      await notion.databases.update({
        database_id: dbId,
        in_trash: true,
      } as any);
      console.log(`  ✓ ${key} (${dbId.slice(0, 8)}...) アーカイブ`);
      success++;
    } catch (err: any) {
      console.warn(
        `  ⚠ ${key} (${dbId.slice(0, 8)}...) アーカイブ失敗: ${err.message || err}`
      );
      failed++;
    }
  }

  console.log(`\n結果: 成功 ${success} / 失敗 ${failed}`);

  // Move the IDs file aside so re-run is clean
  if (success > 0) {
    const archivedPath = idMapPath + `.archived-${Date.now()}.json`;
    fs.renameSync(idMapPath, archivedPath);
    console.log(`IDマップを退避: ${archivedPath}`);
  }
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
