import { describe, expect, it } from "vitest";
import {
  LEGACY_STORE_SEGMENTS,
  OUTSIDE_STORE_SEGMENTS,
  RESERVED_STORE_SLUGS,
  STORE_HEADER,
  authCallbackUrl,
  guildApiPath,
  guildPath,
  isGuildLocalPath,
  isManifestPath,
  joinInvitePath,
  legacyPathToStore,
  outsideStorePath,
  parseGuildPath,
  requestStoreSlug,
  storeRestOf,
  storeSlugOfPath,
} from "./store-path";
import { STORE_SLUGS } from "./stores";

describe("guildPath / outsideStorePath", () => {
  it("店の中の道を作る", () => {
    expect(guildPath("gia", "/quests")).toBe("/guild/gia/quests");
    expect(guildPath("gia")).toBe("/guild/gia");
    expect(guildPath("kensetsu-fudosan", "/quests/abc?x=1")).toBe("/guild/kensetsu-fudosan/quests/abc?x=1");
    expect(guildPath("gia", "?welcome=1")).toBe("/guild/gia?welcome=1");
    expect(guildPath("gia", "/master#master-invites-title")).toBe("/guild/gia/master#master-invites-title");
  });

  it("rest が / ? # で始まらないと例外（'quests' と書き間違えても /guild/giaquests にならない）", () => {
    expect(() => guildPath("gia", "quests")).toThrow();
  });

  it("店に属さない画面の道を作る", () => {
    expect(outsideStorePath("login")).toBe("/guild/login");
    expect(outsideStorePath("auth/callback", "?next=%2Fguild")).toBe("/guild/auth/callback?next=%2Fguild");
    expect(outsideStorePath("join", "?invite=abc")).toBe("/guild/join?invite=abc");
  });

  it("店に属さない画面でない名前・query の形違いは例外", () => {
    expect(() => outsideStorePath("quests")).toThrow();
    expect(() => outsideStorePath("login", "next=1")).toThrow();
  });

  it("メールのリンクの戻り先・招待リンク・APIの道", () => {
    expect(authCallbackUrl("https://guild.gia2018.com/", "/e/abc")).toBe("https://guild.gia2018.com/guild/auth/callback?next=%2Fe%2Fabc");
    expect(joinInvitePath("a b&c")).toBe("/guild/join?invite=a%20b%26c");
    expect(guildApiPath("gia", "/billing/portal", { from: "me" })).toBe("/api/guild/billing/portal?store=gia&from=me");
    expect(guildApiPath("kensetsu-fudosan", "/meal-wish")).toBe("/api/guild/meal-wish?store=kensetsu-fudosan");
    expect(() => guildApiPath("gia", "billing")).toThrow();
  });
});

describe("parseGuildPath", () => {
  it("入口・店・店に属さない画面・昔の道・知らない名前・無関係を分ける", () => {
    expect(parseGuildPath("/guild")).toEqual({ kind: "root" });
    expect(parseGuildPath("/guild/")).toEqual({ kind: "root" });
    expect(parseGuildPath("/guild/gia")).toEqual({ kind: "store", slug: "gia", rest: "" });
    expect(parseGuildPath("/guild/gia/")).toEqual({ kind: "store", slug: "gia", rest: "" });
    expect(parseGuildPath("/guild/kensetsu-fudosan/quests/abc")).toEqual({ kind: "store", slug: "kensetsu-fudosan", rest: "/quests/abc" });
    expect(parseGuildPath("/guild/login")).toEqual({ kind: "outside", segment: "login", rest: "" });
    expect(parseGuildPath("/guild/auth/callback")).toEqual({ kind: "outside", segment: "auth", rest: "/callback" });
    expect(parseGuildPath("/guild/quests/abc")).toEqual({ kind: "legacy", segment: "quests", rest: "/abc" });
    expect(parseGuildPath("/guild/nonexistent/quests")).toEqual({ kind: "unknown", segment: "nonexistent", rest: "/quests" });
    expect(parseGuildPath("/guildx")).toEqual({ kind: "none" });
    expect(parseGuildPath("/guild-look/a")).toEqual({ kind: "none" });
    expect(parseGuildPath("/")).toEqual({ kind: "none" });
  });

  it("slug は大文字小文字を区別する（URLは小文字だけ）", () => {
    expect(parseGuildPath("/guild/GIA/quests").kind).toBe("unknown");
  });

  it("storeRestOf / storeSlugOfPath", () => {
    expect(storeRestOf("/guild/gia/quests/abc")).toBe("/quests/abc");
    expect(storeRestOf("/guild/gia")).toBe("");
    expect(storeRestOf("/guild/login")).toBeNull();
    expect(storeRestOf("/guild/quests")).toBeNull();
    expect(storeSlugOfPath("/guild/kensetsu-fudosan/me")).toBe("kensetsu-fudosan");
    expect(storeSlugOfPath("/guild/login")).toBeNull();
  });

  it("legacyPathToStore：昔の道だけを既定の店の道にする", () => {
    expect(legacyPathToStore("/guild/quests/abc")).toBe("/guild/gia/quests/abc");
    expect(legacyPathToStore("/guild/me")).toBe("/guild/gia/me");
    expect(legacyPathToStore("/guild/gia/quests")).toBeNull();
    expect(legacyPathToStore("/guild/login")).toBeNull();
    expect(legacyPathToStore("/guild")).toBeNull();
  });
});

