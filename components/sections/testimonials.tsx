"use client";

import { useEffect, useRef } from "react";
import { Quote } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// 仮のお客様の声（既存の実績ケースから派生した想定コピー）
// 事実ベースで実名・肩書き・コメントを微調整予定
const testimonials = [
  {
    quote:
      "紙ベースだった見積査定が全てアプリに。営業の負担が半分以下になり、顧客情報もKPIも一元で見える状態になりました。",
    name: "K.T 様",
    role: "代表取締役",
    industry: "飲食店専門の不動産会社",
    initial: "K",
  },
  {
    quote:
      "属人的だった事務作業を整理していただき、残業ゼロが当たり前に。社長が現場に入らなくても回る状態まで、一気通貫で伴走してくれました。",
    name: "T.H 様",
    role: "代表取締役",
    industry: "高圧電気工事会社",
    initial: "T",
  },
  {
    quote:
      "AI活用と業務フロー整理で、HPやLPも自社で作れるように。外注費が完全ゼロになり、ブランドの伝え方まで変わりました。",
    name: "R.S 様",
    role: "マーケティング担当",
    industry: "美容用品商社",
    initial: "R",
  },
];

export function Testimonials() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".tm-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".tm-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
      gsap.fromTo(
        ".tm-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".tm-grid",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative bg-[#f8f7f5] py-24 md:py-32 overflow-hidden"
    >
      <div className="section-glow-top" />

      {/* Decorative blob */}
      <div
        className="absolute top-[20%] right-[-5%] w-[300px] h-[300px] rounded-full opacity-[0.06] pointer-events-none hidden md:block"
        style={{
          background: "radial-gradient(circle, #2d8a80 0%, transparent 70%)",
          animation: "mesh-drift 18s ease-in-out infinite",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="tm-header text-center mb-14">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            お客様の声
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0f1f33] mb-4">
            仕組み化で、何が変わったか。
          </h2>
          <p className="text-base text-slate-500 max-w-2xl mx-auto">
            アプリ実装の先で、現場で何が起きているか。
            <br className="hidden sm:block" />
            実際にお取引先からいただいた声をお届けします。
          </p>
        </div>

        <div className="tm-grid grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="tm-card group relative rounded-3xl bg-white border border-slate-200/60 p-7 md:p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <Quote className="absolute top-5 right-5 w-5 h-5 text-[#2d8a80]/20" />
              <p className="text-[15px] text-slate-700 leading-relaxed mb-6 min-h-[130px]">
                「{t.quote}」
              </p>
              <div className="flex items-center gap-3 pt-5 border-t border-slate-200/60">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2d8a80] to-[#c8a55a] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {t.initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0f1f33] truncate">
                    {t.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {t.role} / {t.industry}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
