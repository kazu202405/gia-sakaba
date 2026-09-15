"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const principles = [
  {
    quote: "人間の意志力は、有限のリソースである。",
    source: "— Roy Baumeister, Ego Depletion Theory",
    insight: "だから「頑張れ」ではなく、環境を変える。",
  },
  {
    quote: "選択肢の提示方法が、人の行動を決定する。",
    source: "— Richard Thaler, Nudge Theory",
    insight: "だから「正しいこと」を教えるのではなく、自然に選ばれる設計をする。",
  },
  {
    quote: "小さな行動の積み重ねが、アイデンティティを変える。",
    source: "— BJ Fogg, Tiny Habits",
    insight: "だから大改革ではなく、小さな習慣から始める。",
  },
];

export function BehavioralPhilosophy() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bph-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bph-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bph-main-quote",
        { y: 40, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bph-main-quote",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bph-principle",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bph-principles",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Slow ambient blob drift
      gsap.to(".bph-blob-1", {
        y: -30,
        x: 20,
        duration: 18,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".bph-blob-2", {
        y: 25,
        x: -15,
        duration: 22,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".bph-blob-3", {
        scale: 1.15,
        opacity: 0.05,
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Scattered dots - gentle but visible drift
      const dotAnimations = [
        { sel: ".bph-orb-1",  y: -50, x: 40,  dur: 6 },
        { sel: ".bph-orb-2",  y: 45,  x: -35, dur: 7 },
        { sel: ".bph-orb-3",  y: -40, x: -45, dur: 8 },
        { sel: ".bph-orb-4",  y: 55,  x: 30,  dur: 7.5 },
        { sel: ".bph-orb-5",  y: -45, x: -35, dur: 6.5 },
        { sel: ".bph-orb-6",  y: 40,  x: 50,  dur: 9 },
        { sel: ".bph-orb-7",  y: -55, x: -30, dur: 7 },
        { sel: ".bph-orb-8",  y: 35,  x: 45,  dur: 8.5 },
        { sel: ".bph-orb-9",  y: -40, x: 35,  dur: 7 },
        { sel: ".bph-orb-10", y: 50,  x: -40, dur: 6 },
        { sel: ".bph-orb-11", y: -35, x: -50, dur: 9.5 },
        { sel: ".bph-orb-12", y: 45,  x: 35,  dur: 6.5 },
        { sel: ".bph-orb-13", y: -50, x: -30, dur: 8 },
        { sel: ".bph-orb-14", y: 40,  x: 45,  dur: 7.5 },
      ];
      dotAnimations.forEach((d) => {
        gsap.to(d.sel, {
          y: d.y,
          x: d.x,
          duration: d.dur,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      // Light streaks - very slow horizontal drift
      gsap.to(".bph-streak-1", {
        x: 60,
        opacity: 0.8,
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".bph-streak-2", {
        x: -50,
        opacity: 0.6,
        duration: 25,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden py-24 md:py-32 bg-[#0f1f33]"
    >
      {/* Slow-drifting ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="bph-blob-1 absolute top-[5%] right-[5%] w-[min(500px,55vw)] h-[min(500px,55vw)] rounded-full bg-[#c8a55a]/25 blur-[80px]"
        />
        <div
          className="bph-blob-2 absolute bottom-[10%] left-[3%] w-[min(450px,50vw)] h-[min(450px,50vw)] rounded-full bg-[#2d8a80]/25 blur-[80px]"
        />
        <div
          className="bph-blob-3 absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[min(600px,60vw)] h-[min(600px,60vw)] rounded-full bg-[#2d8a80]/[0.10] blur-[100px]"
        />
      </div>

      {/* Scattered small floating dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="bph-orb-1 absolute top-[12%] left-[8%] w-1 h-1 rounded-full bg-[#2d8a80]/50" />
        <div className="bph-orb-2 absolute top-[8%] left-[35%] w-[3px] h-[3px] rounded-full bg-[#c8a55a]/40" />
        <div className="bph-orb-3 absolute top-[18%] right-[22%] w-1 h-1 rounded-full bg-white/25" />
        <div className="bph-orb-4 absolute top-[25%] right-[8%] w-[3px] h-[3px] rounded-full bg-[#2d8a80]/45" />
        <div className="bph-orb-5 absolute top-[35%] left-[5%] w-[3px] h-[3px] rounded-full bg-[#c8a55a]/35" />
        <div className="bph-orb-6 absolute top-[45%] left-[22%] w-1 h-1 rounded-full bg-white/20" />
        <div className="bph-orb-7 absolute top-[40%] right-[15%] w-[3px] h-[3px] rounded-full bg-[#2d8a80]/40" />
        <div className="bph-orb-8 absolute top-[55%] right-[30%] w-1 h-1 rounded-full bg-[#c8a55a]/30" />
        <div className="bph-orb-9 absolute top-[65%] left-[12%] w-[3px] h-[3px] rounded-full bg-[#2d8a80]/35" />
        <div className="bph-orb-10 absolute top-[60%] right-[8%] w-1 h-1 rounded-full bg-white/25" />
        <div className="bph-orb-11 absolute top-[75%] left-[30%] w-1 h-1 rounded-full bg-[#c8a55a]/40" />
        <div className="bph-orb-12 absolute top-[80%] right-[18%] w-[3px] h-[3px] rounded-full bg-[#2d8a80]/45" />
        <div className="bph-orb-13 absolute top-[85%] left-[18%] w-[3px] h-[3px] rounded-full bg-white/20" />
        <div className="bph-orb-14 absolute top-[90%] right-[35%] w-1 h-1 rounded-full bg-[#2d8a80]/30" />
      </div>

      {/* Horizontal light streaks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="bph-streak-1 absolute top-[30%] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#2d8a80]/20 to-transparent"
        />
        <div
          className="bph-streak-2 absolute top-[65%] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#c8a55a]/15 to-transparent"
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="bph-header text-center mb-12">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#c8a55a] mb-4">
            PHILOSOPHY
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            私たちの根底にある思想
          </h2>
        </div>

        {/* Main quote */}
        <div className="bph-main-quote text-center mb-16 max-w-3xl mx-auto">
          <div className="relative inline-block">
            {/* Decorative quote mark */}
            <span className="absolute -top-8 -left-4 text-6xl text-[#2d8a80]/20 font-serif leading-none">
              &ldquo;
            </span>
            <p className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl md:text-4xl font-semibold text-white leading-relaxed">
              人間は変わらない。
              <br />
              だから、
              <Link href="/knowledge" className="text-[#2d8a80] hover:text-[#3aada1] underline decoration-[#2d8a80]/40 hover:decoration-[#3aada1]/80 underline-offset-4 transition-all duration-300">環境</Link>
              を変える。
            </p>
            <span className="absolute -bottom-4 -right-4 text-6xl text-[#2d8a80]/20 font-serif leading-none">
              &rdquo;
            </span>
          </div>
          <p className="text-base text-white/50 mt-8 max-w-xl mx-auto leading-relaxed">
            人の意志や根性に頼るマネジメントは、必ず限界がくる。
            <br />
            行動科学は、人を変えるのではなく、人が自然に動く環境をデザインする学問です。
          </p>
        </div>

        {/* Principles */}
        <div className="bph-principles grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {principles.map((p, i) => (
            <div
              key={i}
              className="bph-principle p-6 rounded-2xl bg-white/[0.05] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.08]"
            >
              <p className="text-sm text-white/80 leading-relaxed mb-3 font-medium italic">
                &ldquo;{p.quote}&rdquo;
              </p>
              <p className="text-[10px] text-white/30 tracking-wide mb-4">
                {p.source}
              </p>
              <div className="w-8 h-px bg-[#2d8a80]/40 mb-3" />
              <p className="text-sm text-[#2d8a80] font-medium">
                {p.insight}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
