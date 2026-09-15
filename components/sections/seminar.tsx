"use client";

/**
 * Seminar — Editorial 日付＋情報＋CTA カード
 * 白背景に左4pxのゴールド縦線。
 * 3列：日付 | バッジ+タイトル+説明 | LINE CTA。
 */
export function Seminar() {
  return (
    <section className="edl-root bg-[var(--edl-off-white)] py-24 md:py-28 px-6 md:px-16">
      <div className="max-w-[1100px] mx-auto">
        <div className="edl-reveal relative bg-white border border-[var(--edl-line)] p-10 md:p-16 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-10 md:gap-14 items-center overflow-hidden">
          {/* 左の金線 */}
          <span
            aria-hidden
            className="absolute top-0 left-0 w-1 h-full bg-[var(--edl-gold)]"
          />

          {/* 日付 */}
          <div className="text-center md:border-r md:border-[var(--edl-line)] md:pr-14 md:pb-0 pb-8 border-b md:border-b-0 border-[var(--edl-line)]">
            <div className="font-[family-name:var(--font-en)] text-[13px] font-semibold tracking-[0.24em] text-[var(--edl-gold)] uppercase">
              Coming
            </div>
            <div className="font-[family-name:var(--font-mincho)] text-[64px] font-bold text-[var(--edl-navy)] leading-none my-2">
              —
            </div>
            <div className="font-[family-name:var(--font-en)] text-xs tracking-[0.2em] text-[var(--edl-muted)]">
              日程調整中
            </div>
          </div>

          {/* 情報 */}
          <div>
            <span className="inline-block font-[family-name:var(--font-en)] text-[11px] font-semibold tracking-[0.24em] text-[var(--edl-gold)] uppercase mb-3.5">
              GIA Seminar
            </span>
            <h3 className="edl-jp-keep font-[family-name:var(--font-mincho)] text-[26px] font-semibold text-[var(--edl-navy)] mb-3 leading-[1.5]">
              紹介が自然に生まれる仕組みのつくり方
            </h3>
            <p className="text-[14px] text-[var(--edl-muted)] leading-[1.9]">
              経営者向け／月1回／90分／オンライン／参加費無料。
              私たちが日々現場で使っている考え方を体験できます。
              開催日が決まり次第お知らせします。
            </p>
          </div>

          {/* CTA */}
          <a
            href="https://page.line.me/131liqrt"
            target="_blank"
            rel="noopener noreferrer"
            className="edl-cta-primary"
          >
            LINEで詳細を聞く
            <span className="arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}
