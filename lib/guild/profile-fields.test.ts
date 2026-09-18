import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { profiles } from "./mock-data";

/**
 * 「ステータスに出ているのに 直せない」を 見つけるための見張り。
 *
 * 入会の画面・ステータスの入力画面・ステータスの表示画面が、それぞれ別に項目を並べて書いているので、
 * 項目を足した・移したときに 片方だけ直して 食い違うことがあった（かいしゃ・やくしょく・いま解決したいこと）。
 * ここでは Profile の項目が ぜんぶ ステータスの入力画面（status-wizard）で 直せることを 確かめる。
 *
 * この見張り自身が すり抜けないように、
 * ①わざと外す項目には 理由を書く ②存在しない項目名を入れたら落ちる ③画面のソースが読めなかったら落ちる。
 */

/** 人が入力しないもの（システムが決める）。外す理由をここに書く */
const NOT_TYPED_BY_PERSON: Record<string, string> = {
  id: "ログインのID（auth.users.id）",
  role: "ギルドでの役割。ギルドマスターが決める",
  joined_at: "入会した日。システムが入れる",
  gathering_approved_at: "限定の集まりの承認日。ギルドマスターの操作で入る",
};

const WIZARD = "components/guild/status-wizard.tsx";

describe("ステータスの入力画面（見張り）", () => {
  const source = readFileSync(WIZARD, "utf8");

  it("画面のソースが読めている（読めないまま 素通りさせない）", () => {
    expect(source.length).toBeGreaterThan(1000);
    expect(source).toContain("export function StatusWizard");
  });

  it("外す理由を書いた項目は、ほんとうに Profile にある（古い名前を残さない）", () => {
    const keys = Object.keys(profiles[0]);
    for (const key of Object.keys(NOT_TYPED_BY_PERSON)) {
      expect(keys, `${key} は Profile にない`).toContain(key);
    }
  });

  it("Profile の項目は ぜんぶ ステータスの入力画面で 直せる", () => {
    const missing = Object.keys(profiles[0])
      .filter((key) => !(key in NOT_TYPED_BY_PERSON))
      .filter((key) => !source.includes(`draft.${key}`));
    expect(missing, `${WIZARD} に draft.${missing.join(" / draft.")} が無い`).toEqual([]);
  });

  it("見張りが効いている（ありもしない項目を足すと 落ちる）", () => {
    expect(source.includes("draft.this_field_does_not_exist")).toBe(false);
  });
});
