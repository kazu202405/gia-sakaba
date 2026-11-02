/** 建設・不動産の仕事で相談先になる士業・専門家。 */
export const PROFESSIONS = ["行政書士", "司法書士", "土地家屋調査士", "税理士", "社会保険労務士", "弁護士", "公認会計士", "不動産鑑定士", "建築士"] as const;
export type Profession = (typeof PROFESSIONS)[number];
export const OTHER_BUSINESS_MAX = 80;

/** 同じ意味で使われる呼び名だけをそろえる。許可業種から施工内容は推測しない。 */
function normalizeBusinessText(s: string): string {
  return s.normalize("NFKC").toLocaleLowerCase("ja")
    .replaceAll("エアコン", "空調")
    .replaceAll("リノベーション", "リノベ")
    .replaceAll("社労士", "社会保険労務士");
}

/** 複数語はすべて一致。会社が提供する仕事だけから検索する。 */
export function matchesBusinessKeywords(fields: readonly string[], query: string): boolean {
  const normalize = normalizeBusinessText;
  const text = normalize(fields.join(" "));
  return normalize(query).trim().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
}

export const matchesOtherBusiness = matchesBusinessKeywords;
