"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Clock,
  BookOpen,
  Target,
  Lightbulb,
  GraduationCap,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────
   Data
   ───────────────────────────────────────────── */

interface WorkItem {
  title: string;
  description: string;
  duration: string;
}

interface Module {
  number: number;
  title: string;
  area: string;
  theories: string[];
  works: WorkItem[];
  caseStudy: {
    company: string;
    description: string;
    duration: string;
  };
  totalHours: string;
}

interface Phase {
  number: number;
  title: string;
  subtitle: string;
  modules: Module[];
}

const phases: Phase[] = [
  {
    number: 1,
    title: "基礎・自覚",
    subtitle: "バイアスを「知る」",
    modules: [
      {
        number: 1,
        title: "意思決定のOS書き換え",
        area: "意思決定バイアス",
        theories: [
          "二重過程理論",
          "アンカリング",
          "現状維持バイアス",
          "サンクコスト",
        ],
        works: [
          {
            title: "意思決定ジャーナル分析",
            description:
              "直近1ヶ月の重要判断5件をSystem1/2で分類し、無意識の慣性を可視化",
            duration: "60分",
          },
          {
            title: "アンカリング体験",
            description:
              "異なるアンカー値で予算見積もり → 同じ情報でも結論が変わることを体験",
            duration: "30分",
          },
          {
            title: "サンクコスト・キルスイッチ設計",
            description:
              "「過去の投資がゼロでも今から始めるか？」のフレームで既存PJを再評価",
            duration: "60分",
          },
        ],
        caseStudy: {
          company: "Kodak",
          description:
            "デジタル移行の遅れ：現状維持 × サンクコスト × 確証バイアスの複合作用",
          duration: "30分",
        },
        totalHours: "3時間",
      },
      {
        number: 2,
        title: "情報フィルターの再設計",
        area: "情報処理バイアス",
        theories: [
          "確証バイアス",
          "利用可能性ヒューリスティック",
          "集団極性化",
        ],
        works: [
          {
            title: "レッドチーム演習",
            description:
              "自社戦略に対し「失敗する理由」を徹底的に探す悪魔の代弁者ワーク",
            duration: "60分",
          },
          {
            title: "情報ソース監査",
            description:
              "情報収集ルーティンの偏りを可視化するチェックリスト",
            duration: "45分",
          },
          {
            title: "会議バイアス除去プロトコル",
            description:
              "HiPPO効果防止：サイレントブレスト、意見の匿名化、プリモーテム",
            duration: "45分",
          },
        ],
        caseStudy: {
          company: "Nokia",
          description:
            "市場データを持ちながら既存フレームで解釈し続けた事例",
          duration: "30分",
        },
        totalHours: "3時間",
      },
    ],
  },
  {
    number: 2,
    title: "応用・理解",
    subtitle: "メカニズムを「理解する」",
    modules: [
      {
        number: 3,
        title: "リスク感覚のキャリブレーション",
        area: "リスク認知",
        theories: [
          "プロスペクト理論",
          "フレーミング効果",
          "保有効果",
          "曖昧性回避",
        ],
        works: [
          {
            title: "プロスペクト理論の体感",
            description:
              "利得場面と損失場面で判断が反転する実験。自社の投資判断を再分析",
            duration: "45分",
          },
          {
            title: "フレーミング変換",
            description:
              "経営課題を損失/利得/頻度/確率の4フレームで再記述し、判断の変化を体感",
            duration: "45分",
          },
          {
            title: "ポートフォリオ思考の導入",
            description:
              "個別案件の損失回避 → 全体最適の観点で再評価",
            duration: "60分",
          },
        ],
        caseStudy: {
          company: "Amazon",
          description:
            "「Day 1」哲学：Type 1/Type 2 Decisionによるリスク判断",
          duration: "30分",
        },
        totalHours: "3時間",
      },
      {
        number: 4,
        title: "組織の行動設計",
        area: "社会的認知",
        theories: [
          "基本的帰属錯誤",
          "自己決定理論",
          "ナッジ理論",
          "心理的安全性",
          "BJ Fogg行動モデル",
        ],
        works: [
          {
            title: "帰属エラー診断",
            description:
              "「パフォーマンスが悪い人」を環境要因チェックリストで再分析。何割が「環境の問題」かを数値化",
            duration: "60分",
          },
          {
            title: "行動デザインワークショップ",
            description:
              "「社員がやらないこと」をB=MAP（動機 × 能力 × プロンプト）で分析 → 行動デザイン",
            duration: "60分",
          },
          {
            title: "心理的安全性の測定と改善",
            description:
              "Edmondsonの7指標で測定 →「低い会議/高い会議」のロールプレイ → 改善計画",
            duration: "60分",
          },
        ],
        caseStudy: {
          company: "Google",
          description:
            "Project Aristotle：最高のチームの最大因子は心理的安全性だった",
          duration: "30分",
        },
        totalHours: "3.5時間",
      },
    ],
  },
  {
    number: 3,
    title: "実装・適用",
    subtitle: "経営に「実装する」",
    modules: [
      {
        number: 5,
        title: "時間認知の矯正",
        area: "時間認知",
        theories: [
          "双曲割引",
          "現在バイアス",
          "後知恵バイアス",
          "計画の錯誤",
          "実行意図",
        ],
        works: [
          {
            title: "時間割引率の自己測定",
            description:
              "「今100万 vs 1年後120万」の閾値を探り個人の割引率を数値化",
            duration: "45分",
          },
          {
            title: "計画の錯誤対策",
            description:
              "参照クラス予測法で見積もりの系統的過小評価を補正",
            duration: "45分",
          },
          {
            title: "コミットメントデバイス設計",
            description:
              "双曲割引に対抗する「自分を縛る仕組み」（Odysseus契約）の構築",
            duration: "60分",
          },
        ],
        caseStudy: {
          company: "Intel",
          description:
            "Grove：「新CEOなら何をするか？」でDRAM撤退を決断した思考実験",
          duration: "30分",
        },
        totalHours: "3時間",
      },
      {
        number: 6,
        title: "メタ認知の実装",
        area: "メタ認知",
        theories: [
          "メタ認知",
          "過信バイアス",
          "ダニング＝クルーガー",
          "感情ラベリング",
        ],
        works: [
          {
            title: "キャリブレーション・テスト",
            description:
              "10問クイズの確信度vs正答率を比較 →「自分の確信度を何%割り引くべきか」を算出",
            duration: "45分",
          },
          {
            title: "感情ラベリング",
            description:
              "過去の意思決定時の感情を特定 → 扁桃体ハイジャック対策プロトコル設計",
            duration: "45分",
          },
          {
            title: "メタ認知システム構築",
            description:
              "意思決定日記、バイアス・チェックリスト、意思決定品質レビュー会議の設計",
            duration: "60分",
          },
        ],
        caseStudy: {
          company: "Bridgewater",
          description:
            "Ray Dalio：Radical Transparencyと信頼性加重意思決定",
          duration: "30分",
        },
        totalHours: "3時間",
      },
    ],
  },
];

