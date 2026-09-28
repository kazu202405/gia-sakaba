import { describe, expect, it } from "vitest";
import { validateMasterIntroduction, type MasterIntroductionDraft } from "./master-introductions";

const valid: MasterIntroductionDraft = {
  reason: "お二人の仕事が合いそうだからです。",
  a: { member_id: "member-a", name: "山田 太郎", company: "山田商店", preview: "地域事業を営む方です。" },
  b: { member_id: "", name: "佐藤 花子", company: "", preview: "業務改善を支援する方です。" },
};

describe("master introduction validation", () => {
  it("accepts a member and an external person", () => {
    expect(validateMasterIntroduction(valid)).toBeNull();
  });

  it("requires at least one member", () => {
    expect(validateMasterIntroduction({ ...valid, a: { ...valid.a, member_id: "" } })).toMatch(/少なくとも一方/);
  });

  it("rejects the same member on both sides", () => {
    expect(validateMasterIntroduction({ ...valid, b: { ...valid.b, member_id: "member-a" } })).toMatch(/同じ会員/);
  });

  it("requires the anonymized preview for both people", () => {
    expect(validateMasterIntroduction({ ...valid, b: { ...valid.b, preview: "" } })).toMatch(/先に見せる紹介/);
  });
});
