// 酒場の画面は、ボタンから移るときに useRouter を直接使わない（components/guild/use-guild-router.ts を使う）。
// 直接使うと、押してから次の画面が出るまで何も変わらず、何度も押される（2026-09-28 おしらせで実際に起きた）。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["components/guild", "app/guild"];
const ALLOWED = new Set(["components/guild/use-guild-router.ts"]);

/** コメントと文字列を消してから、next/navigation の useRouter を使っているかを見る */
export function usesRawRouter(source: string): boolean {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const fromNav = /import\s*\{([^}]*)\}\s*from\s*["']next\/navigation["']/g;
  for (const match of code.matchAll(fromNav)) {
    if (/\buseRouter\b/.test(match[1])) return true;
  }
  // import * as nav from "next/navigation" → nav.useRouter()
  return /\.\s*useRouter\s*\(/.test(code);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name).replace(/\\/g, "/");
    if (statSync(path).isDirectory()) return walk(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("見張り自身の確かめ", () => {
  it("本物の使い方は見つける", () => {
    expect(usesRawRouter('import { useRouter } from "next/navigation";')).toBe(true);
    expect(usesRawRouter('import { usePathname, useRouter as r } from "next/navigation";')).toBe(true);
    expect(usesRawRouter('import {\n  useSearchParams,\n  useRouter,\n} from "next/navigation";')).toBe(true);
    expect(usesRawRouter('import * as nav from "next/navigation";\nconst r = nav.useRouter();')).toBe(true);
  });
  it("コメントや、ほかの import では鳴らない", () => {
    expect(usesRawRouter('// useRouter を直接使わない\nimport { usePathname } from "next/navigation";')).toBe(false);
    expect(usesRawRouter('/* import { useRouter } from "next/navigation"; */')).toBe(false);
    expect(usesRawRouter('import { useGuildRouter } from "@/components/guild/use-guild-router";\nconst r = useGuildRouter();')).toBe(false);
  });
  it("見る範囲にファイルがちゃんとある（空振りで通らない）", () => {
    const files = ROOTS.flatMap(walk);
    expect(files.length).toBeGreaterThan(50);
    expect(files).toContain("components/guild/live-notification-list.tsx");
  });
});

describe("酒場の画面は useGuildRouter を使う", () => {
  it("useRouter を直接使っているファイルがない", () => {
    const offenders = ROOTS.flatMap(walk)
      .filter((path) => !ALLOWED.has(path))
      .filter((path) => usesRawRouter(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });
});
