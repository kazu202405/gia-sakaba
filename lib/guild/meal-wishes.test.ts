import { describe, expect, it } from "vitest";
import { normalizeMealWish } from "./meal-wishes";

describe("meal wish input", () => {
  it("trims a wish but rejects blank, non-string and excessive input", () => {
    expect(normalizeMealWish("  ものづくりの経営者と話したい  ")).toBe("ものづくりの経営者と話したい");
    expect(normalizeMealWish("   ")).toBeNull();
    expect(normalizeMealWish({ text: "test" })).toBeNull();
    expect(normalizeMealWish("a".repeat(501))).toBeNull();
  });
});
