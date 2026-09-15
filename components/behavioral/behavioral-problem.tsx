"use client";

/**
 * Strength × Cross — gia-hp-redesign Section 02（dark treatment）
 * navy-deep 背景に「紙」のオフホワイトカードを2枚並べ、× 記号でつなぐ。
 * アプリ制作（システム開発） × 行動心理学（営業現場で動かしてきた）。
 */
export function BehavioralProblem() {
  return (
    <section
      id="strength"
      className="edl-root relative overflow-hidden bg-[var(--edl-navy-deep)] text-white py-28 md:py-36 px-6 md:px-16"
    >
      {/* 放射グラデーション（cinematic depth） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 75% 30%, rgba(184,153,104,0.10) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(11,31,74,0.6) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-[2] max-w-[1240px] mx-auto">
        {/* Header */}
        <div className="text-center mb-20 md:mb-24">
          <span className="edl-section-num on-dark edl-reveal mb-3">
            02 — Our Strength
          </span>
          <h2
            className="edl-headline on-dark edl-reveal mt-3"
            data-delay="1"
            style={{ fontSize: "clamp(32px, 3.4vw, 48px)" }}
          >
            私たちの<span className="accent">強み</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal mt-7 max-w-[560px] mx-auto text-[15px] text-white/75"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            私たちの提供価値は、シンプルです。
            <br />
            <strong className="text-white font-medium">
              アプリ制作（システム開発） × 行動心理学
            </strong>
            。
          </p>
        </div>

        {/* Cross Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] gap-6 md:gap-10 items-stretch">
          {/* Card 1: Behavioral Science */}
          <article
            className="edl-reveal relative bg-[var(--edl-off-white)] border border-white/10 p-12 md:p-14 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(184,153,104,0.35)]"
            data-delay="1"
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 w-10 h-px bg-[var(--edl-gold)]"
            />
            <span className="block font-[family-name:var(--font-en)] text-[11px] font-semibold tracking-[0.3em] text-[var(--edl-gold)] uppercase mb-7">
              01 / Application &amp; System
            </span>
            <p
              className="font-[family-name:var(--font-mincho)] font-semibold text-[var(--edl-navy)] leading-[1.3] mb-6 [word-break:keep-all] [overflow-wrap:anywhere]"
              style={{ fontSize: "clamp(28px, 3vw, 40px)" }}
            >
              <span className="inline-block">現場で</span>
              <em
                className="not-italic px-1"
                style={{
                  background:
                    "linear-gradient(transparent 60%, rgba(184,153,104,0.28) 60%)",
                }}
              >
                使われる
              </em>
              <span className="inline-block">、</span>
              <br />
              <span className="inline-block">アプリ制作</span>
              <span className="inline-block">（システム開発）。</span>
            </p>
            <p
              className="text-[14.5px] text-[var(--edl-body)]"
              style={{ lineHeight: 2 }}
            >
              機能を詰め込むのではなく、現場で日常的に開かれるアプリ・システムを作ります。
              顧客獲得・業務改善といった成果に直結する実装を、実用最優先で設計・開発します。
            </p>
          </article>

          {/* × symbol */}
          <div
            aria-hidden
            className="flex items-center justify-center font-[family-name:var(--font-mincho)] text-[var(--edl-gold-soft)] leading-none py-4"
            style={{ fontSize: "clamp(48px, 6vw, 80px)" }}
          >
            ×
          </div>

          {/* Card 2: AI Application */}
          <article
            className="edl-reveal relative bg-[var(--edl-off-white)] border border-white/10 p-12 md:p-14 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(184,153,104,0.35)]"
            data-delay="2"
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 w-10 h-px bg-[var(--edl-gold)]"
            />
            <span className="block font-[family-name:var(--font-en)] text-[11px] font-semibold tracking-[0.3em] text-[var(--edl-gold)] uppercase mb-7">
              02 / Behavioral Science
            </span>
            <p
              className="font-[family-name:var(--font-mincho)] font-semibold text-[var(--edl-navy)] leading-[1.3] mb-6 [word-break:keep-all] [overflow-wrap:anywhere]"
              style={{ fontSize: "clamp(28px, 3vw, 40px)" }}
            >
              <span className="inline-block">現場で</span>
              <em
                className="not-italic px-1"
                style={{
                  background:
                    "linear-gradient(transparent 60%, rgba(184,153,104,0.28) 60%)",
                }}
              >
                動かしてきた
              </em>
              <span className="inline-block">、</span>
              <br />
              <span className="inline-block">行動心理学。</span>
            </p>
            <p
              className="text-[14.5px] text-[var(--edl-body)]"
              style={{ lineHeight: 2 }}
            >
              「人がなぜ動くか」を科学的に設計する知見。
              営業・マーケ・組織運営の現場で、再現性のある成果を生んできた裏付け。
              仕組みの中に &quot;人が動く理由&quot; を埋め込めるのがGIAの本領です。
            </p>
          </article>
        </div>

        {/* Bottom quote */}
        <div
          className="edl-reveal mt-20 max-w-[720px] mx-auto text-center"
          data-delay="3"
        >
          <span
            aria-hidden
            className="block w-px h-12 bg-[var(--edl-line-dark)] mx-auto mb-8"
          />
          <p
            className="edl-jp-keep font-[family-name:var(--font-mincho)] text-[19px] text-white/85"
            style={{ lineHeight: 2 }}
          >
            &quot;現場で動くシステム&quot; と &quot;人を動かす設計&quot;。
            <br />
            その両輪が揃って初めて、ビジネスは前進します。
          </p>
        </div>
      </div>
    </section>
  );
}