describe("店の slug の決まり", () => {
  it("どの店の slug も、店に属さない画面・昔の道・予約語とぶつからない（ぶつかると店の道が奪われる）", () => {
    for (const slug of STORE_SLUGS) {
      expect(RESERVED_STORE_SLUGS).not.toContain(slug);
      // 実際に店の道として読めること
      expect(parseGuildPath(`/guild/${slug}/quests`)).toEqual({ kind: "store", slug, rest: "/quests" });
    }
  });

  it("昔の道と店に属さない画面の名前が重なっていない", () => {
    for (const name of LEGACY_STORE_SEGMENTS) expect(OUTSIDE_STORE_SEGMENTS as readonly string[]).not.toContain(name);
  });
});

describe("requestStoreSlug（proxy が今の店を決める）", () => {
  const none = new URLSearchParams();
  it("店の道は道から決める", () => {
    expect(requestStoreSlug("/guild/kensetsu-fudosan/quests", none)).toBe("kensetsu-fudosan");
    expect(requestStoreSlug("/guild/gia", none)).toBe("gia");
  });
  it("APIは ?store= から決める。登録されていない店は無視する", () => {
    expect(requestStoreSlug("/api/guild/meal-wish", new URLSearchParams("store=kensetsu-fudosan"))).toBe("kensetsu-fudosan");
    expect(requestStoreSlug("/api/guild/meal-wish", new URLSearchParams("store=nonexistent"))).toBeNull();
    expect(requestStoreSlug("/api/guild/meal-wish", none)).toBeNull();
  });
  it("画面の道では ?store= を信用しない（道が店を決める）", () => {
    expect(requestStoreSlug("/guild/gia/quests", new URLSearchParams("store=kensetsu-fudosan"))).toBe("gia");
    expect(requestStoreSlug("/guild/login", new URLSearchParams("store=kensetsu-fudosan"))).toBeNull();
    expect(requestStoreSlug("/", new URLSearchParams("store=kensetsu-fudosan"))).toBeNull();
  });
  it("ヘッダー名は x-guild-store", () => {
    expect(STORE_HEADER).toBe("x-guild-store");
  });
});

describe("isManifestPath / isGuildLocalPath", () => {
  it("manifest は昔の場所と店ごとの場所だけ", () => {
    expect(isManifestPath("/guild/manifest.webmanifest")).toBe(true);
    expect(isManifestPath("/guild/gia/manifest.webmanifest")).toBe(true);
    expect(isManifestPath("/guild/kensetsu-fudosan/manifest.webmanifest")).toBe(true);
    expect(isManifestPath("/guild/gia/manifest.webmanifest/x")).toBe(false);
    expect(isManifestPath("/guild/nonexistent/manifest.webmanifest")).toBe(false);
    expect(isManifestPath("/guild/gia/quests")).toBe(false);
  });
  it("ログイン後の戻り先は酒場の中の道だけ", () => {
    for (const ok of ["/guild", "/guild/gia/quests", "/guild/quests", "/guild?welcome=1"]) expect(isGuildLocalPath(ok)).toBe(true);
    for (const ng of ["", null, undefined, "//evil.example/guild", "https://evil.example/guild", "/guildx", "/admin", "/guild\\evil"]) expect(isGuildLocalPath(ng)).toBe(false);
  });
});
