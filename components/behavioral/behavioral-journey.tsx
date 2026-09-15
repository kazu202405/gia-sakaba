"use client";

import { useEffect, useRef } from "react";
import {
  Eye,
  MessageSquare,
  ClipboardCheck,
  Handshake,
  Crown,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const stages = [
  {
    number: "01",
    icon: Eye,
    title: "まずは知る",
    subtitle: "Awareness",
    description: "このページやSNSで「行動科学」という考え方に出会う",
    touchpoint: "",
    color: "#2d8a80",
    widthPercent: 100,
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "診断してみる",
    subtitle: "Interest",
    description: "3分の無料診断で、自社の強み・弱みを可視化",
    touchpoint: "",
    color: "#2d8a80",
    widthPercent: 95,
  },
  {
    number: "03",
    icon: ClipboardCheck,
    title: "相談する",
    subtitle: "Consultation",
    description: "診断結果をもとに、専門家と改善の方向性を一緒に考える",
    touchpoint: "無料",
    color: "#2d8a80",
    widthPercent: 88,
  },
  {
    number: "04",
    icon: Handshake,
    title: "取り組む",
    subtitle: "Action",
    description: "あなたの組織に合わせた行動変容プログラムをスタート",
    touchpoint: "",
    color: "#c8a55a",
    widthPercent: 80,
  },
  {
    number: "05",
    icon: Crown,
    title: "一緒に育てる",
    subtitle: "Growth",
    description: "継続的にサポートしながら、組織の成長を加速させる",
    touchpoint: "",
    color: "#c8a55a",
    widthPercent: 72,
  },
];

export function BehavioralJourney() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bj-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bj-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bj-stage",
        { y: 40, opacity: 0, scaleX: 0.8 },
        {
          y: 0,
          opacity: 1,
          scaleX: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bj-funnel",
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
      {/* Decorative gradient */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] md:w-[800px] md:h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(45,138,128,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bj-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            JOURNEY
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0f1f33] mb-4">
            ご利用の流れ
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            無料診断から始まり、あなたのペースで進められます。
            <br className="hidden sm:block" />
            強引な営業は一切ありません。
          </p>
        </div>

        {/* Funnel */}
        <div className="bj-funnel space-y-3 max-w-4xl mx-auto">
          {stages.map((stage) => (
            <div
              key={stage.number}
              className="bj-stage origin-left"
              style={{ width: `${stage.widthPercent}%`, marginLeft: "auto", marginRight: "auto" }}
            >
              <div className="flex items-center gap-4 p-4 md:p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                {/* Number + Icon */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stage.color}15` }}
                >
                  <stage.icon className="w-6 h-6" style={{ color: stage.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <h3 className="text-base font-bold text-[#0f1f33]">
                      {stage.title}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {stage.subtitle}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {stage.description}
                  </p>
                </div>

                {/* Touchpoint badge */}
                {stage.touchpoint && (
                  <span className="hidden md:inline-block text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full flex-shrink-0">
                    {stage.touchpoint}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Arrow indicator */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            <div className="w-8 h-px bg-slate-300" />
            <span>あなたのペースで、一歩ずつ</span>
            <div className="w-8 h-px bg-slate-300" />
          </div>
        </div>
      </div>
    </section>
  );
}
