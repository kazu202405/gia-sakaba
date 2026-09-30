import { describe, expect, it } from "vitest";
import { applyShareChange, isShareToken, shareUrl, type ShareSettings } from "./shared-profile";

const base: ShareSettings = {
  token: "a".repeat(64), enabled: true,
  show_profile: true, show_personal: true, show_card: false, show_intros: false, show_intro_authors: false,
};

describe("共有URLの設定", () => {
  it("初期値：プロフィールと趣味・あゆみはオン、名刺・紹介状・書いた人の名前はオフ", () => {
    expect(base).toMatchObject({ show_profile: true, show_personal: true, show_card: false, show_intros: false, show_intro_authors: false });
  });

  it("紹介状をオフにすると、書いた人の名前も必ずオフになる", () => {
    const on = applyShareChange(base, { show_intros: true, show_intro_authors: true });
    expect(on.show_intro_authors).toBe(true);
    const off = applyShareChange(on, { show_intros: false });
    expect(off.show_intros).toBe(false);
    expect(off.show_intro_authors).toBe(false);
  });

  it("紹介状がオフのまま、書いた人の名前だけをオンにしても、オンにならない", () => {
    expect(applyShareChange(base, { show_intro_authors: true }).show_intro_authors).toBe(false);
  });

  it("紹介状だけをオンにしても、書いた人の名前はオフのまま", () => {
    const next = applyShareChange(base, { show_intros: true });
    expect(next.show_intros).toBe(true);
    expect(next.show_intro_authors).toBe(false);
  });

  it("元の設定は書き換えない（失敗したとき元の値に戻せる）", () => {
    const copy = { ...base };
    applyShareChange(base, { show_card: true, show_intros: true });
    expect(base).toEqual(copy);
  });

  it("ほかのスイッチには触れない", () => {
    const next = applyShareChange(base, { show_card: true });
    expect(next).toEqual({ ...base, show_card: true });
  });
});

describe("URLの文字列", () => {
  it("64桁の16進だけを通す", () => {
    expect(isShareToken("a".repeat(64))).toBe(true);
    expect(isShareToken("0123456789abcdef".repeat(4))).toBe(true);
    for (const bad of ["", "a".repeat(63), "a".repeat(65), "A".repeat(64), "g".repeat(64), `${"a".repeat(63)}/`, " " + "a".repeat(63)]) {
      expect(isShareToken(bad)).toBe(false);
    }
  });

  it("URLを組み立てる（末尾のスラッシュがあっても二重にしない）", () => {
    const token = "b".repeat(64);
    expect(shareUrl("https://guild.gia2018.com", token)).toBe(`https://guild.gia2018.com/p/${token}`);
    expect(shareUrl("https://guild.gia2018.com/", token)).toBe(`https://guild.gia2018.com/p/${token}`);
  });
});
