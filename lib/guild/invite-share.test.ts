import { describe, expect, it } from "vitest";
import { inviteUrl, ROTATE_COPY } from "./invite-share";

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

describe("ROTATE_COPY（リンクを作り直すの説明）", () => {
  const all = [
    ROTATE_COPY.lead,
    ...ROTATE_COPY.effects,
    ROTATE_COPY.button,
    ROTATE_COPY.confirmMessage,
    ROTATE_COPY.done,
  ].join("\n");

  it("何が起きるかを、押す前に伝える（使えなくなる・入会した人は残る）", () => {
    expect(ROTATE_COPY.effects.join("")).toContain("今のリンクは使えなくなり、新しいリンクができます");
    expect(ROTATE_COPY.effects.join("")).toContain("すでに入会した人とのつながりは、そのまま残ります");
    // 確認画面でも同じ安心を繰り返す
    expect(ROTATE_COPY.confirmMessage).toContain("すでに入会した人とのつながりは、そのまま残ります");
    expect(ROTATE_COPY.confirmMessage).toContain("今のリンクからは入会できなくなります");
  });

  it("ふだんは使わない操作だと分かる", () => {
    expect(ROTATE_COPY.lead).toContain("ふだんは押さなくて大丈夫");
    // 「広まりすぎた」ではなく「意図しない広がり方」。広まること自体は悪くない（2026-09-29 五島さん）
    expect(ROTATE_COPY.summary).toBe("リンクを変更したいとき");
    expect(ROTATE_COPY.lead).toContain("意図しない広がり方");
  });

  it("入会した人が消えるように読める言い方をしない", () => {
    for (const word of ["削除", "退会", "取り消", "無効にします", "消えます", "リセット"]) {
      expect(all).not.toContain(word);
    }
  });

  it("ボタンは「止める」と「作り直す」の両方が分かる", () => {
    expect(ROTATE_COPY.button).toContain("止めて");
    expect(ROTATE_COPY.button).toContain("作り直す");
  });
});
