import { manifestResponse } from "@/lib/guild/manifest";
import { STORES, DEFAULT_STORE_SLUG } from "@/lib/guild/stores";

// 昔からの manifest の場所（/guild/manifest.webmanifest）。既にホーム画面に追加している人のために、既定の店（GIAの酒場）のものを返し続ける。
// 店ごとの manifest は /guild/<店>/manifest.webmanifest
export function GET() {
  return manifestResponse(STORES[DEFAULT_STORE_SLUG]);
}
