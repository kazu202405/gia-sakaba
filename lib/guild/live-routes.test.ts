import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isLiveGuildPath, isLiveStoreRest, isLoginPath, isPublicGuildPath } from "./live-routes";
import { LEGACY_STORE_SEGMENTS, OUTSIDE_STORE_SEGMENTS, guildPath, outsideStorePath } from "./store-path";
import { STORES, STORE_SLUGS } from "./stores";

const UUID = "3f2a9c1e-5b7d-4e8a-9c3b-1a2b3c4d5e6f";

describe("isLiveStoreRest（ログイン済みの人が開ける、店の中の道）", () => {
  it("店の画面は開ける", () => {
    for (const rest of [
      "", "/members", "/members/abc", "/quests", "/quests/new", `/quests/${UUID}`, `/quests/${UUID}/edit`, `/quests/${UUID}/applicants`,
      "/projects", "/projects/new", `/projects/${UUID}`, `/projects/${UUID}/edit`,
      "/me", "/me/status", "/me/status/draft", "/me/wish", "/plan", "/requests", "/notifications", "/master", "/master/gathering/new",
    ]) expect([rest, isLiveStoreRest(rest)]).toEqual([rest, true]);
  });

  it("一覧に無い道・似た道は開けない", () => {
    for (const rest of ["/x", "/quests/abc", `/quests/${UUID}/x`, `/projects/${UUID}/applicants`, "/me/other", "/master/other", "/questsx", "/quests/new/x"]) {
      expect([rest, isLiveStoreRest(rest)]).toEqual([rest, false]);
    }
  });
});

describe("isPublicGuildPath / isLiveGuildPath / isLoginPath", () => {
  it("未ログインで開けるのは、店に属さない画面と、案内ページを持つ店のホームだけ", () => {
    for (const name of ["login", "join", "survey", "forgot-password", "reset-password", "auth/callback"]) {
      expect([name, isPublicGuildPath(outsideStorePath(name))]).toEqual([name, true]);
    }
    expect(isPublicGuildPath(guildPath("kensetsu-fudosan"))).toBe(true);
    // GIAの酒場は案内ページを持たない（/ が案内）ので、未ログインはログインへ
    expect(isPublicGuildPath(guildPath("gia"))).toBe(false);
    expect(isPublicGuildPath("/guild")).toBe(false);
    expect(isPublicGuildPath(guildPath("kensetsu-fudosan", "/quests"))).toBe(false);
    expect(isPublicGuildPath(guildPath("kensetsu-fudosan", "/members"))).toBe(false);
    expect(isPublicGuildPath("/guild/quests")).toBe(false);
    expect(isPublicGuildPath(`${outsideStorePath("login")}/x`)).toBe(false);
  });

  it("案内ページを持つ店だけが、店のホームを未ログインで開ける（設定と一致）", () => {
    for (const slug of STORE_SLUGS) {
      expect([slug, isPublicGuildPath(guildPath(slug))]).toEqual([slug, Boolean(STORES[slug].landing)]);
    }
    // 少なくとも1店は案内ページを持ち、1店は持たない（どちらの分岐も実際に確かめている）
    expect(STORE_SLUGS.some((slug) => STORES[slug].landing)).toBe(true);
    expect(STORE_SLUGS.some((slug) => !STORES[slug].landing)).toBe(true);
  });

  it("ログイン済みの人が開けるのは、入口・店の画面・店に属さない画面（ログイン画面は別扱い）", () => {
    expect(isLiveGuildPath("/guild")).toBe(true);
    expect(isLiveGuildPath(guildPath("gia", "/quests"))).toBe(true);
    expect(isLiveGuildPath(guildPath("kensetsu-fudosan", "/me/status"))).toBe(true);
    expect(isLiveGuildPath(outsideStorePath("join"))).toBe(true);
    expect(isLiveGuildPath(outsideStorePath("survey"))).toBe(true);
    expect(isLiveGuildPath(outsideStorePath("login"))).toBe(false);
    expect(isLoginPath(outsideStorePath("login"))).toBe(true);
    expect(isLoginPath(guildPath("gia", "/login"))).toBe(false);
  });

  it("登録されていない店・昔の道・でたらめな道は、ログイン済みでも入口へ戻す（開けない）", () => {
    expect(isLiveGuildPath("/guild/nonexistent/quests")).toBe(false);
    expect(isLiveGuildPath("/guild/quests")).toBe(false);
    expect(isLiveGuildPath(guildPath("gia", "/nonexistent"))).toBe(false);
  });
});

