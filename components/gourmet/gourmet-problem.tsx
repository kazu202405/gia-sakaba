"use client";

import { useEffect, useRef } from "react";
import { Star, Eye, Megaphone } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const problems = [
  {
    icon: Star,
    title: "ランキングに惑わされる",
    description:
      "評価スコアやランキングは便利だけど、本当にあなたに合うかどうかはわからない。数字だけでは伝わらない「相性」がある。",
  },
  {
    icon: Eye,
    title: "誰が書いたかわからない",
    description:
      "匿名の口コミは参考になるようで、実は信頼しにくい。書いた人の好みも背景も見えないから。",
  },
  {
    icon: Megaphone,
    title: "アルゴリズムで上がってくる情報",
    description:
      "検索上位に表示されるのは、本当に良いもの？それとも広告費をかけた情報？その区別がつきにくい。",
  },
];

export function GourmetProblem() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".problem-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".problem-header",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".problem-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.05,
          scrollTrigger: {
            trigger: ".problem-grid",
            start: "top 95%",
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
        <div className="problem-header text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-6">
            こんな経験、ありませんか？
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
            情報があふれる時代、こんな「もやっと」がありませんか。
          </p>
        </div>

        <div className="problem-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="problem-card bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-6">
                <problem.icon className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {problem.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
