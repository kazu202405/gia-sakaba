import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { findPerson, kindOfPerson, ME_ID, type Person } from "./sns-mock";
import { PersonView } from "@/components/guild/look/sns/screens";
import { ProfilePreviewScreen } from "@/components/guild/look/sns/profile-preview";

vi.mock("@/components/guild/look/sns/store", async () => {
  const { findPerson, ME_ID } = await import("./sns-mock");
  return {
    useSnState: () => ({ me: { ...findPerson(ME_ID)!, now: "編集後のプロフィール内容" }, sentIntros: {} }),
    SnLink: ({ to, children, ...props }: { to: string; children: ReactNode }) => createElement("a", { href: to, ...props }, children),
  };
});

describe("他の人から見たプロフィール", () => {
  const me = findPerson(ME_ID)!;
  it("プレビューには編集後の値を使い、自分を表す「私」の顔を出さない", () => {
    const html = renderToStaticMarkup(createElement(ProfilePreviewScreen));
    expect(html).toContain("編集後のプロフィール内容");
    expect(html).toContain("他の人から見たプロフィール");
    expect(html).not.toContain('data-kind="me"');
    expect(kindOfPerson(me)).toBe("me");
    expect(kindOfPerson(me, null)).not.toBe("me");
  });
  it("未接続の人には連絡先と自分の管理機能を表示しない", () => {
    const html = renderToStaticMarkup(createElement(PersonView, { person: me, relation: { kind: "none" }, preview: true }));
    expect(html).not.toContain(me.contact.phone);
    expect(html).not.toContain(me.contact.email);
    expect(html).not.toContain("連絡先を見る");
    expect(html).not.toContain("プロフィールを編集");
    expect(html).not.toContain("出した依頼");
  });
  it("知り合いでは連絡先の入口を表示し、仕事の相談を経歴より先に出す", () => {
    const html = renderToStaticMarkup(createElement(PersonView, { person: me, relation: { kind: "direct" }, preview: true }));
    expect(html).toContain("連絡先を見る");
    expect(html).not.toContain(me.contact.phone);
    expect(html.indexOf("できること")).toBeLessThan(html.indexOf("経歴・人柄をもっと見る"));
  });
  it("紹介経路の非公開設定をプレビューで架空の経路に置き換えない", () => {
    const person: Person = { ...me, openToIntro: false };
    const html = renderToStaticMarkup(createElement(PersonView, { person, relation: { kind: "none" }, preview: true }));
    expect(html).not.toContain("sn-steps-route");
    expect(html).not.toContain("紹介をたのむ");
  });
});
