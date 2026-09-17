import { describe, expect, it } from "vitest";
import { GROUND_RULES, GUILD_PROMISES } from "./rules";

describe("ギルドの約束", () => {
  it("勧誘・紹介料目的・信頼を裏切る の3つ", () => {
    expect(GUILD_PROMISES).toHaveLength(3);
  });

  it("話すときの約束（グランドルール）は さえぎらない・まず受け止める・自分ばかり話さない", () => {
    expect(GROUND_RULES).toHaveLength(3);
    expect(GROUND_RULES.join("")).toContain("さえぎらない");
  });
});
