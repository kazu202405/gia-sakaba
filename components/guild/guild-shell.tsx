"use client";

// 酒場の外枠（C案）。PCは左の「コマンド」の窓、スマホは上のヘッダーと下のコマンド。
// ギルドマスター画面はスマホの下に入りきらないので、ヘッダー右から行けるようにする。

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { guild } from "@/lib/guild/mock-data";
import { getInitialNotifications, getNotifications, subscribeNotifications } from "@/lib/guild/notification-store";
import { unreadCount } from "@/lib/guild/notifications";

type NavItem = { href: string; label: string; short: string; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/guild", label: "ホーム", short: "ホーム", exact: true },
  { href: "/guild/members", label: guild.terms.member, short: guild.terms.member },
  { href: "/guild/quests", label: guild.terms.quest, short: guild.terms.quest },
  { href: "/guild/requests", label: "しょうかい いらい", short: "しょうかい" },
  { href: "/guild/me", label: "マイページ", short: "マイページ" },
];

function isActive(pathname: string, item: { href: string; exact?: boolean }) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

export function GuildShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const masterActive = pathname.startsWith("/guild/master");
  const noticeActive = pathname.startsWith("/guild/notifications");
  const unread = unreadCount(useSyncExternalStore(subscribeNotifications, getNotifications, getInitialNotifications));

  return (
    <div className="guild-theme min-h-screen">
      <header className="sticky top-0 z-30 bg-[#1b2a41] text-[#fffdf6]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/guild" className="text-lg tracking-[0.2em]">
            GIAの酒場
          </Link>
          <span className="hidden text-xs text-[#e8cf8e] lg:inline">見本です。データは架空で、操作しても保存されません</span>
          <div className="flex items-center gap-4">
            <Link
              href="/guild/notifications"
              aria-label={unread > 0 ? `おしらせ（読んでいないもの ${unread}件）` : "おしらせ"}
              className={cn(
                "flex items-center gap-1 text-xs tracking-wider",
                noticeActive ? "text-[#e8cf8e]" : "text-[#fffdf6]/80",
              )}
            >
              {noticeActive && "▶"}しらせ
              {unread > 0 && (
                <span className="inline-flex min-w-5 justify-center bg-[#e8cf8e] px-1 text-[11px] leading-5 text-[#1b2a41] tabular-nums">
                  {unread}
                </span>
              )}
            </Link>
            <Link
              href="/guild/master"
              className={cn("text-xs tracking-wider lg:hidden", masterActive ? "text-[#e8cf8e]" : "text-[#fffdf6]/80")}
            >
              {masterActive && "▶"}マスター
            </Link>
          </div>
        </div>
      </header>

      <p className="c-muted border-b-2 border-dashed border-[#1b2a41]/25 px-4 py-1.5 text-center text-[11px] lg:hidden">
        見本です。データは架空で、操作しても保存されません
      </p>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-9 pb-28 sm:px-6 lg:grid-cols-[200px_1fr] lg:pb-14">
        {/* PC：コマンドの窓 */}
        <nav className="c-window hidden self-start p-4 pt-7 lg:sticky lg:top-24 lg:block" aria-label="メニュー">
          <span className="c-window-title">コマンド</span>
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <CommandLink item={item} active={isActive(pathname, item)} />
              </li>
            ))}
          </ul>
          <div className="c-dashed-top mt-4 pt-3">
            <p className="c-muted text-[11px]">マスターのみ</p>
            <CommandLink item={{ href: "/guild/master", label: guild.terms.master, short: "" }} active={masterActive} />
          </div>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>

      {/* スマホ：下のコマンド */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-4 border-[#1b2a41] bg-[#fffdf6] pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="メニュー"
      >
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("py-3 text-center text-[11px] tracking-wider", active ? "text-[#1b2a41]" : "text-[#1b2a41]/50")}
            >
              {active && "▶"}
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function CommandLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      data-active={active}
      aria-current={active ? "page" : undefined}
      className="rpg-cursor-row flex items-center gap-1.5 py-1.5 text-[15px] tracking-wider"
    >
      <span className="rpg-cursor">▶</span>
      {item.label}
    </Link>
  );
}
