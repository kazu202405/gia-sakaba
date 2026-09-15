// C案の外枠。Bの明るさに、Aの窓・▶カーソルを合わせ、文字はすべてドット（DotGothic16）。
// 英字のドットフォント（Press Start 2P）は空白が広く名前の間が空くので、Cでは使わない。

import Link from "next/link";
import { cn } from "@/lib/utils";

export const NAV_C = [
  { href: "/guild-look/c", label: "ホーム" },
  { href: "/guild-look/c/status", label: "なかま" },
  { href: "/guild/quests", label: "クエスト" },
  { href: "/guild/requests", label: "いらい" },
  { href: "/guild/me", label: "マイページ" },
];

export function ShellC({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="look-c min-h-screen">
      <header className="border-b-4 border-[#1b2a41] bg-[#1b2a41] text-[#fffdf6]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/guild-look/c" className="text-lg tracking-[0.2em]">
            GIAの酒場
          </Link>
          <Link href="/guild-look" className="text-xs text-[#e8cf8e] hover:underline">
            見本C ▸ 見くらべへ
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-8 pb-28 lg:grid-cols-[180px_1fr] lg:pb-12">
        {/* PC：コマンドの窓 */}
        <nav className="c-window hidden self-start p-4 pt-6 lg:block">
          <span className="c-window-title">コマンド</span>
          <ul className="space-y-1">
            {NAV_C.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  data-active={n.href === active}
                  className="rpg-cursor-row flex items-center gap-1.5 py-1 text-[15px] tracking-wider"
                >
                  <span className="rpg-cursor text-[#b3261e]">▶</span>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>

      {/* スマホ：下のコマンド */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-4 border-[#1b2a41] bg-[#fffdf6] pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV_C.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn("py-3 text-center text-[11px] tracking-wider", n.href === active ? "text-[#1b2a41]" : "text-[#1b2a41]/55")}
          >
            {n.href === active && <span className="text-[#b3261e]">▶</span>}
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
