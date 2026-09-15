// 「Company Note から来た人が Company Note に返るか」の見張り。
//
// 実際に壊れていたのは /upgrade/invite の未ログイン分岐だけで、
// 既ログインなら通るため、手で踏んでも本番を見ても気づけなかった。
// なので個々の文字列を照合するのではなく、
// **どの段・どの status でも note に戻れること** を不変条件として書く。

import { describe, it, expect } from "vitest";
import {
  withOrigin,
  checkoutPaths,
  upgradeFallbackUrl,
  type UpgradeFallbackStatus,
} from "./upgrade-return";

const NOTE_URL = "https://note.gia2018.com";

/** 申込を始めうるページ（公開2段 + URL直渡しの2段）。 */
const ENTRY_PATHS = [
  "/upgrade",
  "/upgrade/online",
  "/upgrade/real",
  "/upgrade/invite",
  "/upgrade/premium",
];

const FALLBACK_STATUSES: UpgradeFallbackStatus[] = [
  "unauthenticated",
  "already_active",
  "unavailable",
];

/**
 * その行き先から Company Note に戻れるか。
 *
 * ⚠️ 素の `includes("from=note")` では見張りにならない。/login?next=... では
 *    from=note が URL エンコードされて `%3Ffrom%3Dnote` になっており、
 *    まさにそこが落ちていた分岐。復号してから見る。
 */
function keepsNote(destination: string): boolean {
  if (destination === NOTE_URL) return true;
  const decoded = decodeURIComponent(destination);
  return decoded.includes("from=note");
}

describe("withOrigin", () => {
  it("origin が null なら何も足さない", () => {
    expect(withOrigin("/upgrade/invite", null)).toBe("/upgrade/invite");
    expect(withOrigin("/upgrade?checkout=unavailable", null)).toBe(
      "/upgrade?checkout=unavailable",
    );
  });

  it("クエリの有無で ? と & を使い分ける", () => {
    expect(withOrigin("/upgrade/invite", "note")).toBe(
      "/upgrade/invite?from=note",
    );
    expect(withOrigin("/upgrade?checkout=unavailable", "note")).toBe(
      "/upgrade?checkout=unavailable&from=note",
    );
  });
});

describe("checkoutPaths", () => {
  it("Stripe のプレースホルダを壊さない", () => {
    const { successPath } = checkoutPaths("/upgrade/invite", "note");
    expect(successPath).toContain("session_id={CHECKOUT_SESSION_ID}");
  });

  it.each(ENTRY_PATHS)("note から来たら success も cancel も note を保つ (%s)", (entryPath) => {
    const { successPath, cancelPath } = checkoutPaths(entryPath, "note");
    expect(keepsNote(successPath)).toBe(true);
    expect(keepsNote(cancelPath)).toBe(true);
  });

  it("cancel は申込を始めたページに戻す", () => {
    expect(checkoutPaths("/upgrade/invite", null).cancelPath).toBe(
      "/upgrade/invite",
    );
  });

  it("note から来ていなければ from は付かない", () => {
    const { successPath, cancelPath } = checkoutPaths("/upgrade", null);
    expect(successPath).not.toContain("from=");
    expect(cancelPath).not.toContain("from=");
  });
});

describe("upgradeFallbackUrl", () => {
  // これが本体。段 × status の全組み合わせで note に戻れること。
  for (const entryPath of ENTRY_PATHS) {
    for (const status of FALLBACK_STATUSES) {
      it(`note を保つ: ${entryPath} / ${status}`, () => {
        const url = upgradeFallbackUrl(status, {
          entryPath,
          origin: "note",
          noteUrl: NOTE_URL,
        });
        expect(keepsNote(url)).toBe(true);
      });
    }
  }

  it("未ログインならログイン後に同じ申込ページへ戻す", () => {
    const url = upgradeFallbackUrl("unauthenticated", {
      entryPath: "/upgrade/invite",
      origin: "note",
      noteUrl: NOTE_URL,
    });
    const next = new URL(url, "https://gia2018.com").searchParams.get("next");
    expect(next).toBe("/upgrade/invite?from=note");
  });

  it("既に会員で note から来たなら Company Note へ返す", () => {
    expect(
      upgradeFallbackUrl("already_active", {
        entryPath: "/upgrade/invite",
        origin: "note",
        noteUrl: NOTE_URL,
      }),
    ).toBe(NOTE_URL);
  });

  it("note から来ていなければ GIA 側の行き先のまま", () => {
    expect(
      upgradeFallbackUrl("already_active", {
        entryPath: "/upgrade",
        origin: null,
        noteUrl: NOTE_URL,
      }),
    ).toBe("/members/app/mypage?checkout=already");
    expect(
      upgradeFallbackUrl("unauthenticated", {
        entryPath: "/upgrade",
        origin: null,
        noteUrl: NOTE_URL,
      }),
    ).toBe("/login?next=%2Fupgrade");
  });
});
