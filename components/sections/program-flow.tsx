"use client";

import { useEffect, useRef } from "react";
import { Stethoscope, Settings, BarChart3, Rocket } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    icon: Stethoscope,
    number: "01",
    title: "現状診断",
    subtitle: "無料相談",
    description: "業務フローのボトルネックを可視化し、優先課題を特定します。",
  },
  {
    icon: Settings,
    number: "02",
    title: "フロー設計",
    subtitle: "Week 1–2",
    description: "KPI・会議体・役割分担など、業務の「設計図」をつくります。",
  },
  {
    icon: BarChart3,
    number: "03",
    title: "仕組み実装",
    subtitle: "Week 3–10",
    description: "設計した仕組みを現場に落とし込み、日常業務に定着させます。",
  },
  {
    icon: Rocket,
    number: "04",
    title: "自走化",
    subtitle: "Week 11–12",
    description: "社長不在でも回る運営体制を仕上げ、自走できる状態にします。",
  },
];

export function ProgramFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header entrance
      gsap.fromTo(
        ".flow-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".flow-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Step cards stagger entrance
      gsap.fromTo(
        ".flow-step",
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".flow-grid",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Floating decorative ring animation
      gsap.to(".flow-deco-ring", {
        rotation: 360,
        duration: 90,
        repeat: -1,
        ease: "none",
      });

      // SVG flow line draw animation (dashed style)
      if (lineRef.current) {
        const length = lineRef.current.getTotalLength();
        gsap.set(lineRef.current, {
          strokeDasharray: `${length}`,
          strokeDashoffset: length,
        });
        gsap.to(lineRef.current, {
          strokeDashoffset: 0,
          duration: 2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".flow-grid",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        });
      }
    }, containerRef);

    ScrollTrigger.refresh(true);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section ref={containerRef} id="program" className="relative py-24 md:py-32 bg-white overflow-hidden">
      {/* Floating decorative ring */}
      <div className="flow-deco-ring absolute -top-32 -right-32 w-[500px] h-[500px] pointer-events-none hidden md:block">
        <svg viewBox="0 0 500 500" fill="none" className="w-full h-full opacity-[0.04]">
          <circle cx="250" cy="250" r="220" stroke="#2d8a80" strokeWidth="1" />
          <circle cx="250" cy="250" r="190" stroke="#2d8a80" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Secondary decorative ring - bottom left */}
      <div className="absolute -bottom-24 -left-24 w-[350px] h-[350px] pointer-events-none hidden md:block">
        <svg viewBox="0 0 350 350" fill="none" className="w-full h-full opacity-[0.03]">
          <circle cx="175" cy="175" r="150" stroke="#c8a55a" strokeWidth="0.8" />
          <circle cx="175" cy="175" r="120" stroke="#2d8a80" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flow-header text-center mb-16">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-6">
            自然と回る仕組みへ
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            業務フローを整理し、仕組みで成長する会社へ。4つのステップで実現します。
          </p>
        </div>

        {/* SVG Flow Line (desktop only) - dashed with animated draw */}
        <div className="hidden md:block relative h-8 max-w-4xl mx-auto mb-4">
          <svg className="w-full h-full" viewBox="0 0 800 32" fill="none" preserveAspectRatio="none">
            <path
              ref={lineRef}
              d="M50,16 C200,16 200,16 250,16 C300,16 300,16 400,16 C500,16 500,16 550,16 C600,16 600,16 750,16"
              stroke="#2d8a80"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="8 6"
              fill="none"
              opacity="0.5"
            />
            {/* Dot markers at each step position */}
            {[100, 300, 500, 700].map((cx, i) => (
              <circle
                key={i}
                cx={cx}
                cy="16"
                r="4"
                fill="#2d8a80"
                opacity="0.3"
              />
            ))}
          </svg>
        </div>

        <div className="flow-grid grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
          {steps.map((step) => (
            <div key={step.number} className="flow-step relative flex flex-col items-center group">
              {/* Step Card */}
              <div className="card-glow border-gradient-animated relative z-10 flex flex-col items-center text-center p-6 rounded-3xl bg-[#f8f7f5] border border-slate-200/80 shadow-sm w-full transition-all duration-400 group-hover:scale-[1.03]">
                {/* Icon container with glow on hover */}
                <div
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-shadow duration-400 group-hover:shadow-[0_0_24px_rgba(45,138,128,0.25)]"
                  style={{
                    background: "linear-gradient(135deg, #2d8a80, #3a9e93)",
                  }}
                >
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                {/* Step number with gradient background */}
                <span
                  className="inline-flex items-center justify-center text-xs font-bold text-white tracking-widest mb-1 px-3 py-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #2d8a80, #3a9e93)",
                  }}
                >
                  STEP {step.number}
                </span>
                <h3 className="text-lg font-bold text-slate-800 mb-1 mt-1">
                  {step.title}
                </h3>
                <span className="text-xs text-slate-400 font-medium mb-3">
                  {step.subtitle}
                </span>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
