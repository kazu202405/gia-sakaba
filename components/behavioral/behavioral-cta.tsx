"use client";

/**
 * Final CTA — Editorial dark with LINE
 * navy-deep 全幅、放射グラデで陰影。
 * eyebrow → 大きな明朝見出し（gold key）→ sub → LINE primary + secondary。
 */
export function BehavioralCta() {
  return (
    <section
      id="contact"
      className="edl-root relative overflow-hidden bg-[var(--edl-navy-deep)] text-white py-32 md:py-40 px-6 md:px-16 text-center"
    >
      {/* 放射グラデーション
           gold 起点を右上に置き、下端は真っ暗にして Footer (navy-deep) へ自然接続 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 12% 8%, rgba(184,153,104,0.24) 0%, transparent 55%), radial-gradient(ellipse at 28% 22%, rgba(184,153,104,0.08) 0%, transparent 60%), linear-gradient(to bottom, transparent 55%, rgba(7,15,38,0.65) 100%)",
        }}
      />
      {/* 上端の細い金線 */}
      <span
        aria-hidden
        className="absolute top-0 left-1/2 w-px h-16"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--edl-gold))",
        }}
      />

      <div className="relative z-[2] max-w-[880px] mx-auto">
        <span className="edl-eyebrow is-centered edl-reveal mx-auto mb-7" style={{ color: "var(--edl-gold-soft)" }}>
          First Step
        </span>

        <h2
          className="edl-reveal edl-jp-keep font-[family-name:var(--font-mincho)] font-medium text-white tracking-[0.04em] mb-8"
          data-delay="1"
          style={{
            fontSize: "clamp(36px, 5vw, 68px)",
            lineHeight: 1.5,
          }}
        >
          LINEで、
          <span className="text-[var(--edl-gold-soft)]">無料相談</span>。
        </h2>

        <p
          className="edl-reveal text-[16px] text-white/80 max-w-[580px] mx-auto mb-14"
          data-delay="2"
          style={{ lineHeight: 2.1 }}
        >
          アプリやシステムを売ることが目的ではありません。
          <br />
          &quot;作るかどうか&quot; から、一緒に考えます。
        </p>

        <div
          className="edl-reveal flex flex-wrap items-center justify-center gap-8"
          data-delay="3"
        >
          <a
            href="https://page.line.me/131liqrt"
            target="_blank"
            rel="noopener noreferrer"
            className="edl-cta-primary line"
          >
            LINEで友だち追加
            <span className="arrow" />
          </a>
          <a href="#services" className="edl-cta-secondary on-dark">
            対応領域をもう一度見る
          </a>
        </div>

        <div
          className="edl-reveal flex flex-col md:flex-row gap-3 md:gap-8 justify-center mt-10 font-[family-name:var(--font-en)] text-[11px] tracking-[0.24em] text-white/55 uppercase"
          data-delay="4"
        >
          <span>
            <span className="text-[var(--edl-gold)]">◇ </span>
            友だち追加するだけ
          </span>
          <span>
            <span className="text-[var(--edl-gold)]">◇ </span>
            営業トークは一切なし
          </span>
          <span>
            <span className="text-[var(--edl-gold)]">◇ </span>
            その日からやりとり可能
          </span>
        </div>
      </div>
    </section>
  );
}
