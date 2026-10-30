// 建設・不動産の酒場の作り直し（人脈ネットワークSNS）見本（app/guild-look/sns・components/guild/look/sns・lib/guild/look/sns-*）の見張り。
//  1. ブラウザ標準の alert / confirm / prompt を呼ばない（アプリ内モーダル・トーストを使う）
//  2. 色の直書き（#xxxxxx・rgb()・style の color）を画面コードに足さない。CSS も変数の定義の中だけ
//  3. ドット文字・▶◀ を使わない（落ち着いた見た目の店）
//  4. ボタンからの移動に useRouter を直接使わない（useSn().go ＝ 押した瞬間に仮の画面を出す入口を使う）
//  5. 本物の画面（app/guild・guild-theme.css 等）に手を入れていない箇所の確認はしない（git の差分で見る）
//
// 見張りは TypeScript の構文木で「呼び出し」「文字列・JSXの文字」だけを見る。コメントや、この見張り自身の注意書きには反応しない。
// 見張り自身の自己テストは最初の describe。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOTS = ["app/guild-look/sns", "components/guild/look/sns"];
const EXTRA = ["lib/guild/look/sns-mock.ts", "lib/guild/look/sns-sort.ts"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name).replace(/\\/g, "/");
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function parse(source: string) {
  return ts.createSourceFile("x.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

const NATIVE = new Set(["alert", "confirm", "prompt"]);
const GLOBALS = new Set(["window", "globalThis", "self"]);

/** alert( confirm( prompt( と window.alert( などの呼び出しの行 */
export function findNativeDialogCalls(source: string): number[] {
  const sf = parse(source);
  const lines: number[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const hit =
        (ts.isIdentifier(callee) && NATIVE.has(callee.text)) ||
        (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && GLOBALS.has(callee.expression.text) && NATIVE.has(callee.name.text));
      if (hit) lines.push(sf.getLineAndCharacterOfPosition(node.getStart()).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return lines;
}

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const COLOR_FN = /\b(?:rgb|rgba|hsl|hsla)\(\s*\d/;

/** 文字列・JSXの文字・style の color 系の値に、色の直書きがあるか（コメントは見ない） */
export function findColorLiterals(source: string): string[] {
  const sf = parse(source);
  const found: string[] = [];
  const check = (text: string) => {
    if (HEX.test(text) || COLOR_FN.test(text)) found.push(text.slice(0, 40));
  };
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) check(node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) check(node.text);
    else if (ts.isJsxText(node)) check(node.text);
    // style={{ color: … }} のように、色の名前のプロパティをインラインで書く
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && /^(color|background|backgroundColor|borderColor|fill|stroke)$/.test(node.name.text)) {
      if (node.parent?.parent && ts.isJsxExpression(node.parent.parent)) found.push(`style.${node.name.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** CSS：色の直書きは「--変数: 値;」の定義の中だけ。それ以外の行にあれば返す */
export function findCssColorOutsideVariables(css: string): string[] {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return code
    .split("\n")
    .filter((line) => (HEX.test(line) || COLOR_FN.test(line)) && !/^\s*--[\w-]+\s*:/.test(line))
    .map((line) => line.trim());
}

/** next/navigation から useRouter を読み込んでいるか */
export function importsUseRouter(source: string): boolean {
  const sf = parse(source);
  return sf.statements.some((st) =>
    ts.isImportDeclaration(st) &&
    ts.isStringLiteral(st.moduleSpecifier) && st.moduleSpecifier.text === "next/navigation" &&
    !!st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings) &&
    st.importClause.namedBindings.elements.some((el) => (el.propertyName ?? el.name).text === "useRouter"),
  );
}

const GAME_WORDS = /▶|◀|DotGothic|pixel-jp|--font-pixel|rpg-|c-window|c-button/;

describe("見張り自身の確かめ", () => {
  it("標準ダイアログの呼び出しを見つける（直接・window 経由）", () => {
    expect(findNativeDialogCalls('alert("x");')).toEqual([1]);
    expect(findNativeDialogCalls("const ok = confirm('a');")).toEqual([1]);
    expect(findNativeDialogCalls("const v = window.prompt('a');")).toEqual([1]);
    expect(findNativeDialogCalls("globalThis.alert('a');")).toEqual([1]);
  });
  it("共通部品・コメント・文字列では鳴らない", () => {
    expect(findNativeDialogCalls('await uiConfirm({ message: "x" }); uiToast("y");')).toEqual([]);
    expect(findNativeDialogCalls("// alert( は使わない\nconst a = 1;")).toEqual([]);
    expect(findNativeDialogCalls('const t = "confirm( と書いた文章";')).toEqual([]);
    expect(findNativeDialogCalls("const a = { confirm: 1 }; a.confirm;")).toEqual([]);
  });
  it("色の直書きを見つける（文字列・JSXの文字・インラインのstyle）", () => {
    expect(findColorLiterals('const c = "#1f6b4f";')).toHaveLength(1);
    expect(findColorLiterals("const c = `rgb(0 0 0)`;")).toHaveLength(1);
    expect(findColorLiterals('const a = <p style={{ color: "var(--x)" }}>a</p>;')).toHaveLength(1);
    expect(findColorLiterals('const a = <p className="text-[#fff]">a</p>;')).toHaveLength(1);
  });
  it("変数・コメント・色ではない # では鳴らない", () => {
    expect(findColorLiterals('const c = "var(--guild-accent)";')).toEqual([]);
    expect(findColorLiterals("// #1f6b4f は変数で\nconst a = 1;")).toEqual([]);
    expect(findColorLiterals('const href = "/x#section";')).toEqual([]);
    expect(findColorLiterals('const a = <p style={{ width: "60%" }}>a</p>;')).toEqual([]);
  });
  it("CSSの色は変数の定義の中だけ許す", () => {
    expect(findCssColorOutsideVariables(".a { color: #fff; }")).toHaveLength(1);
    expect(findCssColorOutsideVariables(".a {\n  background: rgb(0 0 0 / 0.5);\n}")).toHaveLength(1);
    expect(findCssColorOutsideVariables(".a {\n  --kz-danger: #c62828;\n  color: var(--kz-danger);\n}")).toEqual([]);
    expect(findCssColorOutsideVariables("/* #fff の説明 */\n.a { color: red; }")).toEqual([]);
  });
});

describe("人脈ネットワークSNS見本の見張り", () => {
  const files = [...ROOTS.flatMap(walk), ...EXTRA];
  const code = files.filter((f) => /\.tsx?$/.test(f));
  const css = files.filter((f) => f.endsWith(".css"));

  it("見る範囲にファイルがちゃんとある（空振りで通らない）", () => {
    expect(code.length).toBeGreaterThan(17);
    expect(code).toContain("lib/guild/look/sns-sort.ts");
    expect(css).toContain("components/guild/look/sns/sns.css");
    expect(code).toContain("lib/guild/look/sns-mock.ts");
    expect(code).toContain("app/guild-look/sns/layout.tsx");
  });
  it("alert / confirm / prompt を使っていない", () => {
    const offenders = code.flatMap((f) => findNativeDialogCalls(readFileSync(f, "utf8")).map((line) => `${f}:${line}`));
    expect(offenders).toEqual([]);
  });
  it("色の直書きが無い（画面コードは変数で、CSSは変数の定義の中だけ）", () => {
    const tsOffenders = code.flatMap((f) => findColorLiterals(readFileSync(f, "utf8")).map((t) => `${f}: ${t}`));
    expect(tsOffenders).toEqual([]);
    const cssOffenders = css.flatMap((f) => findCssColorOutsideVariables(readFileSync(f, "utf8")).map((t) => `${f}: ${t}`));
    expect(cssOffenders).toEqual([]);
  });
  it("ボタンからの移動に useRouter を直接使っていない", () => {
    expect(code.filter((f) => importsUseRouter(readFileSync(f, "utf8")))).toEqual([]);
  });
  it("ドット文字・▶◀・酒場の窓/ボタンのクラスを使っていない", () => {
    const offenders = [...code, ...css].filter((f) => GAME_WORDS.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")));
    expect(offenders).toEqual([]);
  });
});
