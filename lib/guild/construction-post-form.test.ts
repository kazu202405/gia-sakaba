import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { constructionPost } from "./construction-forms";

// 2026-11-28 五島さん決定：案件に「問い合わせ先」は書かせない（連絡は案件ページの返信で受ける・電話やメールを公開範囲の全員に出さない）
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const POST_SCREENS = [
  "app/guild/[store]/posts/new/page.tsx",
  "app/guild/[store]/posts/[id]/page.tsx",
  "components/guild/construction/forms.tsx",
  "components/guild/look/sns/post-screens.tsx",
];

describe("案件の問い合わせ先をなくしたこと", () => {
  it("投稿・確認・詳細の画面に問い合わせ先が出ない", () => {
    for (const path of POST_SCREENS) expect(read(path), path).not.toContain("問い合わせ先");
  });

  it("問い合わせ先なしで投稿の入力が通る", () => {
    const parsed = constructionPost.safeParse({
      title: "t", category: "other", industry: "建設", body: "b", areas: ["大阪府"], visibility: "friends2", deadline: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("投稿では問い合わせ先を送らない（DBは0140で空を許す）", () => {
    expect(read("lib/guild/construction-actions.ts")).toContain("p_contact: null");
    expect(read("supabase/migrations/0140_sakaba_construction_post_contact_optional.sql")).toContain("alter column contact drop not null");
  });

  it("返事の期限は「なし／あり」を選ぶ共通部品で、本番と見本の両方が使う", () => {
    expect(read("components/guild/construction/forms.tsx")).toContain("<DeadlineChoice ");
    expect(read("components/guild/look/sns/post-screens.tsx")).toContain("<DeadlineChoice ");
    expect(read("app/guild/[store]/posts/new/page.tsx")).toContain("<ConstructionDeadline ");
  });

  it("期限の部品は label で包まない（iPhone でボタンを押すと日付の欄が開いてしまう）", () => {
    const picker = read("components/guild/look/sns/post-picker.tsx");
    const part = picker.slice(picker.indexOf("export function DeadlineChoice"));
    expect(part).toContain('<div className="sn-field" role="group"');
    expect(part).not.toContain("<label");
    expect(read("app/guild/[store]/posts/new/page.tsx")).not.toMatch(/<ConstructionField[^>]*>\s*<ConstructionDeadline/);
  });
});
