/** 建設・不動産の仕事で相談先になる士業・専門家。 */
export const PROFESSIONS = ["行政書士", "司法書士", "土地家屋調査士", "税理士", "社会保険労務士", "弁護士", "公認会計士", "不動産鑑定士", "建築士"] as const;
export type Profession = (typeof PROFESSIONS)[number];
export const OTHER_BUSINESS_MAX = 80;

/** 複数語はすべて一致。全半角・英字大小・空白の違いを吸収する。 */
export function matchesOtherBusiness(fields: readonly string[], query: string): boolean {
  const normalize = (s: string) => s.normalize("NFKC").toLocaleLowerCase("ja");
  const text = normalize(fields.join(" "));
  return normalize(query).trim().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
}
