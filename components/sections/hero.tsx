"use client";

import Image from "next/image";
import { EdlRevealObserver } from "@/components/ui/edl-reveal";

/**
 * Editorial Hero — gia-hp-redesign Pattern B（50/50 split）
 * 左：eyebrow → 明朝見出し → 和文タグライン → 説明 → CTA
 * 右：ネイビー背景に写真 + インセットボーダー + 撮影キャプション
 */
export function Hero() {
  return (
    <section className="edl-root edl-hero relative grid grid-cols-1 md:grid-cols-2 min-h-screen bg-[var(--edl-off-white)]">
      <EdlRevealObserver />

      {/* 左：コンテンツ */}
      <div className="relative flex flex-col justify-center px-6 py-28 md:px-16 md:pt-40 md:pb-24">
        {/* 右上の "01" 装飾（PCのみ） */}
        <span className="hidden md:block absolute top-32 right-16 font-[family-name:var(--font-en)] text-[11px] font-semibold tracking-[0.32em] text-[var(--edl-muted)]">
          01
        </span>

        <span className="edl-eyebrow edl-reveal mb-7">For your real workflow</span>

        <h1
          className="edl-headline edl-reveal mb-7"
          data-delay="1"
          style={{ fontSize: "clamp(40px, 4.8vw, 72px)" }}
        >
          使う人の現場で、<br />
          <span className="accent">回る</span>仕組みを<span className="period">.</span>
        </h1>

        <span
          className="edl-reveal edl-jp-keep block font-[family-name:var(--font-mincho)] text-[var(--edl-navy)] font-medium tracking-[0.04em] mt-2"
          data-delay="2"
          style={{ fontSize: "clamp(20px, 2.4vw, 28px)" }}
        >
          <span className="text-[var(--edl-gold)]">— </span>
          アプリとシステムで実装、お任せください。
        </span>

        <p
          className="edl-reveal mt-8 mb-10 max-w-[36ch] text-[15px] text-[var(--edl-body)] tracking-[0.02em]"
          data-delay="3"
          style={{ lineHeight: 2.05 }}
        >
          日本一の営業実績を生んだ
          <strong className="edl-hl">行動心理学</strong>
          と、現場で使われる
          <strong className="edl-hl">AIアプリ制作</strong>。
          設計から定着まで、一気通貫で伴走します。
        </p>

        <div className="edl-reveal flex flex-col items-start gap-5" data-delay="4">
          <a
            href="https://page.line.me/131liqrt"
            target="_blank"
            rel="noopener noreferrer"
            className="edl-cta-primary line"
          >
            LINEで無料相談
            <span className="arrow" />
          </a>
          <a href="#strength" className="edl-cta-secondary">
            私たちの強みを見る
          </a>
        </div>
      </div>

      {/* 右：写真 */}
      <div className="relative bg-[var(--edl-navy)] overflow-hidden min-h-[60vh] md:min-h-0">
        <Image
          src="/images/hero-desk.png"
          alt="現場で書き込まれるノートとPC"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          style={{ filter: "saturate(0.92) contrast(1.04) brightness(0.97)" }}
        />
        {/* インセットボーダー */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-4 md:inset-8 border border-white/20"
        />
        {/* 撮影キャプション */}
        <span className="absolute bottom-8 left-8 md:bottom-14 md:left-14 z-10 text-white font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] uppercase flex items-center">
          <span className="inline-block w-6 h-px bg-[var(--edl-gold)] mr-3" />
          In your real workflow
        </span>
      </div>
    </section>
  );
}
