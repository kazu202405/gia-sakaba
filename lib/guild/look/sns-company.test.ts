import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { applyCompanyDraft, companyToDraft, validateCompanyDraft, type CompanyDraft } from "./sns-company";
import { ME_COMPANY_ID, ME_ID, areaText, canReveal, findCompany, findPerson, personContactRows, regionOf, searchCompanies, type Company, type Relation, type Reveal, type SearchFilter, EMPTY_FILTER } from "./sns-mock";
import { CompanyFacts } from "@/components/guild/look/sns/parts";

vi.mock("@/components/guild/look/sns/store", () => ({
  useSnState: () => ({}),
  SnLink: ({ to, children, ...props }: { to: string; children: ReactNode }) => createElement("a", { href: to, ...props }, children),
}));

const mine = findCompany(ME_COMPANY_ID)!;
const save = (patch: Partial<CompanyDraft>, base: Company = mine) => applyCompanyDraft(base, { ...companyToDraft(base), ...patch });
const hits = (filter: Partial<SearchFilter>, company: Company) =>
  searchCompanies({ ...EMPTY_FILTER, ...filter }, ME_ID, company).some((c) => c.id === company.id);

describe("マイページで入れた内容が、探すの条件にそのまま効く", () => {
  it("自分の会社は探すに出て、編集前の値では出ない", () => {
    const edited = save({ prefecture: "福岡県", city: "福岡市中央区", areas: ["福岡県"], industries: ["建設"], construction: [{ trade: "塗装", permit: "general" }], specialties: "外壁改修" });
    expect(hits({ regions: ["九州"] }, edited)).toBe(true);
    expect(hits({ regions: ["関西"] }, edited)).toBe(false);
    expect(hits({ prefectures: ["福岡県"], areaMode: "location" }, edited)).toBe(true);
  });
  it("建設：業種・業種ごとの許可・得意なこと", () => {
    const edited = save({ industries: ["建設"], construction: [{ trade: "塗装", permit: "general" }, { trade: "防水", permit: "none" }], specialties: "外壁改修" });
    const f = { industries: ["建設"] as const };
    expect(hits({ ...f, constructionTrades: ["塗装"], constructionPermit: "yes" }, edited)).toBe(true);
    expect(hits({ ...f, constructionTrades: ["防水"], constructionPermit: "yes" }, edited)).toBe(false);
    expect(hits({ ...f, constructionTrades: ["防水"], constructionPermit: "no" }, edited)).toBe(true);
    expect(hits({ ...f, workQueries: { 建設: "外壁" } }, edited)).toBe(true);
  });
  it("不動産：取引・物件", () => {
    const edited = save({ industries: ["不動産"], estateTransactions: ["管理"], estateProperties: ["土地"] });
    const f = { industries: ["不動産"] as const };
    expect(hits({ ...f, estateTransactions: ["管理"], estateProperties: ["土地"] }, edited)).toBe(true);
    expect(hits({ ...f, estateTransactions: ["売買"] }, edited)).toBe(false);
  });
  it("士業：資格。その他：事業の内容", () => {
    expect(hits({ industries: ["士業"], professions: ["税理士"] }, save({ industries: ["士業"], professions: ["税理士"] }))).toBe(true);
    expect(hits({ industries: ["その他"], otherBusiness: "資材販売" }, save({ industries: ["その他"], business: "資材販売" }))).toBe(true);
  });
  it("外した業種の中身は残らない", () => {
    const once = save({ industries: ["建設"], construction: [{ trade: "塗装", permit: "general" }], permitNumber: "大阪府知事 第1号" });
    const again = save({ industries: ["不動産"] }, once);
    expect(again.construction).toEqual([]);
    expect(again.licenses).toEqual([]);
    expect(hits({ industries: ["建設"] }, again)).toBe(false);
  });
});

describe("許可番号の確認済み", () => {
  const verified = findCompany("yamamoto-densetsu")!;
  it("番号を変えなければ確認済みのまま、書き換えると自己申告に戻す", () => {
    expect(save({}, verified).licenses[0].verified).toBe(true);
    expect(save({ permitNumber: "東京都知事 第99999号" }, verified).licenses[0].verified).toBe(false);
    expect(hits({ licensedOnly: true }, save({ permitNumber: "東京都知事 第99999号" }, verified))).toBe(false);
  });
});

