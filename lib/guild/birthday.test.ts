import { describe, expect, it } from "vitest";
import { birthdayLabel, isValidBirthday } from "./birthday";

describe("任意の誕生日", () => {
  it("月日を省略でき、生年だけは登録しない", () => {
    expect(isValidBirthday(null, null, null)).toBe(true);
    expect(isValidBirthday(6, null, null)).toBe(false);
    expect(isValidBirthday(null, null, 1980)).toBe(false);
  });

  it("生年なしの2月29日と、うるう年を区別する", () => {
    expect(isValidBirthday(2, 29, null)).toBe(true);
    expect(isValidBirthday(2, 29, 2000)).toBe(true);
    expect(isValidBirthday(2, 29, 2001)).toBe(false);
    expect(isValidBirthday(4, 31, null)).toBe(false);
  });

  it("入力した生年だけ表示に含める", () => {
    expect(birthdayLabel(6, 15, null)).toBe("6月15日");
    expect(birthdayLabel(6, 15, 1980)).toBe("1980年6月15日");
    expect(birthdayLabel(null, null, null)).toBe("");
  });
});
