import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 2026-11-28：やり取り（/network）は紹介のおねがいだけ。知り合い・公開範囲・会員検索は /me/network へ移した
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const EXCHANGE = "app/guild/[store]/network/page.tsx";
const MY_NETWORK = "app/guild/[store]/me/network/page.tsx";

describe("やり取りと人脈の分け方", () => {
  it("やり取りの画面に、会員検索・公開範囲・会社情報のリンクが残っていない", () => {
    const source = read(EXCHANGE);
    for (const word of ["会員を探す", "setConstructionNetworkVisibility", "changeConstructionConnection", "人脈の公開範囲", "/network/company", "<details"]) {
      expect(source, word).not.toContain(word);
    }
  });

  it("やり取りの空の案内から人脈の画面へ行ける", () => {
    expect(read(EXCHANGE)).toContain('"/me/network"');
  });

  it("人脈の画面があり、知り合い・公開範囲・会員検索を持つ", () => {
    expect(existsSync(join(root, MY_NETWORK))).toBe(true);
    const source = read(MY_NETWORK);
    for (const word of ["会員を探す", "setConstructionNetworkVisibility", "changeConstructionConnection", "/network?via="]) {
      expect(source, word).toContain(word);
    }
  });

  it("マイページの知り合い・公開範囲は人脈の画面へつながる／操作後に人脈の画面も読み直す", () => {
    expect(read("components/guild/construction/my-page.tsx").match(/"\/me\/network"/g)?.length).toBe(2);
    const actions = read("lib/guild/construction-actions.ts");
    expect(actions.match(/revalidatePath\(store\.path\("\/me\/network"\)\)/g)?.length).toBe(2);
  });
});
