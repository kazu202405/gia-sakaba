"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, RotateCcw, TrendingUp, AlertTriangle, CheckCircle2, Award, Lightbulb, BarChart3 } from "lucide-react";
import gsap from "gsap";
import { DiagnosticRadar, type DomainScore } from "./diagnostic-radar";

interface DomainResult {
  label: string;
  score: number;
  angle: number;
  advice: string;
  example: string;
  evidence: string;
}

interface DiagnosticResultProps {
  domainResults: DomainResult[];
  onRetry: () => void;
}

function getLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Award;
} {
  if (score >= 80) return { label: "優秀", color: "text-emerald-400", bgColor: "bg-emerald-400/15", borderColor: "border-emerald-400/30", icon: Award };
  if (score >= 60) return { label: "良好", color: "text-[#3a9e93]", bgColor: "bg-[#2d8a80]/15", borderColor: "border-[#2d8a80]/30", icon: CheckCircle2 };
  if (score >= 40) return { label: "改善余地", color: "text-[#c8a55a]", bgColor: "bg-[#c8a55a]/15", borderColor: "border-[#c8a55a]/30", icon: TrendingUp };
  return { label: "要注意", color: "text-orange-400", bgColor: "bg-orange-400/15", borderColor: "border-orange-400/30", icon: AlertTriangle };
}

function getOverallComment(score: number): string {
  if (score >= 80)
    return "業務の整理がしっかりできています。AIやDXを入れたときに効果が出やすい土台ができている状態です。次のステップに進みましょう。";
  if (score >= 60)
    return "土台はできています。あといくつかのポイントを整理すれば、AI活用やDXがスムーズに進む状態です。スコアの低い領域から手を打ちましょう。";
  if (score >= 40)
    return "AIを入れる前に、業務の整理が先かもしれません。でも大丈夫。整理するだけで、AIなしでも改善が始まるポイントが見えてきました。";
  return "今の状態でAIを入れても、うまく活かせない可能性が高いです。でも逆に言えば、整理するだけで大きく変わる伸びしろがあります。まずは一番スコアが低い領域から。";
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return "from-emerald-500 to-emerald-400";
  if (score >= 60) return "from-[#2d8a80] to-[#3a9e93]";
  if (score >= 40) return "from-[#c8a55a] to-[#d4b46a]";
  return "from-orange-500 to-orange-400";
}

export function DiagnosticResult({ domainResults, onRetry }: DiagnosticResultProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const overallScore = Math.round(
    domainResults.reduce((sum, d) => sum + d.score, 0) / domainResults.length
  );
  const overallLevel = getLevel(overallScore);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.fromTo(
        ".dr-header",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 }
      )
        .fromTo(
          ".dr-overall",
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.7 },
          "-=0.3"
        )
        .fromTo(
          ".dr-radar",
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8 },
          "-=0.3"
        )
        .fromTo(
          ".dr-domain-card",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
          "-=0.3"
        )
        .fromTo(
          ".dr-cta",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.1"
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const radarDomains: DomainScore[] = domainResults.map((d) => ({
    label: d.label,
    score: d.score,
    angle: d.angle,
  }));

  return (
    <div ref={containerRef} className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="dr-header text-center mb-12">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            DIAGNOSTIC RESULT
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            診断結果
          </h2>
          <div className="w-12 h-[2px] bg-gradient-to-r from-[#2d8a80] to-[#c8a55a] mx-auto mt-4 mb-4" />
          <p className="text-base text-white/60">
            あなたの会社の「仕組み化度」が見えてきました
          </p>
        </div>

        {/* Overall Score */}
        <div className="dr-overall mb-14">
          <div className="max-w-md mx-auto p-8 rounded-3xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-sm text-center">
            <p className="text-sm text-white/50 mb-3 font-medium">総合スコア</p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-7xl font-bold text-white tracking-tight">
                {overallScore}
              </span>
              <span className="text-xl text-white/30 font-medium">/100</span>
            </div>
            <span
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold border ${overallLevel.bgColor} ${overallLevel.color} ${overallLevel.borderColor}`}
            >
              <overallLevel.icon className="w-4 h-4" />
              {overallLevel.label}
            </span>
            <p className="text-sm text-white/50 mt-5 leading-relaxed">
              {getOverallComment(overallScore)}
            </p>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="dr-radar mb-14">
          <div className="max-w-md mx-auto p-6 rounded-3xl bg-white/[0.04] border border-white/[0.08]">
            <h3 className="text-center text-sm font-bold text-white/70 mb-4">あなたの会社の仕組み化マップ</h3>
            <DiagnosticRadar domains={radarDomains} />
          </div>
        </div>

        {/* Domain Cards */}
        <div className="mb-4">
          <h3 className="text-center text-sm font-bold text-white/70 mb-6">各領域のくわしい結果</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
          {domainResults.map((d) => {
            const level = getLevel(d.score);
            const barColor = getScoreBarColor(d.score);
            return (
              <div
                key={d.label}
                className="dr-domain-card p-6 sm:p-7 rounded-2xl bg-white/[0.05] border border-white/[0.10] backdrop-blur-sm hover:bg-white/[0.08] transition-all duration-300"
              >
                {/* Header: domain name + badge + score */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">{d.label}</h3>
                  <span
                    className={`text-xs px-3 py-1.5 rounded-full font-bold border ${level.bgColor} ${level.color} ${level.borderColor}`}
                  >
                    {level.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-4xl font-bold text-white">
                    {d.score}
                  </span>
                  <span className="text-sm text-white/40 font-medium">/100</span>
                </div>
                {/* Score bar */}
                <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden mb-5">
                  <div
                    className={`h-full bg-gradient-to-r ${barColor} rounded-full`}
                    style={{ width: `${d.score}%` }}
                  />
                </div>

                {/* Advice */}
                <p className="text-sm text-white/60 leading-relaxed mb-5">
                  {d.advice}
                </p>

                {/* Example */}
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-[#c8a55a] shrink-0" />
                    <span className="text-xs font-bold text-[#c8a55a]">実例</span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {d.example}
                  </p>
                </div>

                {/* Evidence */}
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-[#2d8a80] shrink-0" />
                    <span className="text-xs font-bold text-[#2d8a80]">根拠</span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {d.evidence}
                  </p>
                </div>

                {/* Per-card CTA */}
                <a
                  href="https://page.line.me/131liqrt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2d8a80] hover:text-[#3a9e93] transition-colors duration-300"
                >
                  この領域をもっと深掘りする
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="dr-cta text-center">
          <div className="max-w-lg mx-auto p-8 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.03] border border-white/[0.12] backdrop-blur-sm">
            <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl font-semibold text-white mb-3">
              「で、うちは何から整理すればいい？」
            </h3>
            <p className="text-sm text-white/50 mb-8 leading-relaxed">
              診断結果をもとに、あなたの会社に合った
              <br className="hidden sm:block" />
              「最初の一手」を一緒に考えます。もちろん無料です。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="relative inline-block">
                <div className="absolute inset-0 rounded-full bg-[#06C755]/25 animate-[pulse-ring_3s_ease-out_infinite]" />
                <a
                  href="https://page.line.me/131liqrt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glow group relative inline-flex items-center gap-3 px-8 py-4 bg-[#06C755] text-white font-bold text-base rounded-full hover:bg-[#05b34c] transition-all duration-300 shadow-lg hover:shadow-[0_12px_40px_rgba(6,199,85,0.25)] hover:-translate-y-0.5"
                >
                  LINEで相談してみる
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-6 py-4 text-sm text-white/40 hover:text-white/70 transition-colors duration-300"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度診断する
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
