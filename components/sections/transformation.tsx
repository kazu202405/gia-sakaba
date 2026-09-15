"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const beforeItems = [
  "社長に判断が集中し、常に忙しい",
  "数字が見えず、感覚で経営している",
  "人が辞めると業務が止まる",
  "何から手をつけていいかわからない",
];

const afterItems = [
  "現場が自分で判断し、社長は戦略に集中",
  "ダッシュボードで数字がリアルタイムに見える",
  "誰が抜けても業務が回る仕組みがある",
  "優先順位が明確で、やるべきことが決まっている",
];

export function Transformation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header fade-in
      gsap.fromTo(
        ".transform-header",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".transform-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Before card slides in from left
      gsap.fromTo(
        ".transform-before",
        { x: -60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".transform-grid",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // Before list items stagger in
      gsap.fromTo(
        ".transform-before li",
        { x: -20, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".transform-grid",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // Arrow scales in with bounce
      gsap.fromTo(
        ".transform-arrow",
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          delay: 0.4,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: ".transform-grid",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // After card slides in from right
      gsap.fromTo(
        ".transform-after",
        { x: 60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          delay: 0.25,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".transform-grid",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // After list items stagger in
      gsap.fromTo(
        ".transform-after li",
        { x: 20, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          delay: 0.35,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".transform-grid",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // Floating blob gentle drift
      gsap.fromTo(
        ".transform-blob",
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".transform-grid",
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
      {/* Top glow separator */}
      <div className="section-glow-top" />

      {/* Floating decorative blob */}
      <div
        className="transform-blob pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(circle, rgba(45,138,128,0.08) 0%, rgba(45,138,128,0.03) 40%, transparent 70%)",
          animation: "mesh-drift 12s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="transform-header text-center mb-16">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-4">
            こう変わります
          </h2>
          <p className="text-lg text-slate-500">
            業務フローの整理で、経営のあり方が根本から変わります。
          </p>
        </div>

        <div className="transform-grid grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-start">
          {/* Before */}
          <div
            className="transform-before group p-8 rounded-3xl bg-white border border-red-200/60 shadow-sm transition-all duration-400 ease-out hover:-translate-y-1"
            style={{
              transitionProperty: "transform, box-shadow",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 8px 32px rgba(220, 38, 38, 0.1), 0 0 0 1px rgba(220, 38, 38, 0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">
                BEFORE
              </span>
              <span className="text-sm text-slate-400">今の状態</span>
            </div>
            <ul className="space-y-4">
              {beforeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-50 flex items-center justify-center mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                  </span>
                  <span className="text-sm text-slate-600 leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow */}
          <div className="transform-arrow flex items-center justify-center md:mt-24">
            <div className="relative">
              {/* Pulse ring behind the arrow circle */}
              <span
                className="absolute inset-0 rounded-full bg-[#2d8a80]/20"
                style={{
                  animation: "pulse-ring 2.5s ease-out infinite",
                }}
              />
              <div className="relative w-14 h-14 rounded-full bg-[#2d8a80] flex items-center justify-center shadow-lg">
                <ArrowRight className="w-6 h-6 text-white md:block hidden" />
                <svg
                  className="w-6 h-6 text-white md:hidden"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="transform-after border-gradient-animated p-8 rounded-3xl bg-white border border-[#2d8a80]/30 shadow-sm card-glow">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-bold text-[#2d8a80] bg-[#2d8a80]/10 px-3 py-1 rounded-full">
                AFTER
              </span>
              <span className="text-sm text-slate-400">業務フロー整理後</span>
            </div>
            <ul className="space-y-4">
              {afterItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2d8a80]/10 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3.5 h-3.5 text-[#2d8a80]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-sm text-slate-600 leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
