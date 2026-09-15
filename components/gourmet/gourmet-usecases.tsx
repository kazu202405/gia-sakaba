"use client";

import { useEffect, useRef } from "react";
import { Briefcase, Users, Coffee, BookOpen, Compass } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const tags = [
  "経営者と商談向き",
  "接待・会食向き",
  "一人で考え事したい時",
  "カジュアルな打ち上げ",
  "静かに語り合いたい夜",
  "大人数OK",
  "朝活モーニング",
  "個室あり",
  "読了後に語りたい一冊",
  "週末のアクティビティ",
  "大人の趣味",
  "ビジネスに効く",
];

const scenarios = [
  {
    icon: Briefcase,
    title: "大切な商談の前日",
    description:
      "「経営者と商談向き」のタグで検索。信頼できるメンバーが「ここなら間違いない」と紹介したお店で、最高の準備を。",
  },
  {
    icon: BookOpen,
    title: "次に読む一冊を探したい",
    description:
      "「読了後に語りたい一冊」「ビジネスに効く」のタグから、信頼できるメンバーが本気で薦める本と出会える。",
  },
  {
    icon: Compass,
    title: "週末の過ごし方を見つけたい",
    description:
      "「週末のアクティビティ」「大人の趣味」のタグで、経営者仲間が実際に楽しんでいる体験を発見。",
  },
];

export function GourmetUseCases() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".usecases-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".usecases-header",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".usecase-tag",
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.3,
          ease: "back.out(1.7)",
          stagger: 0.04,
          scrollTrigger: {
            trigger: ".usecases-tags",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".scenario-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: ".scenarios-grid",
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
        <div className="usecases-header text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-6">
            シーンで探せる出会い
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
            コンテキストタグで、あなたの「今の気分」にぴったりの出会いが見つかります。
          </p>
        </div>

        {/* Tag cloud */}
        <div className="usecases-tags flex flex-wrap justify-center gap-3 mb-16">
          {tags.map((tag) => (
            <span
              key={tag}
              className="usecase-tag inline-flex items-center px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Scenario cards */}
        <div className="scenarios-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          {scenarios.map((scenario) => (
            <div
              key={scenario.title}
              className="scenario-card bg-slate-50 rounded-2xl p-8 border border-gray-100"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-6">
                <scenario.icon className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {scenario.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {scenario.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
