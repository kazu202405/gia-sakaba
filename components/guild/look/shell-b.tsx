// B案の外枠。8bitcn の部品と、ドット文字を全体に使う。

import Link from "next/link";
import { cn } from "@/lib/utils";

export const NAV_B = [
  { href: "/guild-look/b", label: "ホーム" },
  { href: "/guild-look/b/status", label: "なかま" },
  { href: "/guild/quests", label: "クエスト" },
  { href: "/guild/requests", label: "いらい" },
  { href: "/guild/me", label: "マイページ" },
];

export function ShellB({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="look-b-bg retro min-h-screen text-neutral-900">
      <header className="border-b-6 border-neutral-900 bg-[#2b5f3a] text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/guild-look/b" className="text-sm tracking-widest">
            GIAの酒場
          </Link>
          <Link href="/guild-look" className="text-[10px] text-[#ffe08a] hover:underline">
            見本B ▸ 見比べへ
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-8 pb-28 lg:pb-12">
        {/* PC：上のメニュー */}
        <nav className="mb-8 hidden flex-wrap gap-5 lg:flex">
          {NAV_B.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn("text-xs", n.href === active ? "text-[#2b5f3a] underline underline-offset-8" : "hover:underline")}
            >
              {n.href === active ? "▶ " : ""}
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-6 border-neutral-900 bg-[#efe6cf] pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV_B.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn("py-3 text-center text-[9px]", n.href === active ? "text-[#2b5f3a]" : "text-neutral-600")}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
