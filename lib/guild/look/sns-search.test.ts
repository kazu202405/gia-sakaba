import { describe, expect, it } from "vitest";
import { CONSTRUCTION_TRADES, matchesConstruction, matchesEstate } from "./sns-construction";
import { EMPTY_FILTER, REGIONS, searchCompanies, searchPeople } from "./sns-mock";

describe("エリア・専門業種の検索", () => {
  it("47都道府県が重複せず、建設は29業種", () => {
    const prefs = Object.values(REGIONS).flat();
    expect(prefs).toHaveLength(47);
    expect(new Set(prefs).size).toBe(47);
    expect(new Set(CONSTRUCTION_TRADES).size).toBe(29);
  });
  it("地方と県はOR、対応エリアと所在地は別に検索", () => {
    const filter = { ...EMPTY_FILTER, regions: ["関西"], prefectures: ["東京都"] };
    expect(searchCompanies(filter).map((c) => c.id)).toContain("minato-setsubi");
    expect(searchCompanies({ ...filter, areaMode: "location" }).map((c) => c.id)).not.toContain("minato-setsubi");
    expect(searchCompanies({ ...EMPTY_FILTER, prefectures: ["東京都"] }).map((c) => c.id)).toEqual(searchCompanies({ ...EMPTY_FILTER, prefectures: ["東京都", "東京都"] }).map((c) => c.id));
  });
  it("別業種の許可や建築士登録を、選択した業種の許可として扱わない", () => {
    const filter = { ...EMPTY_FILTER, industries: ["建設"] as const, constructionTrades: ["電気"] as const };
    expect(searchCompanies({ ...filter, constructionPermit: "yes" }).map((c) => c.id)).toEqual(["yamamoto-densetsu", "hokushin"]);
    expect(searchCompanies({ ...filter, constructionPermit: "no" }).map((c) => c.id)).toEqual(["minato-setsubi"]);
    expect(searchPeople({ ...filter, constructionPermit: "no" }).map((p) => p.id)).toEqual(["minato"]);
    expect(matchesConstruction([{ trade: "大工", permit: "unknown" }], ["大工"], "no")).toBe(false);
    expect(matchesConstruction([], [], "no")).toBe(false);
  });
  it("不動産は取引と物件を掛け合わせ、テナントに飲食店舗も含む", () => {
    const filter = { ...EMPTY_FILTER, industries: ["不動産"] as const, estateTransactions: ["賃貸"] as const, estateProperties: ["飲食店舗"] as const };
    expect(searchCompanies(filter).map((c) => c.id)).toEqual(["nakamura-fudosan"]);
    expect(searchPeople(filter).map((p) => p.id)).toEqual(["nakamura"]);
    expect(matchesEstate({ transactions: ["賃貸"], properties: ["飲食店舗"] }, ["賃貸"], ["店舗・テナント"])).toBe(true);
    expect(matchesEstate(undefined, ["賃貸"], [])).toBe(false);
  });
  it("建設と不動産を同時に選んでも、各業種の条件に合う会社を両方出す", () => {
    const ids = searchCompanies({ ...EMPTY_FILTER, industries: ["建設", "不動産"], constructionTrades: ["電気"], constructionPermit: "yes", estateTransactions: ["賃貸"], estateProperties: ["飲食店舗"] }).map((c) => c.id);
    expect(ids).toContain("yamamoto-densetsu");
    expect(ids).toContain("nakamura-fudosan");
    expect(ids).not.toContain("minato-setsubi");
    expect(ids).not.toContain("tanaka-realty");
  });
});
