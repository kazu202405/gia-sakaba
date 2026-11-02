import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteSignup } from "@/components/guild/invite-signup";
import { JoinForm } from "@/components/guild/join-form";
import { FREE_JOIN_COPY } from "./join";
import { findStore } from "./stores";

// 入口のハードルの見張り：入力は名前・メール・パスワードの3つだけ、無料の案内は無料の店にだけ出す。

const store = vi.hoisted(() => ({ slug: "gia" }));

vi.mock("@/components/guild/store-context", () => ({
  useGuildStore: () => ({ config: findStore(store.slug), path: () => "/" }),
}));
vi.mock("@/components/guild/use-guild-router", () => ({ useGuildRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const signup = () => renderToStaticMarkup(createElement(InviteSignup, { inviteCode: "X", inviterName: "山田" }));
const join = () => renderToStaticMarkup(createElement(JoinForm, { inviterName: "山田", inviteCode: "X" }));

describe("登録の入口", () => {
  beforeEach(() => { store.slug = "gia"; });
  it("入力は名前・メール・パスワードの3つで、確認用の再入力は無い", () => {
    const html = signup();
    expect(html.match(/<input[^>]*class="c-input/g)).toHaveLength(3);
    expect(html).not.toContain("（確認）");
  });
  it("無料の店では無料でカードが要らないことを、登録の前に見せる", () => {
    const html = signup();
    for (const point of FREE_JOIN_COPY.points) expect(html).toContain(point);
    expect(html.indexOf(FREE_JOIN_COPY.title)).toBeLessThan(html.indexOf("メールアドレス"));
    expect(html).toContain(FREE_JOIN_COPY.signupButton);
  });
  it("スマホで登録欄がログインの案内より先に来る", () => {
    const html = signup();
    expect(html).not.toContain("order-first");
    expect(html.indexOf("新規登録")).toBeLessThan(html.indexOf("すでに登録した方はこちら"));
  });
  it("無料と約束していない店には、無料と書かない", () => {
    store.slug = "kensetsu-fudosan";
    for (const html of [signup(), join()]) expect(html).not.toContain("無料");
  });
});

describe("入会フォーム", () => {
  beforeEach(() => { store.slug = "gia"; });
  it("約束への同意と規約のリンクは、畳まずに残す", () => {
    const html = join();
    expect(html).toContain("約束を まもり、利用規約と プライバシーポリシーに 同意します");
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html.indexOf("同意します")).toBeLessThan(html.indexOf(FREE_JOIN_COPY.joinButton));
    expect(html.slice(html.lastIndexOf("</details>"))).toContain("同意します");
  });
  it("名鑑に会社名と役職が出ることは、畳んでいても読める", () => {
    expect(join()).toMatch(/<summary[^>]*>会社名と役職はメンバーめいかんに出ます/);
  });
  it("役職「その他」の承認の案内は残っている", () => {
    expect(join()).toContain("代表・役員・決裁者");
  });
});
