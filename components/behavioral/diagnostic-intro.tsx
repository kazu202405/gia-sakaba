"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Clock, BarChart3, ShieldCheck } from "lucide-react";
import gsap from "gsap";

interface DiagnosticIntroProps {
  onStart: () => void;
}

export function DiagnosticIntro({ onStart }: DiagnosticIntroProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.fromTo(
        ".di-badge",
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8 }
      )
        .fromTo(
          ".di-title",
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9 },
          "-=0.4"
        )
        .fromTo(
          ".di-desc",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          "-=0.4"
        )
        .fromTo(
          ".di-feature",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
          "-=0.3"
        )
        .fromTo(
          ".di-cta",
          { y: 20, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6 },
          "-=0.2"
        );

      gsap.to(".di-blob-1", {
        y: -25,
        x: 15,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".di-blob-2", {
        y: 20,
        x: -20,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: Clock,
      title: "たった3分",
      desc: "18の質問にポチポチ答えるだけ",
    },
    {
      icon: BarChart3,
      title: "6つの視点で分析",
      desc: "業務整理度・属人化・デジタル活用度など一目でわかる",
    },
    {
      icon: ShieldCheck,
      title: "無料・登録なし",
      desc: "メールアドレスも不要。今すぐ結果が見れます",
    },
  ];

  return (
    <div ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background blobs */}
      <div className="di-blob-1 absolute top-[15%] left-[10%] w-[min(400px,50vw)] h-[min(400px,50vw)] rounded-full bg-[#2d8a80]/10 blur-[100px] pointer-events-none" />
      <div className="di-blob-2 absolute bottom-[15%] right-[10%] w-[min(350px,45vw)] h-[min(350px,45vw)] rounded-full bg-[#c8a55a]/8 blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center py-20">
        <span className="di-badge inline-block text-sm font-semibold tracking-[0.15em] mb-8 rounded-full px-6 py-2.5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] text-white/90">
          AI Readiness Check
        </span>

        <h1 className="di-title font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white leading-tight mb-6">
          うちの会社、
          <br />
          <span className="text-[#4ecdc4]">AI入れて大丈夫？</span>
        </h1>

        <p className="di-desc text-base sm:text-lg text-white/60 leading-relaxed mb-12 max-w-lg mx-auto">
          18の質問に答えるだけで、AI導入の前に整理すべきことが見えてきます。
          <br className="hidden sm:block" />
          業務フロー・属人化・デジタル活用度など、6つの視点でチェック。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {features.map((f) => (
            <div
              key={f.title}
              className="di-feature p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2d8a80]/15 flex items-center justify-center mx-auto mb-3">
                <f.icon className="w-5 h-5 text-[#2d8a80]" />
              </div>
              <p className="text-sm font-bold text-white/90 mb-1">{f.title}</p>
              <p className="text-xs text-white/40">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="di-cta relative inline-block">
          <div className="absolute inset-0 rounded-full bg-[#2d8a80]/25 animate-[pulse-ring_3s_ease-out_infinite]" />
          <button
            onClick={onStart}
            className="btn-glow group relative inline-flex items-center gap-3 px-10 py-5 bg-[#2d8a80] text-white font-bold text-lg rounded-full hover:bg-[#247a70] transition-all duration-300 shadow-2xl hover:shadow-[0_20px_60px_rgba(45,138,128,0.3)] hover:-translate-y-1"
          >
            診断を始める
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>

        <p className="text-xs text-white/30 mt-6">
          個人情報の入力は一切不要です
        </p>
      </div>
    </div>
  );
}
