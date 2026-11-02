/** 建設業許可の29業種。対応する仕事と、その業種の許可状況を別に記録する。 */
export const CONSTRUCTION_TRADES = [
  "土木一式", "建築一式", "大工", "左官", "とび・土工・コンクリート", "石", "屋根", "電気", "管",
  "タイル・れんが・ブロック", "鋼構造物", "鉄筋", "舗装", "しゅんせつ", "板金", "ガラス", "塗装", "防水",
  "内装仕上", "機械器具設置", "熱絶縁", "電気通信", "造園", "さく井", "建具", "水道施設", "消防施設", "清掃施設", "解体",
] as const;
export type ConstructionTrade = (typeof CONSTRUCTION_TRADES)[number];
export type ConstructionWork = { trade: ConstructionTrade; permit: "general" | "special" | "none" | "unknown" };
export type PermitFilter = "any" | "yes" | "no";
export const PERMIT_LABELS: Readonly<Record<ConstructionWork["permit"], string>> = { general: "一般", special: "特定", none: "許可なし", unknown: "未入力" };

export const ESTATE_TRANSACTIONS = ["売買", "賃貸", "管理", "買取再販"] as const;
export const ESTATE_PROPERTIES = ["土地", "戸建て", "マンション", "一棟アパート・マンション", "店舗・テナント", "飲食店舗", "事務所", "倉庫・工場"] as const;
export type EstateTransaction = (typeof ESTATE_TRANSACTIONS)[number];
export type EstateProperty = (typeof ESTATE_PROPERTIES)[number];
export type EstateBusiness = { transactions: readonly EstateTransaction[]; properties: readonly EstateProperty[] };

export function matchesEstate(estate: EstateBusiness | undefined, transactions: readonly EstateTransaction[], properties: readonly EstateProperty[]): boolean {
  if (!transactions.length && !properties.length) return true;
  if (!estate) return false;
  return (!transactions.length || transactions.some((t) => estate.transactions.includes(t))) &&
    (!properties.length || properties.some((p) => estate.properties.includes(p) || p === "店舗・テナント" && estate.properties.includes("飲食店舗")));
}

/** 複数の業種は「いずれか」。許可も同じ業種の記録で判定し、未入力は「なし」に含めない。 */
export function matchesConstruction(works: readonly ConstructionWork[], trades: readonly ConstructionTrade[], permit: PermitFilter): boolean {
  if (!trades.length && permit === "any") return true;
  return works.some((work) => (!trades.length || trades.includes(work.trade)) &&
    (permit === "any" || (permit === "yes" ? work.permit === "general" || work.permit === "special" : work.permit === "none")));
}
