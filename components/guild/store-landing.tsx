import Link from "next/link";
import { outsideStorePath } from "@/lib/guild/store-path";
import { guildPath } from "@/lib/guild/store-path";
import type { StoreConfig } from "@/lib/guild/stores";

// 店の案内ページ（未ログインで /guild/<店> を開いたとき）。文言は lib/guild/stores.ts の landing に1か所だけ置く。
// 見た目は店のテーマ（guild-theme.css の [data-store]）に従う。GIAの酒場の案内は今までどおり / （app/page.tsx）。
export function StoreLanding({ config }: { config: StoreConfig }) {
  const landing = config.landing;
  if (!landing) return null;
  return (
    <main className="guild-theme min-h-screen px-4 py-10 pb-16 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="flex items-center justify-between gap-4 border-b border-guild-ink/20 pb-4 text-sm">
          <span className="guild-px tracking-widest">{config.name}</span>
          <Link href={outsideStorePath("login", `?next=${encodeURIComponent(guildPath(config.slug))}`)} className="underline underline-offset-4">ログイン</Link>
        </header>

        <section className="space-y-4">
          <p className="c-label text-sm">{landing.eyebrow}</p>
          <h1 className="text-2xl leading-snug sm:text-3xl">{landing.headline}</h1>
          <p className="text-[15px] leading-loose">{landing.lead}</p>
        </section>

        <ul className="grid gap-5 sm:grid-cols-3">
          {landing.points.map((point) => (
            <li key={point.title} className="c-card p-5">
              <h2 className="text-base">{point.title}</h2>
              <p className="c-muted mt-2 text-sm leading-relaxed">{point.body}</p>
            </li>
          ))}
        </ul>

        <section className="c-window p-6">
          <p className="text-sm leading-relaxed">{landing.inviteNote}</p>
          <div className="mt-5">
            <Link href={outsideStorePath("login", `?next=${encodeURIComponent(guildPath(config.slug))}`)} className="rpg-button px-6 py-2.5">会員の方はログイン</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
