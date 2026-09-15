import type { Metadata } from "next";
import Link from "next/link";
import { EdlRevealObserver } from "@/components/ui/edl-reveal";

const LINE_URL = "https://page.line.me/131liqrt";

export const metadata: Metadata = {
  title: "建設会社の信用資産運用パック | 採用・紹介につながる建設業Web運用 | GIA",
  description:
    "建設会社・工務店・設備工事・リフォーム会社向けに、施工事例・採用ページ・Googleマップ投稿・紹介導線・問い合わせ導線を毎月整えるWeb運用サービス。会社名で検索された瞬間に、元請け・協力会社・求職者から信頼される会社ページへ。将来はLINE・CRM・AI活用まで拡張できます。",
  keywords: [
    "建設業 ホームページ",
    "建設会社 ホームページ制作",
    "建設業 採用ページ",
    "施工事例 ホームページ",
    "建設会社 Web運用",
    "工務店 ホームページ",
    "設備工事 ホームページ",
    "リフォーム会社 ホームページ",
  ],
  alternates: {
    canonical: "/services/construction",
  },
  openGraph: {
    title: "建設会社の信用資産運用パック | 建設業向けWeb運用",
    description:
      "施工事例・採用・紹介導線・Googleマップ・問い合わせ導線を毎月整え、会社の信用資産を積み上げる建設業向けWeb運用サービスです。",
    type: "website",
  },
};

const issues = [
  "会社名で検索されても、情報が少ない",
  "施工実績はあるのに、ホームページに載せられていない",
  "紹介はあるが、成約前に不安を持たれている気がする",
  "求人を出しても、会社の魅力が伝わっていない",
  "元請けや協力会社に見られた時の印象が弱い",
  "ホームページを作ったまま放置している",
  "Googleマップやお知らせの更新が止まっている",
];

const operations = [
  { title: "施工事例の追加", body: "現場写真や工事内容を整理し、実績として伝わる記事にします。" },
  { title: "お知らせ更新", body: "会社の動き、募集、休業案内などを止めずに発信します。" },
  { title: "Googleマップ投稿", body: "地域で稼働している印象を作り、検索時の安心感を高めます。" },
  { title: "採用ページ改善", body: "仕事内容、社風、代表の考えを整え、応募前の不安を減らします。" },
  { title: "代表メッセージ・強みの整理", body: "社長の考えや現場で大切にしていることを言語化します。" },
  { title: "問い合わせ導線改善", body: "電話・フォーム・LINEなど、相手が迷わず連絡できる流れを作ります。" },
  { title: "LINE導線の整備", body: "気軽な相談や紹介後の連絡につながる入口を設計します。" },
  { title: "紹介者向けページの整備", body: "紹介された人が確認しやすい情報をまとめ、紹介の質を高めます。" },
  { title: "アクセス・問い合わせ状況の確認", body: "検索・閲覧・問い合わせの状況を見ながら改善点を判断します。" },
  { title: "月1回の改善ミーティング", body: "現場の状況を聞き、次に載せるべき情報と導線を決めます。" },
];

const plans = [
  {
    label: "Light",
    name: "ライトプラン",
    price: "月額 3万円〜",
    body: "小規模な更新・保守・施工事例追加を中心にしたプラン。まずは放置状態をなくし、最低限の信用情報を整えたい会社向けです。",
    featured: false,
  },
  {
    label: "Standard",
    name: "スタンダードプラン",
    price: "月額 5万円〜8万円",
    body: "施工事例・採用・Googleマップ・問い合わせ導線まで継続的に整える基本プラン。紹介・採用・問い合わせの土台を毎月育てます。",
    featured: true,
  },
  {
    label: "Premium",
    name: "プレミアムプラン",
    price: "月額 10万円〜20万円",
    body: "Web運用に加えて、LINE・CRM・紹介管理・営業フォロー・AI活用まで含めた、社長の右腕プランです。",
    featured: false,
  },
];

