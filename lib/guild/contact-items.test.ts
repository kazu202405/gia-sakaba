import { describe, expect, it } from "vitest";
import { contactItemHref, contactItemLabel, contactItemsError, legacyContactItems, parseContactItemsMap, safeContactHref, type GuildContactItem } from "./contact-items";

const item = (overrides: Partial<GuildContactItem> = {}): GuildContactItem => ({
  kind: "website", label: "", value: "https://example.com", visibility: "approved", sort_order: 0, ...overrides,
});

describe("プロフィールの連絡先", () => {
  it("SNS種別とその他の表示名を返す", () => {
    expect(contactItemLabel(item({ kind: "instagram" }))).toBe("Instagram");
    expect(contactItemLabel(item({ kind: "other", label: "予約ページ" }))).toBe("予約ページ");
  });

  it("メールだけmailtoリンクにする", () => {
    expect(contactItemHref(item({ kind: "email", value: "me+gia@example.com" }))).toBe("mailto:me%2Bgia%40example.com");
    expect(contactItemHref(item())).toBe("https://example.com");
  });

  it("メールとURLを検証する", () => {
    expect(contactItemsError([item({ kind: "email", value: "wrong" })])).toContain("メール");
    expect(contactItemsError([item({ kind: "line", value: "line-id" })])).toContain("https://");
    expect(contactItemsError([item({ kind: "other", label: "" })])).toContain("表示名");
    expect(contactItemsError([item({ visibility: "private" })])).toBeNull();
  });

  it("従来の3項目を公開設定ごと引き継ぐ", () => {
    expect(legacyContactItems({ email: "a@example.com", email_visibility: "members", line_url: "", website_url: "https://gia2018.com" }))
      .toEqual([
        { kind: "email", label: "", value: "a@example.com", visibility: "members", sort_order: 0 },
        { kind: "website", label: "", value: "https://gia2018.com", visibility: "approved", sort_order: 1 },
      ]);
  });
});

describe("見る側の連絡先", () => {
  it("承認前のものは値を持たず鍵つきで残す・知らない種類や空の値は捨てる", () => {
    const map = parseContactItemsMap({
      u1: [
        { kind: "instagram", label: "", value: "https://instagram.com/a", visibility: null, locked: false },
        { kind: "email", label: "", value: "leak@example.com", visibility: null, locked: true },
        { kind: "tiktok", label: "", value: "https://t.example", locked: false },
        { kind: "x", label: "", value: null, locked: false },
      ],
      u2: "broken",
    });
    expect(map.u1).toEqual([
      { kind: "instagram", label: "", value: "https://instagram.com/a", visibility: null, locked: false },
      { kind: "email", label: "", value: null, visibility: null, locked: true },
    ]);
    expect(map.u2).toBeUndefined();
    expect(parseContactItemsMap(null)).toEqual({});
  });

  it("リンクにするのは http(s) と mailto だけ", () => {
    expect(safeContactHref({ kind: "website", value: "javascript:alert(1)" })).toBeNull();
    expect(safeContactHref({ kind: "website", value: "https://e.com" })).toBe("https://e.com");
    expect(safeContactHref({ kind: "email", value: "a@b.co" })).toBe("mailto:a%40b.co");
    expect(safeContactHref({ kind: "line", value: null })).toBeNull();
  });

  it("URLの途中に空白があれば保存前に止める（DBと同じ条件）", () => {
    expect(contactItemsError([item({ value: "https://example.com/a b" })])).toContain("https://");
  });
});
