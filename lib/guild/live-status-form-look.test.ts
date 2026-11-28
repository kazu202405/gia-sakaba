// プロフィール編集（LiveStatusForm）の見た目の出し分けの見張り（2026-11-28）。
// 建設・不動産の店は、店の枠に「もどる」があるので「マイページへ戻る」を重ねて出さず、sn- の見た目に寄せる。
// 酒場（gia）は今のまま（戻るリンク・窓・ドット見出しが残る）。

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LiveStatusForm } from "@/components/guild/live-status-form";
import { StoreProvider } from "@/components/guild/store-context";
import type { MyGuildProfile } from "@/lib/guild/server-data";
import { CONSTRUCTION_STORE_SLUG } from "@/lib/guild/stores";

vi.mock("@/components/guild/use-guild-router", () => ({ useGuildRouter: () => ({ push: () => {}, refresh: () => {} }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/components/profile/ImageCropDialog", () => ({ ImageCropDialog: () => null }));

const profile = {
  id: "u1", display_name: "山田太郎", company_name: "山田工務店", name_kana: "", headline: "", job: "", job_icon: "knight", region: "",
  bio: "", values_text: "", looking_for: "", industry: "", position: "staff", show_company: true, photo_url: null,
  hometown: "", hobbies: "", life_story: "", birth_month: null, birth_day: null, birth_year: null,
  contact: { email: "", line_url: "", website_url: "" },
} as unknown as MyGuildProfile;

const render = (slug: string, draft = false) => renderToStaticMarkup(
  createElement(StoreProvider as (props: { slug: string }) => ReactNode, { slug }, createElement(LiveStatusForm, {
    initial: profile, guildId: "g1", workPhotoUrls: {},
    profileDraft: draft ? { id: "d1", from: "管理者", skipped: [] } : undefined,
  })),
);

describe("プロフィール編集の見た目の出し分け", () => {
  it("建設・不動産の店：枠の「もどる」と重ねて「マイページへ戻る」を出さず、sn- の見た目になる", () => {
    const html = render(CONSTRUCTION_STORE_SLUG);
    expect(html).not.toContain("マイページへ戻る");
    expect(html).toContain("sn-live-edit");
    expect(html).toContain("<h2>プロフィールを編集</h2>");
    expect(html).toContain("必須はお名前と会社名だけです。入力は自動で保存されます。");
    expect(html).toContain("保存済み");
    expect(html).toContain("sn-btn sn-btn--main sn-btn--wide");
    expect(html).not.toContain("rpg-button");
    expect(html).not.toContain("c-window");
  });

  it("建設・不動産の店でも、下書きから来たときの「保存しない戻り」は残す", () => {
    expect(render(CONSTRUCTION_STORE_SLUG, true)).toContain("下書きの画面へ戻る（保存しません）");
  });

  it("酒場（gia）：今までどおり「マイページへ戻る」・窓・金のボタンが出る", () => {
    const html = render("gia");
    expect(html).toContain("マイページへ戻る");
    expect(html).toContain("c-window");
    expect(html).toContain("rpg-button");
    expect(html).not.toContain("sn-live-edit");
    expect(html).not.toContain("sn-btn");
  });
});
