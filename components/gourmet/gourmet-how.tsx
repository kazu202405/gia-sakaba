"use client";

import { useEffect, useRef } from "react";
import { UserPlus, BookOpen, Share2 } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "招待を受ける",
    description:
      "既存メンバーからの紹介で参加。信頼のつながりが、コミュニティの質を守ります。",
  },
  {
    icon: BookOpen,
    number: "02",
    title: "ストーリーで出会う",
    description:
      "「なぜこれを薦めるのか」というストーリーを通じて、本当に良いものと出会えます。",
  },
  {
    icon: Share2,
    number: "03",
    title: "あなたも紹介する",
    description:
      "素敵なものを見つけたら、あなたのストーリーで紹介。信頼の輪が広がっていきます。",
  },
];

export function GourmetHow() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".how-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".how-header",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".how-step",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: ".how-grid",
            start: "top 90%",
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
    <section ref={containerRef} className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="how-header text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-6">
            使い方はシンプル
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
            3つのステップで、信頼のストーリー体験が始まります。
          </p>
        </div>

        <div className="how-grid relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Dashed connector lines (md+) */}
          <div className="hidden md:block absolute top-16 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-0 border-t-2 border-dashed border-amber-200" />

          {steps.map((step) => (
            <div key={step.number} className="how-step text-center">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 mb-6">
                <step.icon className="w-7 h-7 text-amber-600" />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-bold text-amber-600">
                  {step.number}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
