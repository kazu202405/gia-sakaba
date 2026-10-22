import "server-only";

// 「今の店」を返す、サーバー側の唯一の入口。
// proxy.ts が道（/guild/<店>/…）から決めてヘッダーに載せる（lib/guild/store-path.ts の STORE_HEADER）。
// 店が決まらないページ（ログイン・入会など）や API は既定の店。
// ここで返す店は「どの店のデータを頼むか」を決めるだけで、見てよいかどうかは DB の関数が会員かどうかで判定する。

import { headers } from "next/headers";
import { makeStoreHandle, type StoreHandle } from "./store-handle";
import { STORE_HEADER } from "./store-path";
import { storeOrDefault } from "./stores";

export async function currentStore(): Promise<StoreHandle> {
  const incoming = await headers();
  return makeStoreHandle(storeOrDefault(incoming.get(STORE_HEADER)));
}
