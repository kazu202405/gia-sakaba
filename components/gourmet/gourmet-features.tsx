"use client";

import { useEffect, useRef } from "react";
import { GitBranch, MessageSquare, Tag, Sparkles, Shield } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: GitBranch,
    title: "紹介ツリー",
    description:
      "誰が誰を紹介したかが可視化される信頼の連鎖。情報源をたどれるから、安心して選べます。",
  },
  {
    icon: MessageSquare,
    title: "ストーリー型投稿",
    description:
      "スコアや点数ではなく、「なぜこれが好きか」をストーリーとして共有。読むだけでワクワクする。",
  },
  {
    icon: Tag,
    title: "コンテキストタグ",
    description:
      "「接待向き」「読了後に語りたい」「週末のアクティビティ」など、シーンに合わせたタグで探せます。",
  },
  {
    icon: Sparkles,
    title: "AIレコメンド",
    description:
      "あなたの好みや過去の体験から、信頼できるメンバーのおすすめを賢くマッチング。",
  },
  {
    icon: Shield,
    title: "信頼スコア",
    description:
      "投稿の質や紹介の実績に基づく信頼度。匿名ではなく、実名の信頼が積み上がっていく仕組みです。",
  },
];

export function GourmetFeatures() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".features-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".features-header",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".feature-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.05,
          scrollTrigger: {
            trigger: ".features-grid",
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
    <section ref={containerRef} className="py-24 md:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="features-header text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-6">
            5つの特徴
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
            GIA Storiesならではの機能が、新しい出会い方を実現します。
          </p>
        </div>

        <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="feature-card bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
