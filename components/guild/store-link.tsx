"use client";

// 店の中の道へのリンク。サーバーでもブラウザでも使われる部品（カード・名鑑の行など）で、
// useGuildStore が使えない所のために置く。to は店の中の道（"/members/abc"）。
// 店ごとの道の組み立ては lib/guild/store-path.ts の guildPath 1か所。

import Link from "next/link";
import type { ComponentProps } from "react";
import { useGuildStore } from "@/components/guild/store-context";

export function StoreLink({ to, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { to: string }) {
  const store = useGuildStore();
  return <Link href={store.path(to)} {...props} />;
}
