import type { Metadata } from "next";
import Link from "next/link";
import "@/components/guild/guild-theme.css";

const demoUrl = "https://gia-sakaba-git-demo-sakaba-mock-63c2cc-kazus-projects-dc60dadc.vercel.app/guild";

export const metadata: Metadata = {
  metadataBase: new URL("https://guild.gia2018.com"),
  title: { absolute: "GIAの酒場 | 仕事の話が、次の一歩になる場所" },
  description: "GIAの酒場は、仲間を知り、相談や仕事のクエストを出し、プロジェクトを進める招待制の場所です。",
  alternates: { canonical: "https://guild.gia2018.com/" },
  openGraph: {
    title: "GIAの酒場",
    description: "仕事の話が、次の一歩になる場所。仲間・クエスト・プロジェクトをひとつの酒場に。",
    url: "https://guild.gia2018.com/",
    type: "website",
  },
};

const features = [
  { mark: "01", title: "仲間を知る", body: "何をしている人か、何を大切にしているか。メンバー名鑑から、話してみたい相手を見つけられます。" },
  { mark: "02", title: "クエストを出す", body: "仕事の相談、協業したいこと、助けてほしいことを掲示板へ。参加したい人から声が届きます。" },
  { mark: "03", title: "前へ進める", body: "自分のプロジェクトをタスクに分け、相手ごとの進み具合も記録。話したあとを、置き去りにしません。" },
];

export default function SakabaLandingPage() {
  return <div className="guild-theme min-h-screen">
    <header className="border-b-[3px] border-[#1b2a41] bg-[#1b2a41] text-[#fffdf6]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link href="/" className="text-lg tracking-[0.14em] sm:text-xl">GIAの酒場</Link>
        <nav aria-label="入口" className="flex items-center gap-4 text-xs sm:gap-6 sm:text-sm">
          <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="text-[#fffdf6]/80 underline-offset-4 hover:text-[#e8cf8e] hover:underline">見本を見る ↗</a>
          <Link href="/guild/login" className="text-[#e8cf8e] underline-offset-4 hover:underline">ログイン ▶</Link>
        </nav>
      </div>
    </header>

    <main>
      <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-20 sm:px-8 sm:pt-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-28">
        <div>
          <p className="mb-7 inline-block border-2 border-[#1b2a41] bg-[#fffdf6] px-3 py-1 text-xs tracking-[0.16em]">INVITATION ONLY · 招待制</p>
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.3] tracking-[0.05em]">
            仕事の話が、<br /><span className="text-[#8f7337]">次の一歩</span>になる場所。
          </h1>
          <p className="mt-7 max-w-xl text-base leading-[2] sm:text-lg" style={{ fontFamily: "var(--font-jp-sans), sans-serif" }}>
            GIAの酒場は、RPGで冒険の仲間を探す酒場のように、仲間を知り、相談を持ち寄り、いっしょに動き出すための場所。名刺交換で終わらないつながりを、ここから育てます。
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/guild/login" className="rpg-button min-h-12 px-6 text-sm sm:text-base">▶ 酒場に入る</Link>
            <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="c-button-sub min-h-12 px-6 text-sm sm:text-base">見本を見てみる ↗</a>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[#1b2a41]/65">入会には招待リンクが必要です。見本のデータは架空で、操作は保存されません。</p>
        </div>

        <div className="c-window p-6 pt-11 sm:p-8 sm:pt-12" aria-label="酒場でできること">
          <span className="c-window-title">酒場のコマンド</span>
          <p className="mb-5 text-sm tracking-wider">ひとりでは進まない仕事に。</p>
          <ol className="space-y-0 border-y-2 border-dashed border-[#1b2a41]/25">
            {features.map((feature) => <li key={feature.mark} className="grid grid-cols-[2.5rem_1fr] gap-3 border-b-2 border-dashed border-[#1b2a41]/20 py-5 last:border-b-0">
              <span className="text-sm text-[#8f7337]">{feature.mark}</span>
              <div><h2 className="text-lg tracking-wider">▶ {feature.title}</h2><p className="mt-2 text-sm leading-[1.8] text-[#1b2a41]/75" style={{ fontFamily: "var(--font-jp-sans), sans-serif" }}>{feature.body}</p></div>
            </li>)}
          </ol>
        </div>
      </section>

      <section className="border-y-[3px] border-[#1b2a41] bg-[#1b2a41] px-5 py-16 text-[#fffdf6] sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-7 md:grid-cols-[0.7fr_1fr] md:items-center">
          <p className="text-xs tracking-[0.2em] text-[#e8cf8e]">GUILD MASTER</p>
          <div>
            <h2 className="text-2xl leading-relaxed tracking-wider sm:text-3xl">人と人の間にも、役割がある。</h2>
            <p className="mt-4 max-w-2xl text-sm leading-[2] text-[#fffdf6]/80 sm:text-base" style={{ fontFamily: "var(--font-jp-sans), sans-serif" }}>
              紹介依頼はギルドマスターが確認し、相手へ打診します。連絡先が開くのは、相手が承諾してから。安心して相談できる流れを大切にしています。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="c-window p-6 pt-12 sm:p-10 sm:pt-14">
          <span className="c-window-title">入るには</span>
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="text-2xl tracking-wider sm:text-3xl">招待リンクから、酒場へ。</h2>
              <p className="mt-4 max-w-2xl text-sm leading-[2] sm:text-base" style={{ fontFamily: "var(--font-jp-sans), sans-serif" }}>
                招待された方は、届いたリンクから手続きを進めてください。すでにアカウントをお持ちの方はログインして続けられます。
              </p>
            </div>
            <Link href="/guild/login" className="rpg-button min-h-12 px-6 text-sm">▶ ログインする</Link>
          </div>
        </div>
      </section>
    </main>

    <footer className="border-t-[3px] border-[#1b2a41] px-5 py-7 text-xs sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><span>GIAの酒場</span><span>© GIA</span></div>
    </footer>
  </div>;
}
