// A案の外枠。背景と窓はRPG風、文字は要所（名前・見出し・メニュー）だけドット。

import Link from "next/link";
import { cn } from "@/lib/utils";

const PX = "font-[family-name:var(--font-pixel-jp)]";

export const NAV_A = [
  { href: "/guild-look/a", label: "ホーム" },
  { href: "/guild-look/a/status", label: "なかま" },
  { href: "/guild/quests", label: "クエスト" },
  { href: "/guild/requests", label: "紹介依頼" },
  { href: "/guild/me", label: "マイページ" },
];

export function ShellA({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="look-a-bg min-h-screen text-[#f4f1e8] font-[family-name:var(--font-jp-sans)]">
      <header className="border-b-4 border-[#050a18] bg-[#0f1f33]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/guild-look/a" className={cn(PX, "text-lg tracking-widest text-[#f4f1e8]")}>
            GIAの酒場
          </Link>
          <Link href="/guild-look" className={cn(PX, "text-xs text-[#c8a55a] hover:underline")}>
            見本A ▸ 見比べへ
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-8 pb-28 lg:grid-cols-[180px_1fr] lg:pb-12">
        {/* PC：コマンドの窓 */}
        <nav className="rpg-window hidden self-start p-4 pt-6 lg:block">
          <span className={cn(PX, "rpg-window-title")}>コマンド</span>
          <ul className="space-y-1">
            {NAV_A.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  data-active={n.href === active}
                  className={cn(PX, "rpg-cursor-row flex items-center gap-1.5 py-1 text-[15px] tracking-wider")}
                >
                  <span className="rpg-cursor text-[#c8a55a]">▶</span>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>

      {/* スマホ：下のコマンド */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-4 border-[#050a18] bg-[#0f1f33] pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV_A.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              PX,
              "py-3 text-center text-[11px] tracking-wider",
              n.href === active ? "text-[#c8a55a]" : "text-[#f4f1e8]/70",
            )}
          >
            {n.href === active && "▶"}
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
