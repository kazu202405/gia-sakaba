"use client";

import { useEffect, useRef, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import gsap from "gsap";

export interface Question {
  id: number;
  domain: string;
  domainIndex: number;
  text: string;
}

interface DiagnosticQuestionProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  currentAnswer: number | undefined;
  onAnswer: (questionId: number, score: number) => void;
  onBack: () => void;
  canGoBack: boolean;
}

const scaleLabels = [
  { value: 1, label: "全く\n当てはまらない", short: "全く" },
  { value: 2, label: "あまり\n当てはまらない", short: "あまり" },
  { value: 3, label: "どちらとも\nいえない", short: "普通" },
  { value: 4, label: "やや\n当てはまる", short: "やや" },
  { value: 5, label: "非常に\n当てはまる", short: "非常に" },
];

const domainNames = [
  "意思決定",
  "習慣設計",
  "コミュニケーション",
  "リーダーシップ",
  "モチベーション",
  "環境設計",
];

export function DiagnosticQuestion({
  question,
  currentIndex,
  totalQuestions,
  currentAnswer,
  onAnswer,
  onBack,
  canGoBack,
}: DiagnosticQuestionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevIndexRef = useRef(currentIndex);

  const animateIn = useCallback(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".dq-question-text",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
      );
      gsap.fromTo(
        ".dq-scale-btn",
        { y: 15, opacity: 0, scale: 0.9 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          stagger: 0.06,
          ease: "power2.out",
          delay: 0.15,
        }
      );
      gsap.fromTo(
        ".dq-qnum",
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }
      );
    }, containerRef);
    return ctx;
  }, []);

  useEffect(() => {
    const ctx = animateIn();
    prevIndexRef.current = currentIndex;
    return () => ctx?.revert();
  }, [currentIndex, animateIn]);

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div ref={containerRef} className="relative min-h-screen flex flex-col">
      {/* Top bar - offset for fixed header */}
      <div className="sticky top-[64px] z-40 bg-[#0a1628]/98 backdrop-blur-lg border-b border-[#2d8a80]/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {/* Progress info */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white/90">
                Q{currentIndex + 1}
              </span>
              <span className="text-xs text-white/40">
                / {totalQuestions}
              </span>
            </div>
            <span className="text-xs font-bold text-[#2d8a80] bg-[#2d8a80]/10 px-3 py-1 rounded-full">
              {question.domain}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2d8a80] to-[#3a9e93] rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(45,138,128,0.4)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Domain step indicator */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-2 w-full">
        <div className="flex gap-1.5 justify-center flex-wrap">
          {domainNames.map((name, i) => {
            const isActive = i === question.domainIndex;
            const isDone = i < question.domainIndex;
            return (
              <span
                key={name}
                className={`text-[11px] px-3 py-1.5 rounded-full transition-all duration-300 border ${
                  isActive
                    ? "bg-[#2d8a80]/20 text-[#2d8a80] font-bold border-[#2d8a80]/40"
                    : isDone
                      ? "bg-white/[0.06] text-white/50 border-white/[0.08]"
                      : "bg-transparent text-white/25 border-white/[0.04]"
                }`}
              >
                {isDone ? "\u2713 " : ""}
                {name}
              </span>
            );
          })}
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="max-w-2xl w-full">
          {/* Question number badge */}
          <div className="dq-qnum flex items-center justify-center mb-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2d8a80]/15 border border-[#2d8a80]/30 text-[#2d8a80] text-lg font-bold">
              {currentIndex + 1}
            </span>
          </div>

          <p className="dq-question-text font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl md:text-3xl font-medium text-white leading-relaxed text-center mb-12">
            {question.text}
          </p>

          {/* 5-scale buttons */}
          <div className="grid grid-cols-5 gap-2 sm:gap-4 mb-8">
            {scaleLabels.map((s) => {
              const isSelected = currentAnswer === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => onAnswer(question.id, s.value)}
                  className={`dq-scale-btn group flex flex-col items-center gap-2.5 p-3 sm:p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-[#2d8a80]/25 border-[#2d8a80] shadow-[0_0_24px_rgba(45,138,128,0.3)] scale-[1.03]"
                      : "bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.10] hover:border-white/[0.25] hover:scale-[1.02]"
                  }`}
                >
                  <span
                    className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
                      isSelected
                        ? "text-[#2d8a80]"
                        : "text-white/70 group-hover:text-white"
                    }`}
                  >
                    {s.value}
                  </span>
                  <span
                    className={`text-[9px] sm:text-[11px] leading-tight text-center whitespace-pre-line transition-colors duration-300 ${
                      isSelected
                        ? "text-[#2d8a80]/90 font-medium"
                        : "text-white/40 group-hover:text-white/60"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scale hint on mobile */}
          <div className="flex justify-between px-1 mb-6 sm:hidden">
            <span className="text-[10px] text-white/30">&#x25C0; 当てはまらない</span>
            <span className="text-[10px] text-white/30">当てはまる &#x25B6;</span>
          </div>

          {/* Back button */}
          {canGoBack && (
            <div className="text-center">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors duration-300"
              >
                <ArrowLeft className="w-4 h-4" />
                前の質問に戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
