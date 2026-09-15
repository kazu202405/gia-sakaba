"use client";

import { useEffect, useRef } from "react";
import { XCircle, CheckCircle } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const conventional = [
  "匿名レビュー中心",
  "星・スコアで評価",
  "広告掲載で上位表示",
  "誰でも投稿できる",
  "お店のスペック情報が中心",
];

const gourmetCircle = [
  "実名・紹介制",
  "ストーリーで共有",
  "信頼の紹介ツリー",
  "招待されたメンバーのみ",
  "「なぜ薦めるか」が中心",
];

export function GourmetConcept() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".concept-heading",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".concept-heading",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".concept-left",
        { x: -40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".concept-compare",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".concept-right",
        { x: 40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".concept-compare",
            start: "top 85%",
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
        <div className="concept-heading text-center mb-16">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-6"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            スコアではなく、
            <br className="sm:hidden" />
            ストーリーで選ぶ
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
            GIA Storiesは、従来の情報サービスとはまったく異なるアプローチです。
          </p>
        </div>

        <div className="concept-compare grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Conventional */}
          <div className="concept-left bg-white rounded-2xl p-8 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-500 mb-6">
              従来の情報サービス
            </h3>
            <ul className="space-y-4">
              {conventional.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-500">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gourmet Circle */}
          <div className="concept-right bg-white rounded-2xl p-8 border-2 border-amber-300 shadow-sm">
            <h3 className="text-lg font-bold text-amber-700 mb-6">
              GIA Stories
            </h3>
            <ul className="space-y-4">
              {gourmetCircle.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-800">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
