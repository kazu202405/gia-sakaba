"use client";

import Image from "next/image";

/**
 * Vision — Cinematic dark
 * navy-deep 全幅、放射グラデーションの陰影。
 * 背景に手元×ノート×ランプの editorial 写真（重い暗オーバーレイで可読性確保）。
 * 大きな明朝クォート + ラベル/本文の2列。
 */
export function About() {
  return (
    <section
      id="about"
      className="edl-root relative overflow-hidden bg-[var(--edl-navy-deep)] text-white py-36 md:py-44 px-6 md:px-16"
    >
      {/* 背景写真 */}
      <Image
        src="/images/vision.png"
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        priority={false}
        className="object-cover object-bottom opacity-55 pointer-events-none select-none"
        style={{ filter: "saturate(0.88) brightness(0.85) contrast(1.02)" }}
      />
      {/* テキスト可読性のための暗オーバーレイ（上が濃く、下にかけて少し薄く） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(7,15,38,0.95) 0%, rgba(7,15,38,0.82) 38%, rgba(7,15,38,0.62) 70%, rgba(7,15,38,0.85) 100%)",
        }}
      />
      {/* 放射グラデーション（金の余韻 + 影） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 25% 30%, rgba(184,153,104,0.14) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(11,31,74,0.55) 0%, transparent 60%)",
        }}
      />
      {/* 上端の細い金線 */}
      <span
        aria-hidden
        className="absolute top-0 left-1/2 w-px h-20"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--edl-gold))",
        }}
      />

      <div className="relative z-[2] max-w-[1100px] mx-auto">
        <span className="edl-section-num on-dark edl-reveal mb-7">
          06 — Our Vision
        </span>

        <h2
          className="edl-reveal edl-jp-keep relative font-[family-name:var(--font-mincho)] font-medium text-white tracking-[0.04em] mb-16"
          data-delay="1"
          style={{
            fontSize: "clamp(40px, 6vw, 88px)",
            lineHeight: 1.5,
          }}
        >
          <span
            aria-hidden
            className="absolute -top-10 -left-4 md:-left-8 font-[family-name:var(--font-mincho)] leading-none text-[var(--edl-gold)] opacity-40"
            style={{ fontSize: "120px" }}
          >
            &ldquo;
          </span>
          <span className="text-[var(--edl-gold-soft)]">人の価値</span>を、
          <br />
          最大化する。
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-20 items-start">
          <div className="edl-reveal" data-delay="2">
            <span className="font-[family-name:var(--font-en)] text-xs font-semibold tracking-[0.32em] text-[var(--edl-gold)] uppercase">
              Why we build
            </span>
            <span
              aria-hidden
              className="block w-9 h-px bg-[var(--edl-gold)] mt-3.5"
            />
          </div>
          <div className="edl-reveal" data-delay="3">
            <p
              className="text-[16px] text-white/85"
              style={{ lineHeight: 2.1 }}
            >
              私たちの企業理念は「人の価値を最大化する」こと。
              アプリやシステムを売ることが目的ではありません。
            </p>
            <p
              className="mt-6 text-[16px] text-white/85"
              style={{ lineHeight: 2.1 }}
            >
              人がやらなくていいことに時間を奪われず、会社の価値を上げる時間を作る。
              その手段として、私たちは仕組みを提案します。
            </p>
            <p
              className="mt-6 text-[16px] text-white/85"
              style={{ lineHeight: 2.1 }}
            >
              設計のベースには、心理学と行動科学。
              「なぜ人が動き、仕組みが回り続けるのか」を、
              勘ではなく再現性のある設計原則として扱います。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
