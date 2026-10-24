// 酒場の画面コードに、目印の ▶ ◀ を直接書いていないかの見張り（2026-10-24）。
// ▶ ◀ は components/guild/go-mark.tsx の <Go /> で出す。直書きすると、落ち着いた見た目の店（建設・不動産の酒場）でも
// ゲーム風の三角が出てしまう。例外は、CSS で plain の店から消える <span className="rpg-cursor…">▶</span> だけ。
// 店ごとの言葉の表のうち plain の店（lib/guild/words/ の該当ファイル）にも ▶ ◀ を書かない。
//
// 見張りは TypeScript の構文木で「文字列リテラル・テンプレートの文字部分・JSXの文字」だけを見る。
// コメントや、この見張り自身の注意書きには反応しない。見張り自身の自己テストは下の describe。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { STORES } from "./stores";

const ROOTS = ["app/guild", "components/guild"];
// 目印を出す部品そのもの・GIAの酒場だけの見本ページ
const ALLOWED = new Set(["components/guild/go-mark.tsx"]);
const SKIP_DIR = /^(components\/guild\/look|app\/guild-look)(\/|$)/;
const MARK = /[▶◀]/;

/** JSXの文字が <span className="rpg-cursor…">▶</span> の ▶ そのものか */
function isRpgCursor(node: ts.JsxText): boolean {
  if (node.text.trim() !== "▶") return false;
  const el = node.parent;
  if (!ts.isJsxElement(el)) return false;
  return el.openingElement.attributes.properties.some((p) =>
    ts.isJsxAttribute(p) && p.name.getText() === "className" && p.initializer !== undefined && ts.isStringLiteral(p.initializer) && /^rpg-cursor\b/.test(p.initializer.text),
  );
}

export function findMarks(source: string, fileName = "x.tsx"): { line: number; text: string }[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: { line: number; text: string }[] = [];
  const visit = (node: ts.Node) => {
    let text: string | null = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) text = node.text;
    else if (ts.isJsxText(node) && !isRpgCursor(node)) text = node.text;
    if (text !== null && MARK.test(text)) found.push({ line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: text.trim().slice(0, 60) });
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name).replace(/\\/g, "/");
    if (statSync(path).isDirectory()) return SKIP_DIR.test(path) ? [] : walk(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("見張り自身の確かめ", () => {
  it("文字列・テンプレート・JSXの文字の ▶ ◀ を見つける", () => {
    expect(findMarks('const a = <button>{busy ? "送信中…" : "▶ 送る"}</button>;')).toHaveLength(1);
    expect(findMarks("const a = `▶ ${name}を出す`;")).toHaveLength(1);
    expect(findMarks("const a = <p>▶ 確認する</p>;")).toHaveLength(1);
    expect(findMarks("const a = <p>すべて見る ▶</p>;")).toHaveLength(1);
    expect(findMarks("const a = <Link>◀ 戻る</Link>;")).toHaveLength(1);
    expect(findMarks('const a = <F label="▶ 送る" />;')).toHaveLength(1);
    // 飾りの span でも、rpg-cursor でなければ鳴る
    expect(findMarks('const a = <span aria-hidden="true">▶</span>;')).toHaveLength(1);
  });

  it("CSS で消える rpg-cursor の ▶ と、コメントでは鳴らない", () => {
    expect(findMarks('const a = <span className="rpg-cursor">▶</span>;')).toEqual([]);
    expect(findMarks('const a = <span className="rpg-cursor mt-1">▶</span>;')).toEqual([]);
    expect(findMarks('// "▶ 送る" と書かない\nconst a = 1;')).toEqual([]);
    expect(findMarks("const a = <div>{/* 目印（▶）にする */}</div>;")).toEqual([]);
    expect(findMarks("const a = <><Go />送る</>;")).toEqual([]);
  });

  it("rpg-cursor の中でも、▶ のほかに文字があれば鳴る", () => {
    expect(findMarks('const a = <span className="rpg-cursor">▶ 送る</span>;')).toHaveLength(1);
  });
});

describe("酒場の画面に ▶ ◀ の直書きが無い", () => {
  const files = ROOTS.flatMap(walk).filter((f) => !ALLOWED.has(f));

  it("見る対象のファイルが空で素通りしていない", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files).toContain("components/guild/cards.tsx");
  });

  it("<Go /> を使う", () => {
    const hits = files.flatMap((f) => findMarks(readFileSync(f, "utf8"), f).map((h) => `${f}:${h.line} ${h.text}`));
    expect(hits).toEqual([]);
  });
});

describe("plain の店の言葉の表に ▶ ◀ が無い", () => {
  const plain = Object.values(STORES).filter((s) => s.theme === "plain");

  it("plain の店がある（素通りしていない）", () => {
    expect(plain.length).toBeGreaterThanOrEqual(1);
  });

  it.each(plain.map((s) => [s.slug, s] as const))("%s", (_slug, store) => {
    const hits = Object.entries(store.words).filter(([, v]) => MARK.test(v));
    expect(hits).toEqual([]);
  });
});