const differences = [
  "建設業の現場や商習慣を理解した提案ができる",
  "単なるデザインではなく、信用・紹介・採用につながる設計をする",
  "施工事例や強みの言語化までサポートする",
  "Web制作だけでなく、営業導線・紹介導線・AI活用まで拡張できる",
  "社長の考えや会社の魅力を整理して発信できる",
];

const industries = [
  "建設会社",
  "工務店",
  "リフォーム会社",
  "電気工事会社",
  "空調設備会社",
  "給排水設備会社",
  "塗装会社",
  "防水会社",
  "解体会社",
  "外構会社",
  "内装会社",
  "原状回復工事会社",
];

const flow = [
  { title: "無料相談", body: "現状のお悩みと目指したい状態をお聞きします。" },
  { title: "現状サイト・検索状況の確認", body: "会社名で検索された時の見え方を一緒に確認します。" },
  { title: "課題と改善方針の整理", body: "何を載せ、どの導線を整えるかを設計します。" },
  { title: "初期ページ制作 / 既存サイト改善", body: "状態に応じて、新規制作か既存改修かを判断します。" },
  { title: "月額運用開始", body: "施工事例・採用・導線を毎月整え始めます。" },
  { title: "毎月の改善・施工事例追加・導線見直し", body: "信用資産を継続的に積み上げていきます。" },
];

