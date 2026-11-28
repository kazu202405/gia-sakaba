// 建設・不動産の店のメンバーのプロフィールの見た目の見張り（2026-11-28）。
// 建設の店：酒場の部品（c-window・c-button・JobAvatar の角ばった枠）と「‹ 名簿」を出さず、業種は名前（キーではない）で出す。
// 酒場の画面は今のまま（page.tsx の下半分）。ここでは建設の画面の部品を直接描いて確かめる。

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { ConstructionMemberProfile } from "@/components/guild/construction/member-profile";
import { StoreProvider } from "@/components/guild/store-context";
import { CONSTRUCTION_STORE_SLUG, findStore } from "@/lib/guild/stores";
import { makeStoreHandle } from "@/lib/guild/store-handle";
import type { Profile } from "@/lib/guild/types";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const store = makeStoreHandle(findStore(CONSTRUCTION_STORE_SLUG)!);
const profile = {
  id: "u1", display_name: "山田太郎", name_kana: "やまだ たろう", company_name: "山田工務店", show_company: true, position: "owner",
  photo_url: null, headline: "雨漏りの相談に乗ります", industry: "equipment", job: "現場監督", job_icon: "knight", region: "大阪府",
  work_areas: ["大阪府", "兵庫県"], work_types: ["屋根", "雨漏り"], has_construction_license: true, has_real_estate_license: false,
  work_photos: [], bio: "", values_text: "", looking_for: "", want_to_solve: "", visible_groups: [], accept_intro: true,
} as unknown as Profile;

const render = (over: Partial<Parameters<typeof ConstructionMemberProfile>[0]> = {}) => renderToStaticMarkup(
  createElement(StoreProvider as (props: { slug: string }) => ReactNode, { slug: CONSTRUCTION_STORE_SLUG }, createElement(ConstructionMemberProfile, {
    profile, isMe: false, config: store.config, w: store.w, contactItems: [], contactError: false, inviteConnected: false,
    showShareUrl: true, shareToken: "tok", workPhotos: [], ...over,
  })),
);

describe("建設・不動産の店のメンバーのプロフィール", () => {
  it("酒場の見た目・二重の戻るリンクを出さず、業種は名前で出す", () => {
    const html = render();
    expect(html).not.toContain("‹ 名簿");
    expect(html).not.toMatch(/c-window|c-button|c-label|c-dashed|c-chip|rpg-button/);
    expect(html).toContain("sn-card sn-person-card");
    expect(html).toContain("設備・電気");
    expect(html).not.toContain("equipment");
    expect(html).toContain("建設業許可");
    expect(html).toContain("やまだ たろう");
    expect(html).toContain("URLをコピー");
    expect(html).toContain("sn-btn");
  });

  it("本人が見るときだけ、上に「人からの見え方」の注意書きが出る", () => {
    expect(render({ isMe: true })).toContain("これは、ほかのメンバーから見えるあなたのプロフィールです。");
    expect(render()).not.toContain("これは、ほかのメンバーから見えるあなたのプロフィールです。");
    expect(render()).toContain("連絡先は、本人が選んだ相手にだけ表示しています。");
  });

  it("連絡先：つながった人だけのものは種類だけ、見せてよいものは値を出す", () => {
    const html = render({ contactItems: [
      { kind: "phone", label: null, value: null, locked: true },
      { kind: "email", label: null, value: "a@example.com", locked: false },
    ] as never });
    expect(html).toContain("つながった人にだけ表示");
    expect(html).toContain("a@example.com");
  });

  it("写真があれば本物の写真、なければ頭文字の丸", () => {
    expect(render()).toContain(">山</span>");
    expect(render({ profile: { ...profile, photo_url: "https://example.com/a.jpg" } })).toContain('src="https://example.com/a.jpg"');
  });

  it("酒場のページ（page.tsx）は、建設の店のときだけ分岐して従来の画面を残している", () => {
    const source = readFileSync("app/guild/[store]/members/[id]/page.tsx", "utf8");
    expect(source).toContain("store.slug === CONSTRUCTION_STORE_SLUG");
    expect(source).toContain('<BackLink href={store.path("/members")}');
    expect(source).toContain("<MemberShareUrl");
    expect(source.indexOf("ConstructionMemberProfile")).toBeLessThan(source.indexOf("<BackLink"));
  });
});
