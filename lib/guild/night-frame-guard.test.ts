import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// 酒場の外（ログインなしで開く /p /i /e など）の公開ページが、昔の明るい帳面のまま作られないための見張り。
// .guild-theme だけを自分で付けると明るい見た目になる（夜にするには .guild-scene と絵が要る）。
// 新しい公開ページは components/guild/night-page-frame.tsx の NightPageFrame を使う。

const root = join(__dirname, "..", "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** コメントを外す（注意書きに「guild-theme」と書いても見張りが反応しないように） */
export function stripComments(source: string): string {
  // 行頭か空白のあとの // だけをコメントとみなす（https:// などを巻き込まない）
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

/** className に guild-theme を直接書いているのに、guild-scene も NightPageFrame もないファイルか */
export function usesBrightThemeByHand(source: string): boolean {
  const code = stripComments(source);
  return /["'`][^"'`\n]*(?<![\w/.-])guild-theme(?![\w.-])[^"'`\n]*["'`]/.test(code) && !/\bguild-scene\b/.test(code) && !/NightPageFrame/.test(code);
}

// 例外：トップのLP（独自の見た目）。理由なく足さないこと
const EXEMPT = new Set(["app/page.tsx"].map((p) => p.split("/").join(sep)));

describe("公開ページの外枠（夜の酒場）", () => {
  it("app 配下の画面は、guild-theme を手で付けるなら guild-scene も付ける（または NightPageFrame を使う）", () => {
    const files = walk(join(root, "app")).filter((path) => /\.(tsx|ts)$/.test(path));
    const bad = files.map((path) => relative(root, path)).filter((rel) => !EXEMPT.has(rel) && usesBrightThemeByHand(readFileSync(join(root, rel), "utf8")));
    expect(bad).toEqual([]);
  });

  it("公開ページ /p /i /e は NightPageFrame を使っている", () => {
    for (const dir of ["p", "i", "e"]) {
      expect(readFileSync(join(root, "app", dir, "[token]", "page.tsx"), "utf8")).toContain("<NightPageFrame>");
    }
  });

  describe("自己テスト（見張り自身が取りこぼさないか）", () => {
    it("guild-theme だけを手で付けたものは検出する", () => {
      expect(usesBrightThemeByHand('return <main className="guild-theme min-h-screen">x</main>;')).toBe(true);
      expect(usesBrightThemeByHand("return <main className={`guild-theme ${a}`}>x</main>;")).toBe(true);
    });
    it("guild-scene や NightPageFrame があれば検出しない", () => {
      expect(usesBrightThemeByHand('<div className="guild-theme guild-scene">x</div>')).toBe(false);
      expect(usesBrightThemeByHand("<NightPageFrame>x</NightPageFrame>")).toBe(false);
    });
    it("コメントに書かれた guild-theme には反応しない", () => {
      expect(usesBrightThemeByHand('// .guild-theme だけだと明るい\nconst a = 1;')).toBe(false);
      expect(usesBrightThemeByHand('/* "guild-theme" を使う */\nconst a = 1;')).toBe(false);
    });
    it("CSSのimport行だけでは検出しない", () => {
      expect(usesBrightThemeByHand('import "@/components/guild/guild-theme.css";')).toBe(false);
    });
  });
});
