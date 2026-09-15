"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function BehavioralMidCta() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".midcta-content",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".midcta-content",
            start: "top 85%",
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
      className="relative py-14 md:py-16 bg-[#f8f7f5] overflow-hidden"
    >
      {/* 上下のアクセントライン */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-[#2d8a80] to-[#c8a55a]" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="midcta-content flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
          {/* テキスト */}
          <div className="text-center md:text-left">
            <p className="font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl font-semibold text-[#0f1f33] leading-snug">
              現場で回る仕組み、
              <br className="hidden sm:block" />
              一緒につくりませんか？
            </p>
            <p className="text-sm text-slate-400 mt-2">
              相談は無料 / 相談だけで終わってもOK
            </p>
          </div>

          {/* CTA — テキストリンク風 */}
          <a
            href="https://page.line.me/131liqrt"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 text-[#2d8a80] font-bold text-sm border border-[#2d8a80]/30 rounded-full transition-all duration-300 hover:bg-[#2d8a80]/5 hover:border-[#2d8a80]/60"
          >
            LINEで無料相談する
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-[#2d8a80] to-[#c8a55a]" />
    </section>
  );
}
