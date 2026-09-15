"use client";

import { useEffect, useRef } from "react";
import { Repeat, GitBranch, Users } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const insights = [
  {
    icon: Repeat,
    title: "業務フローが属人化している",
    description:
      "「あの人に聞かないとわからない」が常態化。人が変わるたびに業務が止まり、引き継ぎのたびにゼロからやり直しになる。",
  },
  {
    icon: GitBranch,
    title: "判断基準がバラバラ",
    description:
      "同じ状況でも人によって対応が違う。ルールがないから「なんとなく」で動き、ミスが起きても原因がわからない。",
  },
  {
    icon: Users,
    title: "仕組みではなく「人」に依存している",
    description:
      "優秀な人が抜けたら終わり。採用しても育たない。それは人の問題ではなく、仕組みがないことの問題です。",
  },
];

export function WhyStuck() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header reveal with scale
      gsap.fromTo(
        ".stuck-header",
        { y: 30, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".stuck-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Cards reveal with grow-in effect
      gsap.fromTo(
        ".stuck-card",
        { y: 40, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.14,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".stuck-grid",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Connecting line fade-in
      gsap.fromTo(
        ".stuck-connector",
        { scaleX: 0, opacity: 0 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.8,
          delay: 0.3,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".stuck-grid",
            start: "top 85%",
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
      className="relative overflow-hidden py-24 md:py-32 bg-white"
    >
      {/* Section top glow divider */}
      <div className="section-glow-top" />

      {/* Floating decorative blobs */}
      <div
        className="pointer-events-none absolute -top-32 -left-40 w-[200px] h-[200px] md:w-[420px] md:h-[420px] rounded-full bg-[#2d8a80]/[0.04] blur-[100px]"
        style={{ animation: "mesh-drift 18s ease-in-out infinite" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-32 w-[180px] h-[180px] md:w-[360px] md:h-[360px] rounded-full bg-[#c8a55a]/[0.05] blur-[100px]"
        style={{ animation: "mesh-drift-reverse 20s ease-in-out infinite" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[150px] md:w-[500px] md:h-[300px] rounded-full bg-[#2d8a80]/[0.02] blur-[80px]"
        style={{ animation: "float 14s ease-in-out infinite" }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="stuck-header text-center mb-16">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-4">
            なぜ、変われないのか？
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            課題が見えているのに変われない。その原因は、個人の力不足ではなく
            <br className="hidden sm:block" />
            「業務フローの設計」が抜けていることにあります。
          </p>
        </div>

        {/* Card grid with connecting line */}
        <div className="relative max-w-5xl mx-auto">
          {/* Thin horizontal connecting line between cards (desktop only) */}
          <div
            className="stuck-connector hidden md:block absolute top-[72px] left-[16%] right-[16%] h-px origin-left"
            aria-hidden="true"
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-[#2d8a80]/20 to-transparent" />
          </div>

          {/* Small connector dots at card centers (desktop only) */}
          <div
            className="stuck-connector hidden md:flex absolute top-[68px] left-[16%] right-[16%] justify-between pointer-events-none"
            aria-hidden="true"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[#2d8a80]/20 border border-[#2d8a80]/10 -translate-x-1/2"
                style={{ marginLeft: i === 0 ? "0" : undefined }}
              />
            ))}
          </div>

          <div className="stuck-grid grid grid-cols-1 md:grid-cols-3 gap-6">
            {insights.map((insight) => (
              <div
                key={insight.title}
                className="stuck-card card-glow group relative p-8 rounded-3xl border border-slate-200/80 bg-[#f8f7f5] text-center transition-all duration-400"
              >
                {/* Card inner glow on hover */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-[#2d8a80]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden="true"
                />

                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#2d8a80]/10 flex items-center justify-center mx-auto mb-5 transition-transform duration-400 group-hover:scale-110">
                    <insight.icon className="w-7 h-7 text-[#2d8a80] transition-transform duration-400 group-hover:scale-110" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">
                    {insight.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
