"use client";

// 酒場の中で、ボタンから別の画面へ移るときは必ずこれを使う（useRouter を直接使わない。guild-router-guard.test.ts で見張る）。
// リンク（<Link>）は guild-shell.tsx が押した瞬間に仮の画面を出すが、router.push はそれに気づけない。
// 押しても何も変わらないと「押せていない」と思って何度も押されるので（2026-09-28 おしらせで実際に起きた）、
// 移る前に外枠へ知らせて、リンクと同じ仮の画面を出す。

import { useMemo } from "react";
import { useRouter } from "next/navigation";

export const GUILD_NAVIGATE_EVENT = "guild:navigate";

/** 外枠に「これから href へ移る」と知らせる。同じ画面の中（#だけ違う等）なら何もしない（仮の画面が消えなくなるため） */
export function announceGuildNavigation(href: string) {
  if (typeof window === "undefined") return;
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
  window.dispatchEvent(new CustomEvent<string>(GUILD_NAVIGATE_EVENT, { detail: url.pathname }));
}

export function useGuildRouter() {
  const router = useRouter();
  return useMemo(() => ({
    push(href: string) { announceGuildNavigation(href); router.push(href); },
    replace(href: string) { announceGuildNavigation(href); router.replace(href); },
    refresh() { router.refresh(); },
  }), [router]);
}
