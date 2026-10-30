import { describe, expect, it } from "vitest";
import {
  CONNECTIONS,
  EMPTY_FILTER,
  ME_ID,
  PEOPLE,
  POSTS,
  COMPANIES,
  RECENT_CONNECTIONS,
  areaText,
  findPerson,
  relationText,
  relationTo,
  relationToCompany,
  searchCompanies,
  searchPeople,
} from "./sns-mock";

describe("仮データのつじつま", () => {
  it("つながり・投稿・最近つながった人は、いる人だけを指す", () => {
    for (const [a, b] of CONNECTIONS) {
      expect(findPerson(a), a).not.toBeNull();
      expect(findPerson(b), b).not.toBeNull();
    }
    for (const p of POSTS) expect(findPerson(p.authorId), p.id).not.toBeNull();
    for (const id of RECENT_CONNECTIONS) expect(relationTo(id).kind, id).toBe("direct");
  });
  it("自分以外の人は、いる会社に所属している", () => {
    const ids = new Set(COMPANIES.map((c) => c.id));
    for (const p of PEOPLE.filter((x) => x.id !== ME_ID)) expect(ids.has(p.companyId), p.id).toBe(true);
  });
});

describe("つながり（紹介の道は2段まで）", () => {
  it("直接の知り合い", () => {
    expect(relationTo("sato")).toEqual({ kind: "direct" });
  });
  it("知り合いの知り合いは、間の知り合いを返す", () => {
    const r = relationTo("yamamoto");
    expect(r.kind).toBe("via");
    if (r.kind === "via") expect(["sato", "mori"]).toContain(r.via.id);
  });
  it("紹介の道を見せない人は、知り合いの知り合いでも道なし", () => {
    // 北村さんは湊さん（知り合い）の知り合いだが、openToIntro=false
    expect(relationTo("kitamura")).toEqual({ kind: "none" });
  });
  it("いない人は道なし", () => {
    expect(relationTo("nobody")).toEqual({ kind: "none" });
  });
  it("自分", () => {
    expect(relationTo(ME_ID)).toEqual({ kind: "self" });
  });
  it("会社とのつながりは、所属する人のうちいちばん近い人", () => {
    expect(relationToCompany("minato-setsubi").relation.kind).toBe("direct");
    expect(relationToCompany("yamamoto-densetsu").person?.id).toBe("yamamoto");
    expect(relationToCompany("hokushin").relation.kind).toBe("none");
  });
  it("一文", () => {
    expect(relationText({ kind: "direct" })).toBe("あなたの知り合いです");
    const via = findPerson("sato")!;
    expect(relationText({ kind: "via", via })).toBe("佐藤さん経由で紹介できます");
  });
});

describe("探す", () => {
  it("条件なしなら自分以外の全員。紹介できる順（知り合い → 知り合いの知り合い → それ以外）", () => {
    const people = searchPeople(EMPTY_FILTER);
    expect(people.find((p) => p.id === ME_ID)).toBeUndefined();
    expect(people).toHaveLength(PEOPLE.length - 1);
    const order = { direct: 0, via: 1, none: 2, self: 3 } as const;
    const kinds = people.map((p) => order[relationTo(p.id).kind]);
    expect(kinds).toEqual([...kinds].sort((a, b) => a - b));
  });
  it("地域は対応エリアで絞る（所在地ではない）", () => {
    const kanto = searchCompanies({ ...EMPTY_FILTER, regions: ["関東"] }).map((c) => c.id);
    expect(kanto).toContain("nakamura-fudosan");
    expect(kanto).not.toContain("sato-komuten");
  });
  it("言葉は全部ふくむものだけ（空白で区切る）", () => {
    // 関東にかかる電気工事の会社は3社。並びは知り合い（湊さん）→ 知り合いの知り合い（山本さん）→ 道なし
    expect(searchCompanies({ ...EMPTY_FILTER, query: "電気工事 関東" }).map((c) => c.id)).toEqual(["minato-setsubi", "yamamoto-densetsu", "hokushin"]);
    expect(searchCompanies({ ...EMPTY_FILTER, query: "電気工事 九州" })).toEqual([]);
    expect(searchPeople({ ...EMPTY_FILTER, query: "太陽光" }).map((p) => p.id)).toEqual(["yamamoto", "kitamura"]);
  });
  it("確認済みの許可だけ・紹介できる人だけ", () => {
    expect(searchCompanies({ ...EMPTY_FILTER, licensedOnly: true }).map((c) => c.id)).not.toContain("minato-setsubi");
    expect(searchPeople({ ...EMPTY_FILTER, introducibleOnly: true }).map((p) => p.id)).not.toContain("kitamura");
  });
});

describe("対応エリアの見せ方", () => {
  it("地域を丸ごと覆えば「〇〇全域」", () => {
    expect(areaText(["東京都", "神奈川県", "埼玉県", "千葉県", "茨城県", "栃木県", "群馬県"])).toBe("関東全域");
    expect(areaText(["東京都", "神奈川県"])).toBe("東京都・神奈川県");
  });
});
