import Link from "next/link";

// 利用規約・プライバシーポリシー・特商法表記の枠。
// (main) の枠は GIA 本体のヘッダーとフッターで、酒場では開けない道へのリンクが並ぶため使わない。
// これらのページは未ログインでも読める必要がある（入会・申し込みの前に読むもの）。
// 開いてよい道は lib/guild/route-gate.ts の LEGAL_PATHS。
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <>
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex min-h-14 max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="font-bold text-gray-900">GIAの酒場</Link>
        <nav className="flex gap-3 text-xs text-gray-600 sm:gap-4 sm:text-sm">
          <Link href="/terms" className="hover:underline">利用規約</Link>
          <Link href="/privacy" className="hover:underline">プライバシー</Link>
          <Link href="/tokushoho" className="hover:underline">特商法表記</Link>
        </nav>
      </div>
    </header>
    <main>{children}</main>
  </>;
}
