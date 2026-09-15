"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SubmitButton } from "@/components/submit-button";
import { startTerakoyaCheckout } from "./actions";

gsap.registerPlugin(ScrollTrigger);

// 法人プランの相談先（LINE公式・ヘッダーの無料相談と同一）
const LINE_URL = "https://page.line.me/131liqrt";

// 主な活動内容
const activities = [
  {
    num: "01",
    title: "月1回の勉強会",
    desc: "経営・ビジネスの考え方を、毎月継続して学べる場。一度きりで終わらせません。",
  },
  {
    num: "02",
    title: "うまくいっている\n企業の事例研究",
    desc: "実際に成果を出している企業のやり方を分解し、自分の商売に活かせるヒントに変えます。",
  },
  {
    num: "03",
    title: "参加者同士の\n自己紹介・交流",
    desc: "お互いの事業を知り合うことから。顔の見える、前向きな関係をつくります。",
  },
  {
    num: "04",
    title: "紹介・協業が\n生まれるマッチング",
    desc: "事業の重なりや補い合えるところから、紹介や協業のきっかけが生まれます。",
  },
  {
    num: "05",
    title: "希望者向けの\n壁打ち・相談会",
    desc: "今の悩みや次の一手を、参加者や運営と一緒に整理できます。",
  },
  {
    num: "06",
    title: "リアル懇親会・\n食事会",
    desc: "画面の外でも会える場。オンラインだけで終わらせません。",
  },
];

// こんな方を歓迎します
const welcome = [
  "自分のビジネスをもっと良くしたい方",
  "前向きな仲間とつながりたい方",
  "学んだことを実践につなげたい方",
  "自分や自分の周りの力で、相手に何をしてあげられるかを考えられる方",
];

// ご遠慮いただきたいこと
const decline = [
  "強引な押し売り",
  "参加者を営業リストのように扱うこと",
  "一方的な勧誘や迷惑行為",
  "相手に与える意識のない参加",
];

