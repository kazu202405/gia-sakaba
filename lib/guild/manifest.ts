// ホーム画面に追加するアプリの設定（PWA の manifest）を店ごとに作る。
// 名前・開始位置は lib/guild/stores.ts。アイコンは全店共通（店ごとの絵はまだ無い）。
// 範囲（scope）は /guild 全体：Service Worker（public/guild-sw.js）の範囲と同じにして、どの店でも通知を受けられるようにする。

import { GUILD_ROOT } from "./store-path";
import type { StoreConfig } from "./stores";

export function buildManifest(store: StoreConfig) {
  return {
    id: store.pwa.id,
    name: store.name,
    short_name: store.name,
    description: store.description,
    start_url: store.pwa.startPath,
    scope: GUILD_ROOT,
    display: "standalone",
    background_color: "#0b0f1f",
    theme_color: "#1b2a41",
    icons: [
      { src: "/images/sakaba/guild-icon-20260929-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/sakaba/guild-icon-20260929-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/sakaba/guild-icon-20260929-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

export function manifestResponse(store: StoreConfig): Response {
  return new Response(JSON.stringify(buildManifest(store)), {
    headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