describe("入力の確かめ", () => {
  it("今の値は通り、必須が空なら理由を返す", () => {
    expect(validateCompanyDraft(companyToDraft(mine))).toEqual({});
    const e = validateCompanyDraft({ ...companyToDraft(mine), name: " ", prefecture: "", city: "", phone: "", industries: [], business: "", areas: [] });
    expect(Object.keys(e).sort()).toEqual(["areas", "business", "city", "industries", "name", "phone", "prefecture"]);
  });
  it("形が違うものを止める", () => {
    const e = validateCompanyDraft({ ...companyToDraft(mine), postalCode: "1", email: "a", url: "example.com" });
    expect(Object.keys(e).sort()).toEqual(["email", "postalCode", "url"]);
  });
});

describe("連絡先を見せる相手", () => {
  const company = findCompany("sato-komuten")!;
  const html = (kind: "self" | "direct" | "none", c: Company = company) => renderToStaticMarkup(createElement(CompanyFacts, { company: c, relation: { kind } }));
  const relations = [{ kind: "self" }, { kind: "direct" }, { kind: "via", via: findPerson("sato")! }, { kind: "none" }] as Relation[];
  it.each<[Reveal, boolean[]]>([
    ["all", [true, true, true, true]],
    ["friends", [true, true, false, false]],
    ["hidden", [true, false, false, false]],
  ])("%s のとき、本人・知り合い・知り合いの知り合い・それ以外", (reveal, expected) => {
    expect(relations.map((r) => canReveal(reveal, r))).toEqual(expected);
  });
  it("初期値は知り合いだけ。知り合いでない人には番地・電話・FAX・メールが出ない。市区町村とHPは出る", () => {
    const closed = html("none");
    for (const secret of [company.street, company.phone, company.fax, company.email]) expect(closed).not.toContain(secret);
    expect(closed).toContain(company.city);
    expect(closed).toContain(company.url);
    expect(closed).toContain("知り合いになると見られます");
  });
  it("知り合いには全部出る", () => {
    for (const text of [company.street, company.phone, company.fax, company.email]) expect(html("direct")).toContain(text);
  });
  it("「全員に見せる」にした項目は知り合いでなくても出て、ほかは隠れたまま", () => {
    const closed = html("none", save({ reveal: { ...company.reveal, phone: "all" } }, company));
    expect(closed).toContain(company.phone);
    expect(closed).not.toContain(company.email);
    expect(closed).toContain("知り合いになると見られます");
  });
  it("「見せない」は知り合いにも出ず、知り合いになれば見られるとも案内しない。本人には出る", () => {
    const hidden = save({ reveal: { street: "hidden", phone: "hidden", fax: "hidden", email: "hidden" } }, company);
    for (const kind of ["none", "direct"] as const) {
      for (const secret of [hidden.street, hidden.phone, hidden.fax, hidden.email]) expect(html(kind, hidden)).not.toContain(secret);
      expect(html(kind, hidden)).not.toContain("知り合いになると見られます");
    }
    expect(html("self", hidden)).toContain(hidden.phone);
  });
  it("本人の連絡先も項目ごとに分かれる", () => {
    const person = { ...findPerson("sato")!, contactReveal: { phone: "all", email: "hidden" } as const };
    expect(personContactRows(person, { kind: "none" }).map((r) => r.label)).toEqual(["電話"]);
    expect(personContactRows(person, { kind: "direct" }).map((r) => r.label)).toEqual(["電話"]);
    expect(personContactRows({ ...person, contactReveal: { phone: "hidden", email: "hidden" } }, { kind: "direct" })).toEqual([]);
  });
});

describe("対応エリアの言い方", () => {
  it("全域の地方と、ばらの都道府県を両方出す", () => {
    expect(regionOf("大阪府")).toBe("関西");
    expect(areaText(["東京都", "神奈川県", "埼玉県", "千葉県", "茨城県", "栃木県", "群馬県", "大阪府"])).toBe("関東全域・大阪府");
  });
});
