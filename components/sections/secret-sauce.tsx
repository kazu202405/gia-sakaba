"use client";

import { useEffect, useRef } from "react";
import { Workflow, Brain } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function SecretSauce() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".sauce-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".sauce-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".sauce-main",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".sauce-cards",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".sauce-secret",
        { y: 40, opacity: 0, rotateY: -5, scale: 0.9 },
        {
          y: 0,
          opacity: 1,
          rotateY: 0,
          scale: 1,
          duration: 0.6,
          delay: 0.3,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".sauce-cards",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // Floating particles inside the dark card
      gsap.utils.toArray<HTMLElement>(".sauce-particle").forEach((dot, i) => {
        gsap.to(dot, {
          y: "random(-12, 12)",
          x: "random(-8, 8)",
          duration: 2.5 + i * 0.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.4,
        });
      });

      // Floating teal blob inside main card
      gsap.to(".sauce-teal-blob", {
        y: -15,
        x: 10,
        duration: 4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // Footer gradient line reveal
      gsap.fromTo(
        ".sauce-footer-line",
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".sauce-footer",
            start: "top 95%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".sauce-footer-text",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          delay: 0.3,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".sauce-footer",
            start: "top 95%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);

    ScrollTrigger.refresh(true);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section ref={containerRef} className="relative overflow-hidden py-24 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sauce-header text-center mb-16">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-4">
            なぜGIAの仕組みは、定着するのか？
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            多くのコンサルは「設計」で終わる。GIAは「定着」まで設計します。
          </p>
        </div>

        <div className="sauce-cards grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 max-w-5xl mx-auto">
          {/* Main: 業務フロー整理 */}
          <div className="sauce-main border-gradient-animated p-10 rounded-3xl bg-[#f8f7f5] border border-slate-200/80 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-[#2d8a80]/10 flex items-center justify-center mb-6">
                <Workflow className="w-8 h-8 text-[#2d8a80]" />
              </div>
              <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-semibold text-slate-800 mb-3">
                業務フローの徹底整理
              </h3>
              <p className="text-base text-[#2d8a80] font-semibold mb-4">
                すべての基盤はここにある
              </p>
              <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                KPI設計、会議体、役割分担、情報の流れ——業務フローのすべてを可視化し、
                ムダを省き、誰がやっても同じ結果が出る仕組みに再設計します。
                さらに必要に応じてDX・システム開発も社内で対応。外注不要で一気通貫。
              </p>
            </div>
            {/* Decorative blob - original */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-[#2d8a80]/5 blur-2xl" />
            {/* Floating teal blob decoration */}
            <div className="sauce-teal-blob absolute top-1/2 right-8 w-24 h-24 rounded-full bg-[#2d8a80]/[0.06] blur-xl pointer-events-none" />
          </div>

          {/* Secret: 心理学 */}
          <div className="sauce-secret p-8 rounded-3xl bg-[#0f1f33] text-white relative overflow-hidden shadow-[0_0_0_1px_rgba(200,165,90,0),0_0_30px_rgba(200,165,90,0)] transition-shadow duration-700 [.sauce-secret-revealed_&]:shadow-[0_0_0_1px_rgba(200,165,90,0.15),0_0_40px_rgba(200,165,90,0.08)]"
            style={{
              animation: "sauce-gold-glow 4s ease-in-out infinite",
            }}
          >
            <div className="relative z-10">
              <span className="shimmer-badge inline-block text-xs font-bold tracking-widest text-[#c8a55a] bg-[#c8a55a]/10 px-3 py-1 rounded-full mb-5">
                裏側の武器
              </span>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                <Brain className="w-6 h-6 text-[#c8a55a]" />
              </div>
              <h3 className="text-lg font-bold mb-3">
                行動心理学に基づく
                <br />
                定着設計
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                人が自然に動く環境を、心理学で設計。
                評価・コミュニケーション・習慣化の仕組みで、
                導入した業務フローが「やらされ感」なく定着します。
              </p>
            </div>
            {/* Decorative glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#c8a55a]/10 blur-2xl" />
            {/* Floating gold particles */}
            <div className="sauce-particle absolute top-6 right-6 w-1.5 h-1.5 rounded-full bg-[#c8a55a]/40 pointer-events-none" />
            <div className="sauce-particle absolute bottom-12 left-6 w-1 h-1 rounded-full bg-[#c8a55a]/30 pointer-events-none" />
            <div className="sauce-particle absolute top-1/2 right-1/3 w-1 h-1 rounded-full bg-[#c8a55a]/25 pointer-events-none" />
          </div>
        </div>

        {/* Footer message */}
        <div className="sauce-footer text-center mt-12">
          {/* Gradient line: teal to gold, centered */}
          <div
            className="sauce-footer-line mx-auto mb-6 h-px w-48 origin-center"
            style={{
              background: "linear-gradient(90deg, transparent, #2d8a80, #c8a55a, transparent)",
            }}
          />
          <p className="sauce-footer-text text-base text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
            業務フロー整理 × 心理設計。
            <br className="sm:hidden" />
            この組み合わせで「仕組みが定着する」のが、GIAの強みです。
          </p>
        </div>
      </div>
    </section>
  );
}
