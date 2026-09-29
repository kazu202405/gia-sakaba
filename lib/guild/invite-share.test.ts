import { describe, expect, it } from "vitest";
import {
  canNativeShare,
  inviteMessage,
  inviteUrl,
  isShareCancel,
  lineShareUrl,
} from "./invite-share";

describe("inviteUrl", () => {
  it("入会画面のURLに招待コードを付ける", () => {
    expect(inviteUrl("https://guild.gia2018.com", "abc123")).toBe(
      "https://guild.gia2018.com/guild/join?invite=abc123",
    );
  });

  it("末尾のスラッシュを重ねない", () => {
    expect(inviteUrl("https://guild.gia2018.com/", "abc")).toBe(
      "https://guild.gia2018.com/guild/join?invite=abc",
    );
  });

  it("コードはエンコードする（URLを壊させない）", () => {
    expect(inviteUrl("https://x.example", "a b&c=d")).toBe(
      "https://x.example/guild/join?invite=a%20b%26c%3Dd",
    );
  });
});

describe("inviteMessage", () => {
  const url = "https://guild.gia2018.com/guild/join?invite=abc";

  it("最後にリンクが付き、1行に1つずつ並ぶ", () => {
    const lines = inviteMessage(url).split("\n");
    expect(lines[lines.length - 1]).toBe(url);
    expect(lines[0]).toBe("GIAの酒場に招待します。");
  });

  it("入会画面に書いてあること（フリープラン0円）だけを約束する", () => {
    const text = inviteMessage(url);
    expect(text).toContain("フリープラン（0円）で入会できます");
    // 料金・特典・人数など、入会画面に無い約束を足さない
    for (const word of ["月額", "480", "880", "特典", "無料で使い放題", "限定", "今すぐ", "必ず"]) {
      expect(text).not.toContain(word);
    }
  });
});

describe("lineShareUrl", () => {
  it("招待文をエンコードしてLINEの共有URLにする", () => {
    const message = inviteMessage("https://x.example/guild/join?invite=a&b=1");
    const url = lineShareUrl(message);
    expect(url.startsWith("https://line.me/R/share?text=")).toBe(true);
    const text = new URL(url).searchParams.get("text");
    expect(text).toBe(message);          // 戻すと元の文章（リンク内の & も壊れない）
  });
});

describe("canNativeShare / isShareCancel", () => {
  it("shareがある端末だけ共有ボタンを出す", () => {
    expect(canNativeShare({ share: () => Promise.resolve() })).toBe(true);
    expect(canNativeShare({})).toBe(false);
    expect(canNativeShare(undefined)).toBe(false);
    expect(canNativeShare({ share: "no" })).toBe(false);
  });

  it("共有画面を閉じただけ（AbortError）はエラー扱いにしない", () => {
    expect(isShareCancel({ name: "AbortError" })).toBe(true);
    expect(isShareCancel(new DOMException("x", "AbortError"))).toBe(true);
    expect(isShareCancel({ name: "NotAllowedError" })).toBe(false);
    expect(isShareCancel(null)).toBe(false);
    expect(isShareCancel("AbortError")).toBe(false);
  });
});
