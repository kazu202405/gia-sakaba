import { describe, expect, it } from "vitest";
import { guildGate } from "./route-gate";

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
