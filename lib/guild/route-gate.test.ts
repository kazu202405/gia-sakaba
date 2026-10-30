import { describe, expect, it } from "vitest";
import { guildGate } from "./route-gate";
import { STORE_SLUGS } from "./stores";

const prod = { allowLook: false };
const dev = { allowLook: true };

describe("guildGate", () => {
  it("公開LPの / は通す", () => {
    expect(guildGate("/", prod)).toEqual({ kind: "pass" });
  });

  it("招待制の集まりは有効な長いトークンだけ通す", () => {
    const token = "a".repeat(64);
    expect(guildGate(`/e/${token}`, prod)).toEqual({ kind: "pass" });
    expect(guildGate("/e/example", prod)).toEqual({ kind: "redirect", to: "/guild" });
    expect(guildGate(`/e/${token}/extra`, prod)).toEqual({ kind: "redirect", to: "/guild" });
  });

  it("管理者からの紹介は有効な長いトークンだけ通す", () => {
    const token = "b".repeat(64);
    expect(guildGate(`/i/${token}`, prod)).toEqual({ kind: "pass" });
    expect(guildGate("/i/example", prod)).toEqual({ kind: "redirect", to: "/guild" });
    expect(guildGate(`/i/${token}/extra`, prod)).toEqual({ kind: "redirect", to: "/guild" });
  });

  it("共有URL（/p/）は64桁の専用URLだけ通す", () => {
    const token = "c".repeat(64);
    expect(guildGate(`/p/${token}`, prod)).toEqual({ kind: "pass" });
    expect(guildGate("/p/example", prod)).toEqual({ kind: "redirect", to: "/guild" });
    expect(guildGate(`/p/${token}/extra`, prod)).toEqual({ kind: "redirect", to: "/guild" });
    expect(guildGate("/p", prod)).toEqual({ kind: "redirect", to: "/guild" });
    expect(guildGate(`/p/${token.toUpperCase()}`, prod)).toEqual({ kind: "redirect", to: "/guild" });
  });

  it("利用規約・プライバシー・特商法表記は未ログインでも通す（下位パスは通さない）", () => {
    for (const p of ["/terms", "/privacy", "/tokushoho"]) {
      expect(guildGate(p, prod)).toEqual({ kind: "pass" });
      expect(guildGate(`${p}/extra`, prod)).toEqual({ kind: "redirect", to: "/guild" });
    }
  });

  it("/guild 配下は通す（店の道・店に属さない画面）", () => {
    for (const p of [
      "/guild", "/guild/", "/guild/login", "/guild/join", "/guild/survey", "/guild/auth/callback", "/guild/manifest.webmanifest",
      "/guild/gia", "/guild/gia/quests/new", "/guild/gia/members/abc", "/guild/kensetsu-fudosan", "/guild/kensetsu-fudosan/quests",
    ]) {
      expect(guildGate(p, prod)).toEqual({ kind: "pass" });
    }
  });

  it("店ができる前の昔の道は、既定の店（gia）の道へ転送する。?以降（招待コードなど）は残す", () => {
    const cases: [string, string][] = [
      ["/guild/quests", "/guild/gia/quests"],
      ["/guild/quests/new", "/guild/gia/quests/new"],
      ["/guild/quests/3f2a/applicants", "/guild/gia/quests/3f2a/applicants"],
      ["/guild/members", "/guild/gia/members"],
      ["/guild/members/abc", "/guild/gia/members/abc"],
      ["/guild/projects/abc/edit", "/guild/gia/projects/abc/edit"],
      ["/guild/requests", "/guild/gia/requests"],
      ["/guild/me", "/guild/gia/me"],
      ["/guild/me/status/draft", "/guild/gia/me/status/draft"],
      ["/guild/notifications", "/guild/gia/notifications"],
      ["/guild/plan", "/guild/gia/plan"],
      ["/guild/master", "/guild/gia/master"],
      ["/guild/master/gathering/new", "/guild/gia/master/gathering/new"],
      ["/guild/thanks", "/guild/gia/thanks"],
    ];
    for (const [from, to] of cases) expect([from, guildGate(from, prod)]).toEqual([from, { kind: "redirect", to, keepSearch: true }]);
  });

  it("昔の道に似ているだけの道は転送しない（登録されていない店の名前として、画面側が 404 にする）", () => {
    for (const p of ["/guild/questsx", "/guild/meeting", "/guild/members-only"]) {
      expect(guildGate(p, prod)).toEqual({ kind: "pass" });
    }
  });

  it("店の slug が昔の道の名前とぶつからない（転送が店の道を奪わない）", () => {
    for (const slug of STORE_SLUGS) expect(guildGate(`/guild/${slug}/quests`, prod)).toEqual({ kind: "pass" });
  });

  it("/guild で始まるだけの別の道は通さない", () => {
    expect(guildGate("/guildx", prod)).toEqual({ kind: "redirect", to: "/guild" });
    expect(guildGate("/guild-master", prod)).toEqual({ kind: "redirect", to: "/guild" });
  });

  it("見比べ用 /guild-look は開発中だけ通す", () => {
    expect(guildGate("/guild-look/c", dev)).toEqual({ kind: "pass" });
    expect(guildGate("/guild-look", prod)).toEqual({ kind: "redirect", to: "/guild" });
    expect(guildGate("/guild-look/c", prod)).toEqual({ kind: "redirect", to: "/guild" });
  });

  it("建設・不動産の酒場の作り直しの見本 /guild-look/sns だけは本番でも通す（ほかの見本・似た道は通さない）", () => {
    expect(guildGate("/guild-look/sns", prod)).toEqual({ kind: "pass" });
    expect(guildGate("/guild-look/sns/people/yamamoto", prod)).toEqual({ kind: "pass" });
    expect(guildGate("/guild-look/snsx", prod)).toEqual({ kind: "redirect", to: "/guild" });
    expect(guildGate("/guild-look/a", prod)).toEqual({ kind: "redirect", to: "/guild" });
    expect(guildGate("/guild-look", prod)).toEqual({ kind: "redirect", to: "/guild" });
  });

  it("GIA 本体の画面は /guild へ飛ばす", () => {
    for (const p of ["/login", "/plans", "/members/app/board", "/clone/x/tasks", "/admin", "/sitemap.xml"]) {
      expect(guildGate(p, prod)).toEqual({ kind: "redirect", to: "/guild" });
    }
  });

  it("酒場の決済・通知APIとStripe Webhookだけを通す", () => {
    for (const p of [
      "/api/guild/billing/checkout",
      "/api/guild/billing/portal",
      "/api/guild/meal-wish",
      "/api/guild/meal-availability",
      "/api/guild/push/subscriptions",
      "/api/guild/push/dispatch",
      "/api/stripe/webhook",
    ]) {
      expect(guildGate(p, prod)).toEqual({ kind: "pass" });
    }
  });

  it("その他のAPIは404にする（似た道も巻き込まない）", () => {
    for (const p of [
      "/api",
      "/api/keep-alive",
      "/api/slack/events",
      "/api/guild/billing",
      "/api/guild/billing/checkout/extra",
      "/api/stripe/webhook/extra",
    ]) {
      expect(guildGate(p, prod)).toEqual({ kind: "notFound" });
    }
    expect(guildGate("/apiary", prod)).toEqual({ kind: "redirect", to: "/guild" });
  });

  it("Next.js の内部ファイルと公開してよい固定ファイルは通す", () => {
    for (const p of ["/_next/static/chunks/a.js", "/_next/image", "/__nextjs_original-stack-frame", "/images/hero.mp4", "/favicon.ico", "/robots.txt", "/guild-sw.js", "/gia-logo.png"]) {
      expect(guildGate(p, prod)).toEqual({ kind: "pass" });
    }
  });
});
