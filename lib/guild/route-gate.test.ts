import { describe, expect, it } from "vitest";
import { guildGate } from "./route-gate";

const prod = { allowLook: false };
const dev = { allowLook: true };

describe("guildGate", () => {
  it("公開LPの / は通す", () => {
    expect(guildGate("/", prod)).toEqual({ kind: "pass" });
  });

  it("/guild 配下は通す", () => {
    for (const p of ["/guild", "/guild/", "/guild/quests/new", "/guild/members/abc"]) {
      expect(guildGate(p, prod)).toEqual({ kind: "pass" });
    }
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

  it("GIA 本体の画面は /guild へ飛ばす", () => {
    for (const p of ["/login", "/plans", "/members/app/board", "/clone/x/tasks", "/admin", "/sitemap.xml"]) {
      expect(guildGate(p, prod)).toEqual({ kind: "redirect", to: "/guild" });
    }
  });

  it("酒場の決済・通知APIとStripe Webhookだけを通す", () => {
    for (const p of [
      "/api/guild/billing/checkout",
      "/api/guild/billing/portal",
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
