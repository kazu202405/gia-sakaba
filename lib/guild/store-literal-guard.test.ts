// 画面コード（app/ components/ lib/）に、店の slug や "/guild/…" の道を直書きしていないかの見張り。
// 店ごとの道・slug は lib/guild/store-path.ts と lib/guild/stores.ts の1か所から作る／読む（2026-10-22 複数の店に分けた）。
// 直書きがあると、2店目以降で GIAの酒場の画面に飛んだり、GIAの酒場のデータを頼んだりする。
//
// 見張りは TypeScript の構文木で「文字列リテラル・テンプレートの文字部分・JSXの文字」だけを見る。
// コメントや、この見張り自身の注意書きには反応しない（範囲は構文で切る）。import の "@/components/guild/…" も、
// "/guild" の前が英数字なので当たらない。見張り自身の自己テストは下の describe。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { STORE_SLUGS } from "./stores";

const ROOTS = ["app", "components", "lib"];
// 道・slug を決める場所そのもの
const ALLOWED = new Set(["lib/guild/store-path.ts", "lib/guild/stores.ts"]);

/** "/guild" の直後が / ? # 、または文字列の終わり。直前が英数字・@ ・- なら別物（components/guild/…・api/guild/…・/guild-look）として除く */
const GUILD_PATH = /(?<![A-Za-z0-9@_-])\/guild(?=[/?#]|$)/;
/** 表示用の文章に混ざった "guild.gia2018.com/guild/…" */
const GUILD_PATH_AFTER_HOST = /\.com\/guild(?=[/?#]|$)/;

type Finding = { line: number; kind: "path" | "slug"; text: string };

export function findStoreLiterals(source: string, fileName = "x.tsx", slugs: readonly string[] = STORE_SLUGS): Finding[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Finding[] = [];
  const add = (node: ts.Node, kind: Finding["kind"], text: string) => {
    found.push({ line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind, text: text.slice(0, 60) });
  };
  const checkText = (node: ts.Node, text: string, whole: boolean) => {
    if (GUILD_PATH.test(text) || GUILD_PATH_AFTER_HOST.test(text)) add(node, "path", text);
    // slug は「その文字列そのもの」のときだけ（文章の中の単語には反応しない）
    if (whole && slugs.includes(text)) add(node, "slug", text);
  };
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) checkText(node, node.text, true);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) checkText(node, node.text, false);
    else if (ts.isJsxText(node)) checkText(node, node.text, false);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name).replace(/\\/g, "/");
    if (statSync(path).isDirectory()) return walk(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("見張り自身の確かめ", () => {
  it("道の直書きを見つける（文字列・テンプレート・JSXの属性・テンプレートの途中）", () => {
    expect(findStoreLiterals('const a = "/guild/quests";')).toHaveLength(1);
    expect(findStoreLiterals("const a = `/guild/quests/${id}`;")).toHaveLength(1);
    expect(findStoreLiterals('const a = <Link href="/guild/me">x</Link>;')).toHaveLength(1);
    expect(findStoreLiterals('const a = "/guild";')).toHaveLength(1);
    expect(findStoreLiterals('const a = "/guild?welcome=1";')).toHaveLength(1);
    // ${origin}/guild/auth/callback のように、途中から始まる道
    expect(findStoreLiterals("const a = `${origin}/guild/join?invite=${code}`;")).toHaveLength(1);
    // 表示用の文章
    expect(findStoreLiterals("const a = <p>guild.gia2018.com/guild/login</p>;")).toHaveLength(1);
  });

  it("slug の直書きを見つける（登録された全店ぶん）", () => {
    for (const slug of STORE_SLUGS) {
      expect(findStoreLiterals(`rpc("x", { p_guild_slug: "${slug}" });`)).toHaveLength(1);
      expect(findStoreLiterals(`const s = '${slug}';`)).toHaveLength(1);
    }
    // 見張りに使う slug の一覧が空で素通りしていない
    expect(STORE_SLUGS.length).toBeGreaterThanOrEqual(2);
  });

  it("コメントでは鳴らない（行コメント・ブロックコメント・JSXのコメント）", () => {
    expect(findStoreLiterals('// "/guild/quests" と "gia" は書かない\nconst a = 1;')).toEqual([]);
    expect(findStoreLiterals('/* href="/guild/me" */\nconst a = 1;')).toEqual([]);
    expect(findStoreLiterals("const a = <div>{/* /guild/me と gia */}</div>;")).toEqual([]);
  });

  it("import や、似た名前の別の道では鳴らない", () => {
    expect(findStoreLiterals('import { x } from "@/components/guild/cards";')).toEqual([]);
    expect(findStoreLiterals('import { x } from "@/lib/guild/store-path";')).toEqual([]);
    expect(findStoreLiterals('fetch("/api/guild/billing/checkout");')).toEqual([]);
    expect(findStoreLiterals('const a = "/guild-sw.js";')).toEqual([]);
    expect(findStoreLiterals('const a = "/guild-look/a";')).toEqual([]);
    expect(findStoreLiterals('const a = "https://guild.gia2018.com";')).toEqual([]);
    expect(findStoreLiterals('const a = "/images/sakaba/guild-icon.png";')).toEqual([]);
  });

  it("slug に似た文章・単語の一部では鳴らない", () => {
    expect(findStoreLiterals('const a = "GIAの酒場";')).toEqual([]);
    expect(findStoreLiterals('const a = "gia-next";')).toEqual([]);
    expect(findStoreLiterals('const a = "GIA";')).toEqual([]);
  });

  it("見る範囲にファイルがちゃんとある（空振りで通らない）", () => {
    const files = ROOTS.flatMap(walk);
    expect(files.length).toBeGreaterThan(150);
    expect(files).toContain("components/guild/guild-shell.tsx");
    expect(files).toContain("lib/guild/server-data.ts");
    expect(files).toContain("app/guild/[store]/layout.tsx");
    // 許可した2つが、実際に直書きを持っている（許可が不要になったら外す）
    for (const allowed of ALLOWED) expect(files).toContain(allowed);
    expect(findStoreLiterals(readFileSync("lib/guild/store-path.ts", "utf8"), "lib/guild/store-path.ts").length).toBeGreaterThan(0);
    expect(findStoreLiterals(readFileSync("lib/guild/stores.ts", "utf8"), "lib/guild/stores.ts").length).toBeGreaterThan(0);
  });
});

describe("画面コードに店の slug と /guild の道を直書きしない", () => {
  it("app/ components/ lib/ に直書きが残っていない", () => {
    const offenders = ROOTS.flatMap(walk)
      .filter((path) => !ALLOWED.has(path))
      .flatMap((path) => findStoreLiterals(readFileSync(path, "utf8"), path).map((f) => `${path}:${f.line} [${f.kind}] ${f.text}`));
    expect(offenders).toEqual([]);
  });

  it("わざと1か所戻したら落ちる（実際のファイルの中身を使った確認）", () => {
    const source = readFileSync("components/guild/live-my-invite.tsx", "utf8");
    expect(findStoreLiterals(source, "components/guild/live-my-invite.tsx")).toEqual([]);
    // store.slug を "gia" に戻す
    const brokenSlug = source.replace("p_guild_slug: store.slug", 'p_guild_slug: "gia"');
    expect(brokenSlug).not.toBe(source);
    expect(findStoreLiterals(brokenSlug, "components/guild/live-my-invite.tsx").map((f) => f.kind)).toContain("slug");
    // store.path(...) を "/guild/…" に戻す
    const brokenPath = source.replace("store.path(`/members/${person.user_id}`)", "`/guild/members/${person.user_id}`");
    expect(brokenPath).not.toBe(source);
    expect(findStoreLiterals(brokenPath, "components/guild/live-my-invite.tsx").map((f) => f.kind)).toContain("path");
  });
});
