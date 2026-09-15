import { describe, expect, it } from "vitest";
import { loginIntentFor } from "./login-intent";

describe("loginIntentFor", () => {
  it("Company Note の招待決済へ戻るときだけ専用表示にする", () => {
    expect(loginIntentFor("/upgrade/invite?from=note")).toBe(
      "company-note-invite",
    );
  });

  it.each([
    null,
    "/upgrade/invite",
    "/upgrade/invite?from=other",
    "/upgrade?from=note",
    "https://example.com/upgrade/invite?from=note",
    "//example.com/upgrade/invite?from=note",
  ])("それ以外は通常ログインのままにする: %s", (path) => {
    expect(loginIntentFor(path)).toBe("default");
  });
});
