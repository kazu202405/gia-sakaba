"use client";

import { useEffect, useRef } from "react";
import { UserX, TrendingDown, Compass, ListChecks } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const painPoints = [
  {
    icon: UserX,
    title: "社長がいないと、現場が止まる",
    description:
      "判断も、確認も、すべてあなたに集中していませんか？ちょっと抜けただけで電話が鳴り止まない——その状態、限界がきています。",
  },
  {
    icon: TrendingDown,
    title: "毎日忙しいのに、利益が残らない",
    description:
      "朝から晩まで動いているのに、通帳を見ると増えていない。どこにお金が消えているのか、正直わからない。",
  },
  {
    icon: Compass,
    title: "全部「感覚」で回している不安",
    description:
      "数字も、役割も、会議も曖昧。人によって判断がバラバラで、いつか大きなミスが起きそうな予感がある。",
  },
  {
    icon: ListChecks,
    title: "やるべきことが多すぎて、動けない",
    description:
      "採用、DX、営業改善……課題は見えている。でも何から手をつけていいかわからず、結局また今日も目の前の作業に追われる。",
  },
];

export function PainPoints() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".pain-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".pain-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".pain-card",
        { y: 50, opacity: 0, rotateX: 8 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".pain-grid",
            start: "top 90%",
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
    <section
      ref={containerRef}
      className="relative overflow-hidden py-24 md:py-32 bg-[#f8f7f5]"
    >
      {/* Subtle radial gradient blob */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[400px] h-[400px] md:w-[800px] md:h-[800px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(45,138,128,0.06) 0%, rgba(45,138,128,0.02) 40%, transparent 70%)",
        }}
      />

      {/* Decorative floating SVG circle - top right */}
      <svg
        className="pointer-events-none absolute -top-20 -right-20 w-[400px] h-[400px] opacity-[0.04]"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "spin-slow 40s linear infinite" }}
      >
        <circle
          cx="200"
          cy="200"
          r="180"
          stroke="#2d8a80"
          strokeWidth="1.5"
        />
      </svg>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pain-header text-center mb-16">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0f1f33] mb-4">
            こんな状態に、心当たりはありませんか？
          </h2>
          <p className="text-lg text-slate-500">
            ひとつでも当てはまるなら、それは「仕組み」の問題かもしれません。
          </p>
        </div>

        <div className="pain-grid grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto" style={{ perspective: "800px" }}>
          {painPoints.map((point) => (
            <div
              key={point.title}
              className="pain-card card-glow border-gradient-animated group flex items-start gap-4 p-6 rounded-3xl bg-white/80 backdrop-blur-sm transition-all duration-300"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#2d8a80]/10 flex items-center justify-center transition-colors duration-300 group-hover:bg-[#2d8a80]/[0.18]">
                <point.icon className="w-6 h-6 text-[#2d8a80]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0f1f33] mb-1">
                  {point.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