export function SalonLP() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(".salon-badge", { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: 0.3 })
        .fromTo(".salon-h1", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.2")
        .fromTo(".salon-sub", { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.3")
        .fromTo(".salon-scroll-hint", { opacity: 0 }, { opacity: 1, duration: 0.6 }, "-=0.1");

      // Contents
      gsap.fromTo(
        ".content-heading",
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, scrollTrigger: { trigger: ".section-contents", start: "top 80%" } }
      );
      gsap.fromTo(
        ".content-item",
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, scrollTrigger: { trigger: ".section-contents", start: "top 75%" } }
      );

      // Welcome / Decline
      gsap.fromTo(
        ".welcome-col",
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, scrollTrigger: { trigger: ".section-welcome", start: "top 80%" } }
      );

      // Pricing
      gsap.fromTo(
        ".price-inner",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, scrollTrigger: { trigger: ".section-pricing", start: "top 80%" } }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="bg-[var(--gia-navy)]">
      {/* ===== Hero ===== */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-[var(--gia-navy)] pt-24 sm:pt-16">
        {/* Hero背景画像 */}
        <div className="absolute inset-0">
          <img
            src="/images/salon-hero.png"
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-[var(--gia-navy)]/60" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <span
            className="salon-badge inline-flex items-center px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white/50 tracking-widest uppercase mb-10"
            style={{ opacity: 0 }}
          >
            HIROGARUキャンパス
          </span>

          <h1
            className="salon-h1 font-[family-name:var(--font-noto-serif-jp)] text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.2] tracking-tight mb-6"
            style={{ opacity: 0 }}
          >
            あなたの事業は、
            <br />
            <span className="text-[var(--gia-teal-light)]">まだまだ大きくなれる。</span>
          </h1>

          <p
            className="salon-sub text-white/45 text-sm sm:text-base leading-relaxed max-w-lg mx-auto"
            style={{ opacity: 0 }}
          >
            これからの時代を生き抜くために、
            <br />
            お金・経営・AIについて考える。
          </p>
        </div>

        {/* Scroll hint */}
        <div className="salon-scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2" style={{ opacity: 0 }}>
          <div className="w-px h-8 bg-white/10 relative overflow-hidden rounded-full">
            <div
              className="absolute top-0 left-0 w-full h-3 bg-gradient-to-b from-white/40 to-transparent"
              style={{ animation: "scroll-line 2s ease-in-out infinite" }}
            />
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--gia-warm-gray)] to-transparent z-10" />
      </section>

      {/* ===== About + 活動内容 ===== */}
      <section className="section-contents bg-[var(--gia-warm-gray)] py-24 sm:py-32 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          {/* セクションヘッダー */}
          <div className="content-heading text-center mb-14 sm:mb-16">
            <span className="block text-[11px] text-[var(--gia-teal)] tracking-[0.2em] uppercase font-medium mb-4">
              About
            </span>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl lg:text-[2.2rem] font-semibold text-[var(--gia-navy)] leading-tight mb-7">
              どんなコミュニティ？
            </h2>
            {/* 五島さんの核となる2フレーズは要約せず生で提示 */}
            <p className="font-[family-name:var(--font-noto-serif-jp)] text-[var(--gia-navy)] text-lg sm:text-xl font-semibold leading-[1.9] mb-6">
              「こんな世界があるんだ」
              <br />
              「自分の人生と事業は、まだまだ広げられる」
            </p>
            <p className="text-[var(--gia-navy)]/55 text-sm sm:text-[15px] leading-[1.9] max-w-2xl mx-auto">
              そう感じられるきっかけを届ける場です。
              <br className="hidden sm:block" />
              AI・お金・経営・思考法は、そのための入り口。学んで終わりではなく、
              <br className="hidden sm:block" />
              視野が広がり、次の一手が見えてくる。前向きな仲間と、可能性を押し広げていきます。
            </p>
          </div>

          {/* 主な活動内容 */}
          <div className="content-heading text-center mb-12">
            <span className="block text-[11px] text-[var(--gia-teal)] tracking-[0.2em] uppercase font-medium mb-3">
              Activities
            </span>
            <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl font-semibold text-[var(--gia-navy)]">
              主な活動内容
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--gia-navy)]/[0.06]">
            {activities.map((item) => (
              <div
                key={item.num}
                className="content-item group relative bg-[var(--gia-warm-gray)] px-6 lg:px-8 py-9 overflow-hidden"
                style={{ opacity: 0 }}
              >
                {/* 背景の大きなナンバー装飾 */}
                <span className="absolute -top-3 -right-1 text-[4.8rem] font-bold leading-none text-[var(--gia-navy)]/[0.04] select-none pointer-events-none font-[family-name:var(--font-noto-serif-jp)] transition-colors duration-500 group-hover:text-[var(--gia-teal)]/[0.1]">
                  {item.num}
                </span>

                {/* テキスト */}
                <div className="relative z-10">
                  <h4 className="text-[var(--gia-navy)] font-semibold text-[15px] leading-relaxed whitespace-pre-line mb-4 min-h-[2.8em] flex items-end">
                    {item.title}
                  </h4>
                  <div className="w-1/2 h-px bg-[var(--gia-navy)]/10 mb-4" />
                  <p className="text-[var(--gia-navy)]/50 text-[13px] leading-[1.85]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 歓迎 / ご遠慮 ===== */}
      <section className="section-welcome bg-[var(--gia-navy)] py-24 sm:py-32 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* 歓迎 */}
            <div
              className="welcome-col bg-white/[0.04] border border-white/8 rounded-2xl p-8 sm:p-10"
              style={{ opacity: 0 }}
            >
              <span className="block text-[11px] text-[var(--gia-teal-light)] tracking-[0.2em] uppercase font-medium mb-3">
                Welcome
              </span>
              <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl font-semibold text-white mb-7">
                こんな方を歓迎します
              </h3>
              <ul className="space-y-4">
                {welcome.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-white/65 text-sm leading-[1.8]">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--gia-teal)] shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ご遠慮 */}
            <div
              className="welcome-col bg-transparent border border-white/8 rounded-2xl p-8 sm:p-10"
              style={{ opacity: 0 }}
            >
              <span className="block text-[11px] text-white/30 tracking-[0.2em] uppercase font-medium mb-3">
                No, thanks
              </span>
              <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl font-semibold text-white/70 mb-7">
                ご遠慮いただきたいこと
              </h3>
              <ul className="space-y-4">
                {decline.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-white/40 text-sm leading-[1.8]">
                    <span className="mt-1.5 text-white/25 shrink-0">×</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pricing + CTA ===== */}
      <section className="section-pricing bg-[var(--gia-warm-gray)] py-20 sm:py-28">
        <div className="price-inner max-w-4xl mx-auto px-6" style={{ opacity: 0 }}>
          <div className="text-center mb-12">
            <span className="block text-[11px] text-[var(--gia-teal)] tracking-[0.2em] uppercase font-medium mb-4">
              Price
            </span>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-semibold text-[var(--gia-navy)] mb-4">
              参加費
            </h2>
            <p className="text-[var(--gia-navy)]/45 text-sm leading-relaxed">
              前向きな仲間と学び合い、商売に活かす。
              <br />
              まずはお気軽にご参加ください。
            </p>
          </div>

          <div className="max-w-md mx-auto">
            {/* 月額会員プラン */}
            <div className="flex flex-col bg-[var(--gia-navy)] rounded-2xl p-8 sm:p-10 text-left border-2 border-[var(--gia-teal)]">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] text-[var(--gia-teal-light)] tracking-[0.2em] uppercase font-medium">
                  Membership
                </span>
                <span className="text-white font-[family-name:var(--font-noto-serif-jp)] text-lg font-semibold">
                  月額会員
                </span>
              </div>
              <ul className="text-white/55 text-sm space-y-3 mb-8">
                {[
                  "月1回の勉強会・事例研究",
                  "AI活用とお金の教養を学ぶ実践講座",
                  "参加者同士の自己紹介・交流",
                  "紹介・協業のマッチング",
                  "希望者向けの壁打ち・相談会",
                  "リアル懇親会・食事会",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="w-1 h-1 rounded-full bg-[var(--gia-teal-light)] shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>

              <div className="h-px bg-white/10 mb-8" />

              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-white/30 text-sm">月額</span>
                <span className="text-5xl font-bold text-white tracking-tight">11,000</span>
                <span className="text-white/30 text-sm">円</span>
              </div>
              <p className="text-white/30 text-xs text-center mb-8">税込 ／ ※ 飲食代は都度別途</p>

              <div className="mt-auto">
                <div className="h-px bg-white/10 mb-8" />
                <form action={startTerakoyaCheckout}>
                  <SubmitButton
                    className="w-full inline-flex items-center justify-center px-8 py-3.5 bg-[var(--gia-teal)] text-white text-sm font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
                    pendingText="決済ページへ進んでいます…"
                  >
                    参加を申し込む
                  </SubmitButton>
                </form>
                <p className="text-white/40 text-[11px] text-center mt-3">
                  まずは{" "}
                  <a
                    href={LINE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--gia-teal-light)]"
                  >
                    LINEで詳細を受け取る
                  </a>
                  {" "}・初回参加の相談もこちら
                </p>
              </div>
            </div>
          </div>

          <p className="text-[var(--gia-navy)]/45 text-sm text-center mt-10 mb-2">
            学びを、人生と事業の&ldquo;次の一手&rdquo;に変えたい人へ。
          </p>
          <p className="text-[var(--gia-navy)]/30 text-xs text-center mb-6">
            紹介優先でご案内しています
          </p>

          {/* 注意書き（投資助言業に該当しないことを明示） */}
          <p className="text-[var(--gia-navy)]/40 text-[11px] leading-[1.8] text-center max-w-xl mx-auto border-t border-[var(--gia-navy)]/10 pt-6">
            本コミュニティでは、個別銘柄の推奨や売買判断の助言は行いません。
            AI・金融・経営・ビジネスの考え方を学ぶ場です。
          </p>
        </div>
      </section>
    </div>
  );
}
