import { describe, expect, it } from "vitest";
import { validateMealAvailability } from "./meal-availability";

const now = new Date("2026-09-27T00:00:00Z").getTime();

describe("meal availability", () => {
  it("accepts a future time range and trims the note", () => {
    expect(validateMealAvailability({ starts_at: "2026-10-01T19:00:00+09:00", ends_at: "2026-10-01T21:00:00+09:00", note: "  大阪  " }, now))
      .toEqual({ starts_at: "2026-10-01T10:00:00.000Z", ends_at: "2026-10-01T12:00:00.000Z", note: "大阪" });
  });
  it("rejects old, reversed, too long and invalid ranges", () => {
    const slot = { starts_at: "2026-10-01T19:00:00+09:00", ends_at: "2026-10-01T21:00:00+09:00", note: "" };
    expect(validateMealAvailability({ ...slot, starts_at: "2026-09-26T19:00:00+09:00" }, now)).toBeNull();
    expect(validateMealAvailability({ ...slot, ends_at: "2026-10-01T18:00:00+09:00" }, now)).toBeNull();
    expect(validateMealAvailability({ ...slot, ends_at: "2026-10-02T08:00:00+09:00" }, now)).toBeNull();
    expect(validateMealAvailability({ ...slot, note: "x".repeat(121) }, now)).toBeNull();
    expect(validateMealAvailability({ ...slot, starts_at: "wrong" }, now)).toBeNull();
  });
});