// 画面（app/guild の page.tsx）と道の表がずれないための見張り。
// 画面を足したのに表へ足し忘れると、ログイン済みでも入口へ戻されて開けない（道を足したら表にも足す）。
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name).replace(/\\/g, "/");
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function pageRests(): string[] {
  const root = "app/guild/[store]";
  return walk(root)
    .filter((path) => path.endsWith("/page.tsx"))
    .map((path) => path.slice(root.length, -"/page.tsx".length))
    .map((rest) => rest.replace(/\[id\]/g, UUID));
}

describe("道の表と画面（app/guild/[store]）の突き合わせ", () => {
  it("見る範囲にページがちゃんとある（空振りで通らない）", () => {
    const rests = pageRests();
    expect(rests.length).toBeGreaterThanOrEqual(20);
    expect(rests).toContain("");
    expect(rests).toContain("/quests/new");
    expect(rests).toContain(`/quests/${UUID}/applicants`);
  });

  it("画面があるのに表に無い道は、/thanks（決済の戻り先）だけ。これは昔から表に無い", () => {
    // 昔の lib/supabase/middleware.ts の一覧に /guild/thanks は無かった。店に分けても挙動を変えないため、同じにしている。
    // 表に足すかどうかは別の判断（決済のあとの戻り先が開けるようになる）。足したらこの期待も変える
    const missing = pageRests().filter((rest) => !isLiveStoreRest(rest));
    expect(missing).toEqual(["/thanks"]);
  });

  it("昔の道の名前は、すべて app/guild/[store] の下に実際の画面がある（転送先が 404 にならない）", () => {
    const folders = new Set(readdirSync("app/guild/[store]").filter((name) => statSync(join("app/guild/[store]", name)).isDirectory()));
    for (const segment of LEGACY_STORE_SEGMENTS) expect([segment, folders.has(segment)]).toEqual([segment, true]);
  });

  it("店に属さない画面の名前は、すべて app/guild の下に実際の画面がある", () => {
    const folders = new Set(readdirSync("app/guild").filter((name) => statSync(join("app/guild", name)).isDirectory()));
    for (const name of OUTSIDE_STORE_SEGMENTS) expect([name, folders.has(name)]).toEqual([name, true]);
  });
});

describe("middleware と proxy が表を読んでいる", () => {
  it("lib/supabase/middleware.ts は live-routes の関数でログイン判定する", () => {
    const source = readFileSync("lib/supabase/middleware.ts", "utf8");
    expect(source).toContain("isPublicGuildPath(pathname)");
    expect(source).toContain("isLiveGuildPath(pathname)");
    expect(source).toContain("isLoginPath(pathname)");
  });

  it("proxy.ts は、クライアントの x-guild-store を消してから、道で決め直す", () => {
    const source = readFileSync("proxy.ts", "utf8");
    const del = source.indexOf("request.headers.delete(STORE_HEADER)");
    const set = source.indexOf("request.headers.set(STORE_HEADER");
    expect(del).toBeGreaterThan(-1);
    expect(set).toBeGreaterThan(del);
    // 公開の固定ファイル（manifest など）の早期 return より前
    expect(del).toBeLessThan(source.indexOf("isManifestPath("));
    // 昔の道の転送は ?以降を残す
    expect(source).toContain("gate.keepSearch");
  });
});
