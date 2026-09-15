"use client";

import { ChevronDown, MessageCircleQuestion } from "lucide-react";

/**
 * FAQ — Editorial Q/A 一覧
 * 静的展開（折りたたみなし）。Q（金）/ A（muted）の明朝レター付き。
 */
const faqs = [
  {
    q: "業務の整理って、具体的に何をしてくれるんですか？",
    a:
      "まず「誰が・何を・どの順番で」やっているかを可視化します。そのうえで、人がやるべきこと・仕組みに任せるべきことを仕分けし、必要に応じてシステム化やAI活用の設計まで行います。",
  },
  {
    q: "相談したら必ず契約しないといけませんか？",
    a:
      "いいえ。無料相談は「現状の整理」が目的です。相談した結果、自社で対応できそうだと思えばそれで大丈夫です。押し売りは一切しません。",
  },
  {
    q: "行動心理学とAIアプリ制作、両方を提供している会社は珍しいのでは？",
    a:
      "はい、私たちの強みです。仕組みを作るだけでなく \"人がなぜ動くか\" を踏まえた設計ができるため、現場で実際に使われるシステムが生まれます。\"作ったが使われない\" を生まないことが、私たちのこだわりです。",
  },
  {
    q: "社員が少ないのですが、仕組み化できますか？",
    a:
      "業務内容にもよりますが、少人数の会社でも仕組み化できた事例は多くあります。実際に在宅スタッフだけで回る体制を構築したケースも。まずは現状を聞かせていただければ、可能かどうかを一緒に判断できます。",
  },
  {
    q: "制作期間はどれくらいですか？",
    a:
      "小さく作って早く検証することを基本にしています。要件によって変わりますが、多くの場合4〜8週間で初版をリリースし、その後現場運用と並行して育てていきます。",
  },
  {
    q: "既存のシステムとの連携はできますか？",
    a:
      "可能です。既存のCRM・基幹システム・スプレッドシート等との連携を前提に設計します。「ゼロから作り直し」ではなく、いまあるものを活かす方針を基本にしています。",
  },
  {
    q: "費用はどのくらいかかりますか？",
    a:
      "一般的なコンサルティングは月額30〜50万円が相場ですが、GIAは仕組み化支援に特化しているため月額5万円〜からご相談いただけます。過去に似たような事例があり、新たに対応すべきことが多くないケースでは、月額3万円程度からご対応させていただいた実績もあります。企業の状況や課題に応じて柔軟に対応しますので、まずはお気軽に無料相談でお聞かせください。",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="edl-root bg-white px-6 py-24 md:px-16 md:py-32"
    >
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <span className="edl-section-num edl-reveal mb-3">07 — FAQ</span>
          <h2
            className="edl-headline edl-reveal mt-3"
            data-delay="1"
            style={{ fontSize: "clamp(32px, 3.8vw, 52px)" }}
          >
            よくある<span className="accent">ご質問</span>
            <span className="period">.</span>
          </h2>
          <p className="edl-reveal mt-7 max-w-[32ch] text-[14.5px] text-[var(--edl-muted)]" data-delay="2" style={{ lineHeight: 2 }}>
            気になる質問を選んでください。ここにない内容も、LINEで気軽にご相談いただけます。
          </p>
          <div className="edl-reveal mt-9 hidden size-20 items-center justify-center border border-[var(--edl-line)] text-[var(--edl-gold)] lg:flex" data-delay="3">
            <MessageCircleQuestion className="size-7" strokeWidth={1.35} />
          </div>
        </div>

        <div className="border-t border-[var(--edl-line)]">
          {faqs.map((faq, i) => (
            <details
              key={faq.q}
              className="group edl-reveal border-b border-[var(--edl-line)]"
              data-delay={String(Math.min(i + 1, 6))}
            >
              <summary className="grid cursor-pointer list-none grid-cols-[36px_1fr_24px] items-center gap-3 py-7 marker:content-none md:grid-cols-[44px_1fr_28px] md:gap-5 md:py-8">
                <span className="font-[family-name:var(--font-en)] text-[18px] font-semibold text-[var(--edl-gold)]">
                  Q
                </span>
                <span
                  className="edl-jp-keep font-[family-name:var(--font-mincho)] font-semibold leading-[1.65] text-[var(--edl-navy)]"
                  style={{ fontSize: "clamp(17px, 1.55vw, 20px)" }}
                >
                  {faq.q}
                </span>
                <span className="flex size-7 items-center justify-center rounded-full border border-[var(--edl-line)] text-[var(--edl-muted)] transition-all duration-300 group-open:rotate-180 group-open:border-[var(--edl-gold)] group-open:text-[var(--edl-gold)]">
                  <ChevronDown className="size-3.5" strokeWidth={1.7} />
                </span>
              </summary>
              <div className="grid grid-cols-[36px_1fr] gap-3 pb-8 md:grid-cols-[44px_1fr] md:gap-5">
                <span className="font-[family-name:var(--font-en)] text-[16px] font-semibold text-[var(--edl-muted)]">
                  A
                </span>
                <p className="max-w-[60ch] text-[14.5px] text-[var(--edl-body)]" style={{ lineHeight: 2 }}>
                  {faq.a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
