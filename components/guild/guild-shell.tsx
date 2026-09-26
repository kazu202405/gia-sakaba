"use client";

// 酒場の外枠（C案）。PCは左の「コマンド」の窓、スマホは上のヘッダーと下のコマンド。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";

type NavItem = {
  href: string;
  label: string;
  short: string;
  exact?: boolean;
  /** この道の下も「ここにいる」とみなす */
  also?: string[];
};

const NAV: NavItem[] = [
  { href: "/guild", label: "ホーム", short: "ホーム", exact: true },
  { href: "/guild/members", label: "ギルド", short: "ギルド", also: ["/guild/requests"] },
  { href: "/guild/quests", label: "クエスト", short: "クエスト" },
  { href: "/guild/projects", label: "プロジェクト", short: "プロ\nジェクト" },
  { href: "/guild/me", label: "マイページ", short: "マイ\nページ" },
];

const MASTER_NAV: NavItem = { href: "/guild/master", label: "ギルドマスター", short: "マスター" };

function isUnder(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return isUnder(pathname, item.href) || (item.also ?? []).some((h) => isUnder(pathname, h));
}

export function GuildShell({ children, isMaster }: { children: React.ReactNode; isMaster: boolean }) {
  const pathname = usePathname();
  if (pathname === "/guild/login" || pathname === "/guild/join" || pathname === "/guild/forgot-password" || pathname === "/guild/reset-password" || pathname === "/guild/auth/callback") return <>{children}</>;
  const mobileNav = isMaster ? [...NAV, MASTER_NAV] : NAV;

  return (
    <div className="guild-theme min-h-screen">
      <header className="sticky top-0 z-30 bg-[#1b2a41] text-[#fffdf6]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/guild" className="text-lg tracking-[0.2em]">
            GIAの酒場
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/guild/notifications" className="text-xs text-[#fffdf6]/80 hover:text-[#e8cf8e]">おしらせ</Link>
            <LogoutButton redirectTo="/guild/login" showIcon={false} label="ログアウト" className="text-xs text-[#fffdf6]/80 hover:text-[#e8cf8e]" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-9 pb-28 sm:px-6 lg:grid-cols-[200px_1fr] lg:pb-14">
        {/* PC：コマンドの窓 */}
        <nav className="c-window guild-sidebar hidden self-start p-4 pt-7 lg:block" aria-label="メニュー">
          <span className="c-window-title">コマンド</span>
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <CommandLink item={item} active={isActive(pathname, item)} />
              </li>
            ))}
          </ul>
          {isMaster && <div className="c-dashed-top mt-4 pt-3">
            <p className="c-muted mb-1 text-[11px]">マスターのみ</p>
            <CommandLink item={MASTER_NAV} active={isActive(pathname, MASTER_NAV)} />
          </div>}
        </nav>

        <main className="min-w-0">{children}</main>
      </div>

      {/* スマホ：下のコマンド */}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid border-t-4 border-[#1b2a41] bg-[#fffdf6] pb-[env(safe-area-inset-bottom)] lg:hidden",
          isMaster ? "grid-cols-6" : "grid-cols-5",
        )}
        aria-label="メニュー"
      >
        {mobileNav.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-16 min-w-0 items-center justify-center border-r border-[#1b2a41]/15 px-0.5 py-2 text-center leading-tight tracking-normal whitespace-pre-line last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#1b2a41] focus-visible:outline-offset-[-4px]",
                isMaster ? "text-[11px]" : "text-xs",
                active ? "bg-[#e8cf8e]/35 text-[#1b2a41]" : "text-[#1b2a41]/70",
              )}
            >
              {/* 「▶」を文字の前に足すと「マイページ」が幅に入りきらないので、いる所は上の線で示す */}
              {active && <span className="absolute inset-x-3 top-0 h-1 bg-[#1b2a41]" aria-hidden />}
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
