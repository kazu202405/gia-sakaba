import Link from "next/link";
import { outsideStorePath } from "@/lib/guild/store-path";
import { guildPath } from "@/lib/guild/store-path";
import type { StoreConfig } from "@/lib/guild/stores";
import { PHRASE_WRAP, Ph } from "./phrase";

// 店の案内ページ（未ログインで /guild/<店> を開いたとき）。文言は lib/guild/stores.ts の landing に1か所だけ置く。
// 見た目は店のテーマ（guild-theme.css の [data-store]）に従う。GIAの酒場の案内は今までどおり / （app/page.tsx）。
export function StoreLanding({ config }: { config: StoreConfig }) {
  const landing = config.landing;
  if (!landing) return null;
  const loginHref = outsideStorePath("login", `?next=${encodeURIComponent(guildPath(config.slug))}`);
  // 箱（カード）は使わない：上の帯・番号つきの行・細い線で区切る（2026-10-24 五島さん）
  return (
    <main className={`guild-theme min-h-screen pb-20 ${PHRASE_WRAP}`}>
      <div className="guild-landing-hero">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <header className="flex h-14 items-center justify-between gap-4 text-sm">
            <span className="text-[15px] font-bold">{config.name}</span>
            <Link href={loginHref} className="underline underline-offset-4">ログイン</Link>
          </header>
          <section className="pt-6 pb-9 sm:pt-12 sm:pb-14">
            <p className="guild-landing-eyebrow text-[13px] font-bold">{landing.eyebrow}</p>
            <h1 className="mt-3 text-[26px] leading-[1.45] font-bold sm:text-4xl"><Ph keep text={landing.headline} /></h1>
            <p className="mt-5 text-[15px] leading-[1.9] opacity-90"><Ph keep text={landing.lead} /></p>
          </section>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 pt-4 sm:px-8 sm:pt-8">
        <ol className="divide-y divide-guild-ink/12">
          {landing.points.map((point, index) => (
            <li key={point.title} className="flex gap-3.5 py-6">
              <span className="guild-landing-no tabular-nums" aria-hidden="true">{index + 1}</span>
              <div className="min-w-0">
                <h2 className="text-[17px] leading-snug font-bold"><Ph keep text={point.title} /></h2>
                <p className="c-muted mt-2 text-sm leading-[1.85]"><Ph keep text={point.body} /></p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-4 border-t border-guild-ink/12 pt-8">
          <p className="text-sm leading-[1.85]"><Ph keep text={landing.inviteNote} /></p>
          <Link href={loginHref} className="rpg-button mt-5 inline-flex min-h-12 w-full items-center justify-center px-6 sm:w-auto">会員の方はログイン</Link>
        </section>
      </div>
    </main>
  );
}