export default function ConstructionWebOperationPage() {
  return (
    <div className="edl-root bg-[var(--edl-off-white)] text-[var(--edl-body)]">
      <EdlRevealObserver />

      {/* ===== 1. Hero ===== */}
      <section className="relative pt-32 md:pt-44 pb-24 md:pb-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-[1.25fr_0.95fr] gap-14 md:gap-20 items-center">
          <div>
            <span className="edl-eyebrow edl-reveal mb-7">
              Construction Web Operation
            </span>
            <h1
              className="edl-headline edl-reveal mb-7"
              style={{ fontSize: "clamp(32px, 4.4vw, 60px)" }}
            >
              建設会社の信用は、
              <br />
              <span className="accent">検索された瞬間</span>に決まります
              <span className="period">.</span>
            </h1>
            <p
              className="edl-reveal max-w-[48ch] text-[15px] md:text-[16px] tracking-[0.02em] leading-[1.95] text-[var(--edl-body)]"
              data-delay="1"
            >
              紹介・元請け・求人応募につながるように、
              <strong className="edl-hl">施工事例・会社情報・採用ページ・問い合わせ導線</strong>
              を毎月整える、建設業向けWeb運用サービスです。
            </p>
            <div
              className="edl-reveal mt-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
              data-delay="2"
            >
              <a
                href={LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="edl-cta-primary line"
              >
                無料で相談する
                <span className="arrow" />
              </a>
              <Link href="/contact" className="edl-cta-secondary">
                自社サイトを診断してもらう
              </Link>
            </div>
          </div>

          {/* 信用資産の見え方イメージ */}
          <div
            className="edl-reveal hidden md:block bg-white border border-[var(--edl-line)] p-7"
            data-delay="2"
          >
            <p className="text-[11px] tracking-[0.18em] text-[var(--edl-muted)] uppercase mb-5">
              会社名で検索された時の見え方
            </p>
            <p className="font-[family-name:var(--font-mincho)] text-[20px] text-[var(--edl-navy)] font-medium mb-2">
              株式会社サンプル建設
            </p>
            <p className="text-[13px] text-[var(--edl-muted)] leading-[1.8] mb-6">
              施工事例・採用・許可情報・問い合わせ導線が揃った状態
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: "48件", l: "施工事例を継続掲載" },
                { v: "更新中", l: "お知らせ・マップ投稿" },
                { v: "即連絡", l: "LINE・フォーム導線" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="bg-[var(--edl-off-white)] border border-[var(--edl-line)] p-3"
                >
                  <strong className="block font-[family-name:var(--font-mincho)] text-[var(--edl-navy)] text-[18px] leading-none">
                    {s.v}
                  </strong>
                  <span className="block mt-2 text-[11px] text-[var(--edl-muted)] leading-[1.35]">
                    {s.l}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 対応領域バッジ */}
        <div className="max-w-[1240px] mx-auto mt-12 edl-reveal" data-delay="3">
          <div className="flex flex-wrap gap-2.5">
            {["施工事例", "採用ページ", "Googleマップ", "紹介導線", "LINE・問い合わせ"].map(
              (b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-2 bg-white border border-[var(--edl-line)] px-3.5 py-2 text-[12px] font-medium text-[var(--edl-navy)]"
                >
                  <span className="w-1.5 h-1.5 bg-[var(--edl-gold)]" />
                  {b}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ===== 2. 課題提起 ===== */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">01 — Issues</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[24ch]"
            data-delay="1"
            style={{ fontSize: "clamp(26px, 3vw, 42px)" }}
          >
            実績はあるのに、検索された時に
            <span className="accent">伝わっていない</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[58ch] mb-14 text-[15px] leading-[1.95] text-[var(--edl-body)]"
            data-delay="1"
          >
            建設業・設備業・リフォーム業では、紹介や現場での信頼が仕事につながります。ただ、相手が最初に確認する会社情報が薄いままだと、契約・応募・問い合わせの前に不安が残ります。
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {issues.map((t, i) => (
              <li
                key={t}
                className="edl-reveal relative flex items-start gap-4 bg-white border border-[var(--edl-line)] px-5 py-5"
                data-delay={((i % 3) + 1) as 1 | 2 | 3}
              >
                <span className="mt-2.5 w-3 h-px bg-[var(--edl-gold)] shrink-0" />
                <span className="text-[15px] font-medium text-[var(--edl-navy)] leading-[1.7]">
                  {t}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== 3. サービスの考え方（ダーク） ===== */}
      <section className="py-24 md:py-32 px-6 md:px-16 bg-[var(--edl-navy)] text-white border-b border-[var(--edl-line-dark)]">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-14 md:gap-20 items-center">
          <div>
            <span className="edl-section-num on-dark edl-reveal">02 — Concept</span>
            <h2
              className="edl-headline on-dark edl-reveal mt-4 mb-8 max-w-[26ch]"
              data-delay="1"
              style={{ fontSize: "clamp(26px, 3vw, 42px)" }}
            >
              ホームページは「作るもの」ではなく
              <br className="hidden md:block" />
              <span className="accent">信用を積み上げる場所</span>です
              <span className="period">.</span>
            </h2>
            <div className="edl-reveal space-y-5 max-w-[60ch]" data-delay="2">
              <p className="text-[15px] md:text-[16px] text-white/80 leading-[1.95]">
                建設業は、紹介や信頼で仕事が決まることが多い業界です。元請けからの紹介、協力会社からの紹介、既存のお客様からの紹介など、最初の接点は人づてでも、相手は最終的に会社名を検索します。
              </p>
              <p className="text-[15px] md:text-[16px] text-white/80 leading-[1.95]">
                その時に、施工事例・代表の想い・対応エリア・許可や資格・採用情報・問い合わせ導線が整っているだけで、会社への安心感は大きく変わります。毎月の更新は派手な広告ではなく、会社の信用を少しずつ積み上げるための運用です。
              </p>
            </div>
          </div>
          <div className="edl-reveal grid gap-3.5" data-delay="3">
            {[
              { tag: "Case", t: "施工実績が見える" },
              { tag: "Recruit", t: "人を大切にする会社だと伝わる" },
              { tag: "Contact", t: "問い合わせ先で迷わせない" },
              { tag: "Map", t: "地域で動いている会社に見える" },
            ].map((c) => (
              <div
                key={c.tag}
                className="border border-[var(--edl-line-dark)] bg-white/[0.05] p-5"
              >
                <span className="block text-[11px] tracking-[0.2em] uppercase text-[var(--edl-gold-soft)] mb-1.5">
                  {c.tag}
                </span>
                <strong className="font-[family-name:var(--font-mincho)] text-[18px] font-medium text-white">
                  {c.t}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4. 月額運用で行うこと ===== */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">03 — Monthly Operation</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[26ch]"
            data-delay="1"
            style={{ fontSize: "clamp(26px, 3vw, 42px)" }}
          >
            月額運用で<span className="accent">行うこと</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[58ch] mb-14 text-[15px] leading-[1.95] text-[var(--edl-body)]"
            data-delay="1"
          >
            ホームページを作って終わりにせず、施工実績・採用・紹介・問い合わせの接点を毎月整えます。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {operations.map((op, i) => (
              <article
                key={op.title}
                className="edl-reveal bg-white border border-[var(--edl-line)] p-7 transition-all duration-300 hover:border-[var(--edl-gold)] hover:-translate-y-1"
                data-delay={((i % 3) + 1) as 1 | 2 | 3}
              >
                <span className="block text-[12px] font-semibold tracking-[0.18em] text-[var(--edl-gold)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-[family-name:var(--font-mincho)] text-[18px] font-medium text-[var(--edl-navy)] mt-4 leading-[1.5]">
                  {op.title}
                </h3>
                <p className="mt-3 text-[14px] text-[var(--edl-muted)] leading-[1.85]">
                  {op.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 5. 料金プラン ===== */}
      <section className="py-24 md:py-32 px-6 md:px-16 bg-white border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">04 — Pricing</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6"
            data-delay="1"
            style={{ fontSize: "clamp(26px, 3vw, 42px)" }}
          >
            料金<span className="accent">プラン</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[58ch] mb-14 text-[15px] leading-[1.95] text-[var(--edl-body)]"
            data-delay="1"
          >
            金額はあくまで目安です。既存サイトの状態、更新頻度、導線設計の範囲に応じて設計します。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p, i) => (
              <article
                key={p.name}
                className={`edl-reveal flex flex-col p-8 ${
                  p.featured
                    ? "border-2 border-[var(--edl-gold)] bg-[var(--edl-gold-soft)]/[0.05] shadow-[0_18px_50px_-20px_rgba(11,31,74,0.25)]"
                    : "border border-[var(--edl-line)] bg-[var(--edl-off-white)]"
                }`}
                data-delay={(i + 1) as 1 | 2 | 3}
              >
                <span className="text-[12px] font-semibold tracking-[0.2em] uppercase text-[var(--edl-gold)]">
                  {p.label}
                </span>
                <h3 className="font-[family-name:var(--font-mincho)] text-[20px] font-medium text-[var(--edl-navy)] mt-2">
                  {p.name}
                </h3>
                <div className="font-[family-name:var(--font-mincho)] text-[var(--edl-navy)] font-semibold mt-4 leading-[1.25] text-[clamp(24px,2.4vw,32px)]">
                  {p.price}
                </div>
                <p className="mt-6 text-[14px] text-[var(--edl-muted)] leading-[1.95]">
                  {p.body}
                </p>
              </article>
            ))}
          </div>
          <div className="edl-reveal mt-7 border border-[var(--edl-line)] bg-[var(--edl-off-white)] p-6 text-[13px] text-[var(--edl-muted)] leading-[1.95]">
            <p>※ 初期制作が必要な場合は、別途30万円〜80万円程度で設計します。</p>
            <p>
              ※ 上記金額は目安です。既存サイトの改修範囲、撮影・取材の有無、運用体制によって変動します。
            </p>
          </div>
        </div>
      </section>

      {/* ===== 6. 他社との違い + 対象業種 ===== */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">05 — Difference</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[24ch]"
            data-delay="1"
            style={{ fontSize: "clamp(26px, 3vw, 42px)" }}
          >
            他社との<span className="accent">違い</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[58ch] mb-14 text-[15px] leading-[1.95] text-[var(--edl-body)]"
            data-delay="1"
          >
            デザインだけではなく、建設業の信用・紹介・採用につながる情報設計から支援します。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {differences.map((d, i) => (
              <div
                key={d}
                className="edl-reveal flex items-start gap-5 bg-white border border-[var(--edl-line)] p-7"
                data-delay={((i % 2) + 1) as 1 | 2}
              >
                <span className="font-[family-name:var(--font-mincho)] text-[22px] font-semibold text-[var(--edl-gold)] leading-none shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-[16px] font-medium text-[var(--edl-navy)] leading-[1.7]">
                  {d}
                </h3>
              </div>
            ))}
          </div>

          {/* 対象業種 */}
          <div className="edl-reveal mt-14" data-delay="2">
            <p className="text-[12px] tracking-[0.18em] uppercase text-[var(--edl-muted)] mb-4">
              対象業種
            </p>
            <div className="flex flex-wrap gap-2.5">
              {industries.map((ind) => (
                <span
                  key={ind}
                  className="bg-white border border-[var(--edl-line)] px-3.5 py-2 text-[13px] font-medium text-[var(--edl-navy)]"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 7. 導入の流れ ===== */}
      <section className="py-24 md:py-32 px-6 md:px-16 bg-white border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">06 — Process</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6"
            data-delay="1"
            style={{ fontSize: "clamp(26px, 3vw, 42px)" }}
          >
            導入の<span className="accent">流れ</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[58ch] mb-14 text-[15px] leading-[1.95] text-[var(--edl-body)]"
            data-delay="1"
          >
            まずは現状の見え方を確認し、既存サイト改善か初期制作かを判断します。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {flow.map((f, i) => (
              <div
                key={f.title}
                className="edl-reveal bg-[var(--edl-off-white)] border border-[var(--edl-line)] p-7"
                data-delay={((i % 3) + 1) as 1 | 2 | 3}
              >
                <span className="inline-flex items-center justify-center w-11 h-11 font-[family-name:var(--font-mincho)] text-[18px] text-white bg-[var(--edl-navy)] rounded-full mb-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-[family-name:var(--font-mincho)] text-[18px] font-medium text-[var(--edl-navy)] leading-[1.5]">
                  {f.title}
                </h3>
                <p className="mt-3 text-[14px] text-[var(--edl-muted)] leading-[1.85]">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 8. 最後のCTA（ダーク） ===== */}
      <section className="py-28 md:py-36 px-6 md:px-16 bg-[var(--edl-navy)] text-white">
        <div className="max-w-[820px] mx-auto text-center">
          <span className="edl-section-num on-dark edl-reveal is-centered inline-block">
            First Step
          </span>
          <h2
            className="edl-headline on-dark edl-reveal mt-5 mb-8"
            data-delay="1"
            style={{ fontSize: "clamp(26px, 3.2vw, 44px)" }}
          >
            まずは、御社名で検索された時の
            <br className="hidden sm:block" />
            <span className="accent">印象を確認</span>しませんか
            <span className="period">？</span>
          </h2>
          <p
            className="edl-reveal text-[15px] md:text-[16px] text-white/80 leading-[1.95] max-w-[60ch] mx-auto mb-12"
            data-delay="2"
          >
            ホームページがない、または更新できていない状態でも大丈夫です。施工実績や会社の強みを整理し、紹介・採用・問い合わせにつながるWeb運用をご提案します。
          </p>
          <div
            className="edl-reveal flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-6"
            data-delay="3"
          >
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="edl-cta-primary line"
            >
              無料で相談する
              <span className="arrow" />
            </a>
            <Link href="/contact" className="edl-cta-secondary on-dark">
              サイト診断を依頼する
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
