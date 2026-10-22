// 「今の店」を画面コードに渡す形。slug と店の設定と、店の中の道を作る関数 path をひとまとめにしたもの。
// サーバーは lib/guild/current-store.ts、ブラウザは components/guild/store-context.tsx から受け取る。

import { guildPath } from "./store-path";
import { type StoreConfig } from "./stores";

export type StoreHandle = {
  slug: string;
  config: StoreConfig;
  /** 店の中の道。store.path("/quests") → "/guild/<店>/quests"。store.path() → 店のホーム */
  path: (rest?: string) => string;
};

export function makeStoreHandle(config: StoreConfig): StoreHandle {
  return { slug: config.slug, config, path: (rest = "") => guildPath(config.slug, rest) };
}
