"use client";

/**
 * Process — Editorial 縦タイムライン
 * 円形ドット + ゴールドフェードする縦線。
 * 各ステップは見出し（明朝）+ 説明 + タグ。
 */
const steps = [
  {
    num: "01",
    title: "無料相談・現状ヒアリング",
    desc:
      "まずはお話を聞かせてください。いまの業務・課題・目指す姿を伺った上で、進めるかどうかを一緒に判断します。押し売りはありません。",
    tag: "First Touch",
  },
  {
    num: "02",
    title: "業務フロー診断・設計支援",
    desc:
      "現場の動きを観察し、紹介導線・KPI・情報基盤を整理します。ここで「そもそもシステムはいらない」という結論になることもあります。それも含めて、お客様の事業にとって最善の判断を一緒にします。",
    tag: "Diagnose & Design",
  },
  {
    num: "03",
    title: "AI活用設計・実装プラン",
    desc:
      "業務フローのうちAIが効果を発揮できる箇所を特定。人がやるべきこと／AIに任せることの線引きを定義し、実装プランに落とし込みます。",
    tag: "AI Design",
  },
  {
    num: "04",
    title: "必要に応じて実装＆定着伴走",
    desc:
      "システムやアプリで実装が必要だと判断したら、設計・開発・導入、そして現場での定着まで責任を持って伴走します。納品して終わり、ではありません。",
    tag: "Build & Embed",
  },
];

export function BehavioralCurriculum() {
  return (
    <section
      id="process"
      className="edl-root bg-white py-28 md:py-36 px-6 md:px-16"
    >
      <div className="max-w-[1080px] mx-auto">
        {/* Header */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-20 items-end mb-20 md:mb-24">
          <div>
            <span className="edl-section-num edl-reveal mb-3">
              04 — Process
            </span>
            <h2
              className="edl-headline edl-reveal mt-3"
              data-delay="1"
              style={{ fontSize: "clamp(32px, 3.4vw, 48px)" }}
            >
              ご一緒する<span className="accent">流れ</span>
              <span className="period">.</span>
            </h2>
          </div>
          <p
            className="edl-reveal text-[15px] text-[var(--edl-muted)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            いきなり「作りましょう」とは言いません。
            まず話を聞き、必要だと判断したときだけ、作る。
            作ったら、現場に定着するまで一緒に伴走します。
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* 縦線 */}
          <span
            aria-hidden
            className="absolute top-8 bottom-8 left-[31px] w-px"
            style={{
              background:
                "linear-gradient(to bottom, var(--edl-gold) 0%, var(--edl-line) 100%)",
            }}
          />

          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`edl-tl-step edl-reveal grid grid-cols-[64px_1fr] gap-8 md:gap-12 ${
                i < steps.length - 1 ? "pb-14" : ""
              } relative`}
              data-delay={String(i + 1)}
            >
              {/* dot */}
              <div className="edl-tl-dot relative z-[1] w-16 h-16 rounded-full bg-white border border-[var(--edl-line)] flex items-center justify-center font-[family-name:var(--font-en)] text-[12px] font-semibold tracking-[0.2em] text-[var(--edl-navy)] transition-all duration-300">
                {step.num}
              </div>

              <div className="pt-3">
                <h3
                  className="edl-jp-keep font-[family-name:var(--font-mincho)] font-semibold text-[var(--edl-navy)] tracking-[0.04em] mb-4"
                  style={{ fontSize: "clamp(22px, 2.2vw, 30px)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-[15px] text-[var(--edl-body)] max-w-[60ch]"
                  style={{ lineHeight: 2 }}
                >
                  {step.desc}
                </p>
                <span className="inline-block mt-5 pt-3.5 border-t border-[var(--edl-line)] font-[family-name:var(--font-en)] text-[11px] tracking-[0.24em] text-[var(--edl-muted)] uppercase">
                  {step.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* dot hover 効果 */}
      <style jsx>{`
        .edl-tl-step:hover .edl-tl-dot {
          background: var(--edl-navy);
          color: var(--edl-white);
          border-color: var(--edl-navy);
          box-shadow: inset 0 0 0 4px var(--edl-navy),
            inset 0 0 0 5px var(--edl-gold);
        }
      `}</style>
    </section>
  );
}
