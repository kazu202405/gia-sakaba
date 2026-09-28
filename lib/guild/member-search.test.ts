import { describe, expect, it } from "vitest";
import { memberMatchesQuery } from "./member-search";

const m = {
  display_name: "五島 一将", name_kana: "ごしま かずまさ", job: "経営者", headline: "人と仕事をつなぐ",
  company_name: "GIA", industry: "コンサル", region: "東京", bio: "採用の相談にのります", values_text: "", looking_for: "", keywords: ["決算"],
};

describe("名鑑の検索", () => {
  it("フリー・プラスは名前・よみ・職業だけ", () => {
    expect(memberMatchesQuery(m, "五島", "list")).toBe(true);
    expect(memberMatchesQuery(m, "ごしま", "list")).toBe(true);
    expect(memberMatchesQuery(m, "経営", "filter")).toBe(true);
    expect(memberMatchesQuery(m, "採用", "list")).toBe(false);
    expect(memberMatchesQuery(m, "決算", "filter")).toBe(false);
  });
  it("ビジネスは本文・キーワードまで", () => {
    expect(memberMatchesQuery(m, "採用", "keyword")).toBe(true);
    expect(memberMatchesQuery(m, "決算", "keyword")).toBe(true);
  });
  it("空なら全員", () => {
    expect(memberMatchesQuery(m, "  ", "list")).toBe(true);
  });
});
