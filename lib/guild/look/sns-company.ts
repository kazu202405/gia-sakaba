import type { ConstructionWork, EstateProperty, EstateTransaction } from "./sns-construction";
import type { Profession } from "./sns-expertise";
import { joinLines, splitLines, type Company, type CompanyReveal, type Industry, type License } from "./sns-mock";

// マイページの「会社情報を編集」の入力。探す（sns-mock の matchesCompanyFilters）が見る項目は、すべてここから入る。

export type CompanyDraft = {
  name: string;
  kana: string;
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  phone: string;
  fax: string;
  email: string;
  reveal: CompanyReveal;
  url: string;
  industries: readonly Industry[];
  business: string;
  areas: readonly string[];
  specialties: string;
  about: string;
  construction: readonly ConstructionWork[];
  permitNumber: string;
  estateTransactions: readonly EstateTransaction[];
  estateProperties: readonly EstateProperty[];
  estateLicense: string;
  professions: readonly Profession[];
  professionNumber: string;
};

export type CompanyDraftErrors = Partial<Record<"name" | "postalCode" | "prefecture" | "city" | "phone" | "email" | "url" | "industries" | "business" | "areas", string>>;

const ESTATE_LICENSE_NAME = "宅地建物取引業";
const PERMIT_LICENSE_NAME = "建設業許可";

const isEstateLicense = (l: License) => l.name === ESTATE_LICENSE_NAME;
const isPermitLicense = (l: License) => l.name === PERMIT_LICENSE_NAME || l.name.includes("工事業");

export function companyToDraft(c: Company): CompanyDraft {
  return {
    name: c.name, kana: c.kana, postalCode: c.postalCode, prefecture: c.prefecture, city: c.city, street: c.street,
    phone: c.phone, fax: c.fax, email: c.email, reveal: c.reveal, url: c.url,
    industries: c.industries, business: c.business, areas: c.areas, specialties: joinLines(c.specialties), about: c.about,
    construction: c.construction ?? [], permitNumber: c.licenses.find(isPermitLicense)?.number ?? "",
    estateTransactions: c.estate?.transactions ?? [], estateProperties: c.estate?.properties ?? [],
    estateLicense: c.licenses.find(isEstateLicense)?.number ?? "",
    professions: c.professions ?? [], professionNumber: c.licenses.find((l) => !isEstateLicense(l) && !isPermitLicense(l))?.number ?? "",
  };
}

/** 空なら {}。理由は画面にそのまま赤字で出す */
export function validateCompanyDraft(d: CompanyDraft): CompanyDraftErrors {
  const e: CompanyDraftErrors = {};
  if (d.name.trim() === "") e.name = "会社名を入れてください";
  if (d.postalCode.trim() !== "" && !/^\d{3}-?\d{4}$/.test(d.postalCode.trim())) e.postalCode = "郵便番号は 530-0001 の形で入れてください";
  if (d.prefecture === "") e.prefecture = "都道府県を選んでください";
  if (d.city.trim() === "") e.city = "市区町村を入れてください";
  if (d.phone.trim() === "") e.phone = "電話番号を入れてください";
  if (d.email.trim() !== "" && !/^\S+@\S+\.\S+$/.test(d.email.trim())) e.email = "メールアドレスの形を確かめてください";
  if (d.url.trim() !== "" && !/^https?:\/\/\S+$/.test(d.url.trim())) e.url = "https:// から入れてください";
  if (d.industries.length === 0) e.industries = "業種をひとつ以上選んでください";
  if (d.business.trim() === "") e.business = "事業の内容を入れてください";
  if (d.areas.length === 0) e.areas = "対応エリアをひとつ以上選んでください";
  return e;
}

/** 許可の番号。変わっていなければ確認済みのまま、書き換えたら自己申告に戻す（設計書5-2：自己申告と確認済みを混同しない） */
function licenseFor(base: Company, name: string, rawNumber: string): License[] {
  const number = rawNumber.trim();
  if (number === "") return [];
  return [base.licenses.find((l) => l.number === number) ?? { name, number, verified: false }];
}

/** 確かめ済みの入力を会社に。選んでいない業種の中身は残さない（探すの条件に引っかからないように） */
export function applyCompanyDraft(base: Company, d: CompanyDraft): Company {
  const has = (industry: Industry) => d.industries.includes(industry);
  const name = d.name.trim();
  const professions = has("士業") ? d.professions : [];
  return {
    ...base,
    name, kana: d.kana.trim(), mark: name.replace(/株式会社|有限会社|合同会社/g, "").trim().charAt(0),
    postalCode: d.postalCode.trim(), prefecture: d.prefecture, city: d.city.trim(), street: d.street.trim(),
    phone: d.phone.trim(), fax: d.fax.trim(), email: d.email.trim(), reveal: d.reveal, url: d.url.trim(),
    industries: d.industries, business: d.business.trim(), areas: d.areas, specialties: splitLines(d.specialties), about: d.about.trim(),
    construction: has("建設") ? d.construction : [],
    estate: has("不動産") ? { transactions: d.estateTransactions, properties: d.estateProperties } : undefined,
    professions,
    licenses: [
      ...(has("建設") ? licenseFor(base, PERMIT_LICENSE_NAME, d.permitNumber) : []),
      ...(has("不動産") ? licenseFor(base, ESTATE_LICENSE_NAME, d.estateLicense) : []),
      ...(has("士業") ? licenseFor(base, professions[0] ?? "士業の登録", d.professionNumber) : []),
    ],
  };
}

export function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
