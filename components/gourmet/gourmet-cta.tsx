"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function GourmetCta() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cta-content",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".cta-content",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section ref={containerRef} className="relative bg-[#0f1f33]">
      {/* Wave divider */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none -translate-y-[1px]">
        <svg
          className="relative block w-full h-12 sm:h-16"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            fill="white"
            opacity="1"
          />
        </svg>
      </div>

      <div className="pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="cta-content max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            信頼のストーリー体験を、
            <br />
            始めませんか
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-xl mx-auto">
            GIA Storiesは、ガイアの酒場コミュニティの特典としてご利用いただけます。
            まずはコミュニティへの参加をご検討ください。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/members"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-amber-500 text-white font-bold text-lg hover:bg-amber-600 transition-colors w-full sm:w-auto"
            >
              コミュニティに参加する
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-white/20 text-white font-bold text-lg hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              会員登録はこちら
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
