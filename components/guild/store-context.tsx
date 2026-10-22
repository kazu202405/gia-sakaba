"use client";

// 「今の店」を、ブラウザ側の部品へ渡す入口。app/guild/[store]/layout.tsx が StoreProvider で包む。
// 部品は useGuildStore() で slug と、店の中の道を作る path() を受け取る（"gia" や "/guild/…" を直書きしない）。
// 店の外の画面（ログインなど）では既定の店になる。

import { createContext, useContext, useMemo } from "react";
import { makeStoreHandle, type StoreHandle } from "@/lib/guild/store-handle";
import { storeOrDefault } from "@/lib/guild/stores";

const StoreContext = createContext<StoreHandle | null>(null);

export function StoreProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const handle = useMemo(() => makeStoreHandle(storeOrDefault(slug)), [slug]);
  return <StoreContext.Provider value={handle}>{children}</StoreContext.Provider>;
}

export function useGuildStore(): StoreHandle {
  const handle = useContext(StoreContext);
  // StoreProvider の外（ログイン・入会など店の外の画面）では既定の店
  return useMemo(() => handle ?? makeStoreHandle(storeOrDefault(null)), [handle]);
}
