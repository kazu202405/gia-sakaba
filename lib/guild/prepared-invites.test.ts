import { describe, expect, it } from "vitest";
import { validatePreparedInvite } from "./prepared-invites";

describe("prepared member invitation", () => {
  const valid = { display_name: "山田 太郎", company_name: "株式会社やまだ", position: "ceo" as const, introduction: "誠実な仕事ぶりの方です。" };
  it("allows optional company, role and introduction", () => {
    expect(validatePreparedInvite({ ...valid, company_name: "", position: "", introduction: "" })).toBeNull();
  });
  it("requires a name and limits text", () => {
    expect(validatePreparedInvite({ ...valid, display_name: " " })).toMatch(/お名前/);
    expect(validatePreparedInvite({ ...valid, introduction: "あ".repeat(401) })).toMatch(/紹介文/);
  });
});
