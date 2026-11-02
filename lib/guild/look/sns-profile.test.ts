import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { companyOf, findPerson, kindOfPerson, ME_ID, type Person } from "./sns-mock";
import { PersonView } from "@/components/guild/look/sns/screens";
import { ProfilePreviewScreen } from "@/components/guild/look/sns/profile-preview";
import { MeScreen } from "@/components/guild/look/sns/me-screens";

vi.mock("@/components/guild/look/sns/store", async () => {
  const { findPerson, ME_ID } = await import("./sns-mock");
  return {
    useSnState: () => ({ me: { ...findPerson(ME_ID)!, now: "編集後のプロフィール内容" }, sentIntros: {}, myPosts: [], myAnswers: [] }),
    SnLink: ({ to, children, ...props }: { to: string; children: ReactNode }) => createElement("a", { href: to, ...props }, children),
  };
});

describe("マイページ", () => {
  const html = renderToStaticMarkup(createElement(MeScreen));
  it("プロフィール → 出した依頼 → 知り合い → 招待 → 設定 の順を保つ", () => {
    const order = [">これまで</p>", "<h2>出した依頼</h2>", "<h2>知り合い</h2>", "知り合いを招待する</h2>", "<h2>設定</h2>"].map((s) => html.indexOf(s));
    expect(order.every((p) => p >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it("編集の入口は名刺の下にあり、紹介の道の説明は1回だけ出す", () => {
    expect(html.indexOf("sn-person-card")).toBeLessThan(html.indexOf("プロフィールを編集"));
    expect(html.indexOf("プロフィールを編集")).toBeLessThan(html.indexOf(">これまで</p>"));
    expect(html.match(/紹介の道は、/g)).toHaveLength(1);
  });
  it("数の目次の飛び先が実際にある", () => {
    const targets = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(0);
    for (const id of targets) expect(html).toContain(`id="${id}"`);
  });
  it("知り合いは、はじめ数人だけ出し、残りの人数を押して開ける", () => {
    expect(html.match(/class="sn-me-row"/g)).toHaveLength(3);
    expect(html).toMatch(/あと<!-- -->\d+<!-- -->人を見る|あと\d+人を見る/);
  });
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
  it("知り合いには従来どおり連絡先の入口を表示する", () => {
    const html = renderToStaticMarkup(createElement(PersonView, { person: me, relation: { kind: "direct" }, preview: true }));
    expect(html).toContain("連絡先を見る");
    expect(html).not.toContain(me.contact.phone);
  });
  it("元のプロフィールの項目・文章・表示順を維持し、折りたたまない", () => {
    const html = renderToStaticMarkup(createElement(PersonView, { person: me, relation: { kind: "self" } }));
    for (const text of [me.name, me.title, me.say, me.past, me.now, me.future, ...me.offer, ...me.want, ...me.talk]) expect(html).toContain(text);
    const headings = ["これまで", "いま", "これから", "できること", "探していること"];
    const positions = headings.map((heading) => html.indexOf(`>${heading}</p>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).not.toContain("<details");
    expect(html).not.toContain("仕事・紹介の相談");
  });
  it("会社情報・許可登録の記載を隠さず、元の名刺内に表示する", () => {
    const person = findPerson("mori")!;
    const company = companyOf(person)!;
    const html = renderToStaticMarkup(createElement(PersonView, { person, relation: { kind: "none" } }));
    expect(html).toContain(company.name);
    for (const license of company.licenses) {
      expect(html).toContain(license.name);
      if (license.number) expect(html).toContain(license.number);
    }
    expect(html.indexOf(company.licenses[0].name)).toBeLessThan(html.indexOf(person.say));
    expect(html).not.toContain("<details");
  });
  it("紹介経路の非公開設定をプレビューで架空の経路に置き換えない", () => {
    const person: Person = { ...me, openToIntro: false };
    const html = renderToStaticMarkup(createElement(PersonView, { person, relation: { kind: "none" }, preview: true }));
    expect(html).not.toContain("sn-steps-route");
    expect(html).not.toContain("紹介をたのむ");
  });
});
