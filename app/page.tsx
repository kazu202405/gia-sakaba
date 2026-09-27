import type { Metadata } from "next";
import Link from "next/link";
import "@/components/guild/guild-theme.css";
import styles from "./sakaba-landing.module.css";

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
  return <div className={`guild-theme ${styles.landing}`}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>GIAの酒場</Link>
        <nav aria-label="入口" className={styles.headerNav}>
          <a href={demoUrl} target="_blank" rel="noopener noreferrer">見本を見る ↗</a>
          <Link href="/guild/login">ログイン ▶</Link>
        </nav>
      </div>
    </header>

    <main>
      <section className={styles.hero} aria-labelledby="landing-title">
        <div className={styles.heroArt} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>INVITATION ONLY <span>／ 招待制</span></p>
          <h1 id="landing-title" className={styles.heroTitle}>仕事の話が、<br /><span>次の一歩</span>になる場所。</h1>
          <p className={styles.heroLead}>GIAの酒場は、RPGで冒険の仲間を探す酒場のように、仲間を知り、相談を持ち寄り、いっしょに動き出すための場所。名刺交換で終わらないつながりを、ここから育てます。</p>
          <div className={styles.heroActions}>
            <Link href="/guild/login" className="rpg-button">▶ 酒場に入る</Link>
            <a href={demoUrl} target="_blank" rel="noopener noreferrer" className={styles.outlineButton}>見本を見てみる ↗</a>
          </div>
          <p className={styles.heroNote}>入会には招待リンクが必要です。見本のデータは架空で、操作は保存されません。</p>
        </div>
        <span className={styles.scrollMark} aria-hidden="true">▼ SCROLL</span>
      </section>

      <section className={styles.content} aria-labelledby="commands-title">
        <div className={styles.sectionHeading}>
          <p>IN THE TAVERN</p>
          <h2 id="commands-title">酒場のコマンド</h2>
          <span>ひとりでは進まない仕事に。</span>
        </div>
        <ol className={styles.features}>
          {features.map((feature) => <li key={feature.mark} className={styles.feature}>
            <span className={styles.featureNumber}>{feature.mark}</span>
            <h3>▶ {feature.title}</h3>
            <p>{feature.body}</p>
          </li>)}
        </ol>
      </section>

      <section className={styles.connection} aria-labelledby="connection-title">
        <div className={styles.connectionInner}>
          <p className={styles.kicker}>CONNECTION</p>
          <h2 id="connection-title">人と人の間にも、役割がある。</h2>
          <p>紹介依頼は相手に直接届きます。連絡先が開くのは、相手が承諾してから。お互いが自分のペースで判断できる流れを大切にしています。</p>
        </div>
      </section>

      <section className={styles.entry} aria-labelledby="entry-title">
        <div className={styles.entryWindow}>
          <span className={styles.windowTitle}>入るには</span>
          <div>
            <h2 id="entry-title">招待リンクから、酒場へ。</h2>
            <p>招待された方は、届いたリンクから手続きを進めてください。すでにアカウントをお持ちの方はログインして続けられます。</p>
          </div>
          <Link href="/guild/login" className="rpg-button">▶ ログインする</Link>
        </div>
      </section>
    </main>

    <footer className={styles.footer}><div><span>GIAの酒場</span><span>© GIA</span></div></footer>
  </div>;
}