const phase4 = {
  number: 4,
  title: "定着・内在化",
  subtitle: "組織に「根付かせる」",
  items: [
    "継続パートナーシップ",
    "月次1on1セッション + 経営判断レビュー",
    "四半期ごとの再診断（バイアスプロファイリング）",
    "組織全体への展開支援",
  ],
};

const phaseIcons = [Target, BookOpen, Lightbulb, GraduationCap];

/* ─────────────────────────────────────────────
   Module Card Component
   ───────────────────────────────────────────── */

function ModuleCard({
  module,
  defaultOpen,
}: {
  module: Module;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || !innerRef.current) return;

    if (isOpen) {
      const height = innerRef.current.scrollHeight;
      gsap.to(contentRef.current, {
        height,
        opacity: 1,
        duration: 0.4,
        ease: "power2.out",
      });
    } else {
      gsap.to(contentRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
      });
    }
  }, [isOpen]);

  return (
    <div className="kc-module rounded-2xl bg-white/[0.04] border border-white/[0.08] transition-colors duration-300 hover:bg-white/[0.06]">
      {/* Header (clickable) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start gap-4 p-5 sm:p-6 text-left cursor-pointer group"
        aria-expanded={isOpen}
        aria-controls={`module-content-${module.number}`}
      >
        {/* Module number badge */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#2d8a80]/15 flex items-center justify-center">
          <span className="text-sm font-bold text-[#2d8a80]">
            {String(module.number).padStart(2, "0")}
          </span>
        </div>

        {/* Title & meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70 uppercase">
              Module {String(module.number).padStart(2, "0")}
            </span>
            <span className="text-[10px] text-white/30">|</span>
            <span className="text-[10px] text-white/40">{module.area}</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white mb-2 group-hover:text-white/90">
            {module.title}
          </h4>

          {/* Theory tags */}
          <div className="flex flex-wrap gap-1.5">
            {module.theories.map((theory) => (
              <span
                key={theory}
                className="inline-block text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-[#2d8a80]/15 text-[#2d8a80] border border-[#2d8a80]/20"
              >
                {theory}
              </span>
            ))}
          </div>
        </div>

        {/* Expand/collapse + total time */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2 pt-1">
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Clock className="w-3 h-3" />
            <span>{module.totalHours}</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-white/40 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Expandable content */}
      <div
        id={`module-content-${module.number}`}
        ref={contentRef}
        className="overflow-hidden"
        style={{ height: defaultOpen ? "auto" : 0, opacity: defaultOpen ? 1 : 0 }}
        role="region"
        aria-labelledby={`module-heading-${module.number}`}
      >
        <div ref={innerRef} className="px-5 sm:px-6 pb-5 sm:pb-6">
          <div className="border-t border-white/[0.06] pt-5">
            {/* Works list */}
            <h5 className="sr-only">ワーク一覧</h5>
            <ol className="space-y-4 mb-5">
              {module.works.map((work, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[11px] font-bold text-white/50 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white/90">
                        {work.title}
                      </p>
                      <span className="flex-shrink-0 text-[11px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">
                        {work.duration}
                      </span>
                    </div>
                    <p className="text-[13px] text-white/45 leading-relaxed mt-0.5">
                      {work.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Case study */}
            <div className="rounded-xl bg-[#c8a55a]/[0.06] border border-[#c8a55a]/15 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#c8a55a]/15 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#c8a55a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-bold text-[#c8a55a]">
                      Case Study: {module.caseStudy.company}
                    </p>
                    <span className="flex-shrink-0 text-[11px] text-[#c8a55a]/50">
                      {module.caseStudy.duration}
                    </span>
                  </div>
                  <p className="text-[13px] text-white/45 leading-relaxed">
                    {module.caseStudy.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export function KnowledgeCurriculum() {
  const containerRef = useRef<HTMLDivElement>(null);
  let moduleIndex = 0;

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Section header
      gsap.fromTo(
        ".kc-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".kc-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Phase sections
      gsap.fromTo(
        ".kc-phase",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".kc-timeline",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Module cards
      gsap.fromTo(
        ".kc-module",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".kc-timeline",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // Vertical timeline line
      gsap.fromTo(
        ".kc-line",
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".kc-timeline",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // Phase 4 special card
      gsap.fromTo(
        ".kc-phase4",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".kc-phase4",
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
      className="relative overflow-hidden py-24 md:py-32 bg-[#0f1f33]"
      aria-label="カリキュラム"
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        {/* Section header */}
        <div className="kc-header text-center mb-16 md:mb-20">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#c8a55a] mb-4">
            CURRICULUM
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
            カリキュラム
          </h2>
        </div>

        {/* Timeline */}
        <div className="kc-timeline relative">
          {/* Vertical line (desktop only) */}
          <div className="kc-line hidden md:block absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-[#2d8a80] via-[#2d8a80]/40 to-[#c8a55a] origin-top" />

          {/* Phases 1-3 */}
          <div className="space-y-12 md:space-y-16">
            {phases.map((phase) => {
              const PhaseIcon = phaseIcons[phase.number - 1];
              return (
                <div key={phase.number} className="kc-phase">
                  {/* Phase heading row */}
                  <div className="flex items-start gap-4 md:gap-6 mb-6">
                    {/* Phase number badge */}
                    <div className="relative z-10 flex-shrink-0 w-[54px] h-[54px] rounded-full bg-[#2d8a80] flex items-center justify-center shadow-[0_0_20px_rgba(45,138,128,0.3)]">
                      <span className="text-lg font-bold text-white">
                        {phase.number}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <PhaseIcon className="w-4 h-4 text-[#2d8a80]" />
                        <span className="text-xs font-bold tracking-widest text-[#2d8a80] uppercase">
                          Phase {phase.number}
                        </span>
                      </div>
                      <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl font-semibold text-white">
                        {phase.title}
                        <span className="text-white/40 mx-2">--</span>
                        <span className="text-white/60">{phase.subtitle}</span>
                      </h3>
                    </div>
                  </div>

                  {/* Module cards */}
                  <div className="md:pl-[78px] space-y-4">
                    {phase.modules.map((mod) => {
                      const isFirst = moduleIndex === 0;
                      moduleIndex++;
                      return (
                        <ModuleCard
                          key={mod.number}
                          module={mod}
                          defaultOpen={isFirst}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Phase 4: Special card */}
            <div className="kc-phase kc-phase4">
              {/* Phase heading row */}
              <div className="flex items-start gap-4 md:gap-6 mb-6">
                {/* Phase 4 badge */}
                <div className="relative z-10 flex-shrink-0 w-[54px] h-[54px] rounded-full bg-[#c8a55a] flex items-center justify-center shadow-[0_0_20px_rgba(200,165,90,0.3)]">
                  <span className="text-lg font-bold text-white">
                    {phase4.number}
                  </span>
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="w-4 h-4 text-[#c8a55a]" />
                    <span className="text-xs font-bold tracking-widest text-[#c8a55a] uppercase">
                      Phase {phase4.number}
                    </span>
                  </div>
                  <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl font-semibold text-white">
                    {phase4.title}
                    <span className="text-white/40 mx-2">--</span>
                    <span className="text-white/60">{phase4.subtitle}</span>
                  </h3>
                </div>
              </div>

              {/* Phase 4 content card */}
              <div className="md:pl-[78px]">
                <div className="rounded-2xl bg-[#c8a55a]/[0.06] border-2 border-[#c8a55a]/25 p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#c8a55a]/15 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-[#c8a55a]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70 uppercase">
                        Ongoing
                      </span>
                      <p className="text-base font-bold text-white">
                        継続的パートナーシップ
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-3" role="list">
                    {phase4.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#c8a55a] mt-2" />
                        <p className="text-sm sm:text-[15px] text-white/70 leading-relaxed">
                          {item}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
