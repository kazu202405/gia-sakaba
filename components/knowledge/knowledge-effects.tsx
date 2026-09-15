"use client";

import { useState, useEffect, useRef } from "react";
import {
  Brain,
  Filter,
  AlertTriangle,
  Users,
  Clock,
  Eye,
  Zap,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { LucideIcon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

interface Effect {
  nameJa: string;
  nameEn: string;
  oneLiner: string;
  explanation: string;
  application: string;
  researcher: string;
}

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  effects: Effect[];
}

/* ─────────────────────────────────────────────
   Data
   ───────────────────────────────────────────── */

const categories: Category[] = [
  {
    id: "decision",
    label: "意思決定バイアス",
    icon: Brain,
    effects: [
      {
        nameJa: "アンカリング効果",
        nameEn: "Anchoring Effect",
        oneLiner: "最初に提示された数値が、その後の判断の基準点になる",
        explanation:
          "人間は判断をする際、最初に提示された情報（アンカー）に過度に引きずられる。価格交渉、予算見積もり、人事評価など、あらゆるビジネスシーンで無意識に作用する。",
        application:
          "価格提示では高い選択肢を最初に見せることで、中間プランの価値認知が高まる。予算策定では過去の数字がアンカーになりやすいため、ゼロベース思考が重要。",
        researcher: "Daniel Kahneman & Amos Tversky (1974)",
      },
      {
        nameJa: "現状維持バイアス",
        nameEn: "Status Quo Bias",
        oneLiner: "変化よりも現状を維持する選択肢を好む傾向",
        explanation:
          "人は変化に伴うリスクや不確実性を過大評価し、現状を維持する方向に判断が偏る。デフォルト設定の変更率が低いのはこの効果による。",
        application:
          "新サービスの導入時はオプトアウト方式にすると採用率が上がる。組織改革では「変えないリスク」を明確に示すことが有効。",
        researcher: "William Samuelson & Richard Zeckhauser (1988)",
      },
      {
        nameJa: "サンクコスト効果",
        nameEn: "Sunk Cost Fallacy",
        oneLiner: "すでに投じた回収不能なコストが将来の判断を歪める",
        explanation:
          "「ここまでやったのだから」という心理で、合理的な撤退判断ができなくなる。プロジェクト継続、設備投資、人材配置など経営判断に大きく影響。",
        application:
          "投資判断には「ゼロベース思考」を制度化する。「過去の投資がゼロでも今から始めるか？」のフレームで再評価。",
        researcher: "Hal Arkes & Catherine Blumer (1985)",
      },
      {
        nameJa: "選択のパラドックス",
        nameEn: "Paradox of Choice",
        oneLiner: "選択肢が多すぎると決断できなくなり満足度も下がる",
        explanation:
          "選択肢の増加は一定までは効用を高めるが、閾値を超えると決断疲労と後悔が増大する。ECサイトの商品数、SaaSのプラン設計に直結。",
        application:
          "料金プランは3つに絞り、推奨を明示する。メニューのカテゴリ分けで認知負荷を下げる。",
        researcher: "Barry Schwartz (2004)",
      },
    ],
  },
  {
    id: "information",
    label: "情報処理バイアス",
    icon: Filter,
    effects: [
      {
        nameJa: "確証バイアス",
        nameEn: "Confirmation Bias",
        oneLiner: "自分の仮説を支持する情報ばかり集めてしまう傾向",
        explanation:
          "既存の信念に合致する情報を優先的に探索・解釈し、矛盾する情報を無視・過小評価する。マーケットリサーチ、競合分析、人事評価で特に危険。",
        application:
          "レッドチーム演習の導入。重要な意思決定では「この判断が間違っている根拠を3つ挙げよ」を制度化する。",
        researcher: "Peter Wason (1960)",
      },
      {
        nameJa: "利用可能性ヒューリスティック",
        nameEn: "Availability Heuristic",
        oneLiner: "思い浮かびやすい事例ほど発生頻度が高いと判断する",
        explanation:
          "記憶に残りやすい鮮明な事例（最近のニュース、感情的な体験）が確率判断を歪める。リスク評価、投資判断、採用判断で系統的な誤りを生む。",
        application:
          "データに基づく意思決定プロセスの導入。「最近起きたこと」と「統計的な頻度」を分けて議論する習慣をつくる。",
        researcher: "Daniel Kahneman & Amos Tversky (1973)",
      },
      {
        nameJa: "ハロー効果",
        nameEn: "Halo Effect",
        oneLiner: "ある一面の印象が全体の評価に影響する",
        explanation:
          "容姿が良い人は能力も高いと判断する、有名大学出身者は仕事もできると思い込むなど、一つの際立った特徴が全体的な評価を方向づける。",
        application:
          "採用面接では構造化面接を導入。評価基準を事前に明確化し、各項目を独立して評価する仕組みを作る。",
        researcher: "Edward Thorndike (1920)",
      },
      {
        nameJa: "フレーミング効果",
        nameEn: "Framing Effect",
        oneLiner: "同じ内容でも伝え方（枠組み）が判断を変える",
        explanation:
          "「成功率90%」と「失敗率10%」は同じ事実だが、受ける印象が大きく異なる。情報の提示方法がそのまま意思決定に影響する。",
        application:
          "提案資料では利得フレーム（得られるもの）と損失フレーム（失うもの）を使い分ける。価格表示では割引率より節約額が効果的な場合がある。",
        researcher: "Daniel Kahneman & Amos Tversky (1981)",
      },
    ],
  },
  {
    id: "risk",
    label: "リスク認知",
    icon: AlertTriangle,
    effects: [
      {
        nameJa: "プロスペクト理論",
        nameEn: "Prospect Theory",
        oneLiner: "人は利得より損失に2倍強く反応する",
        explanation:
          "同じ金額でも、得る喜びより失う苦痛の方が約2倍大きい。利得場面ではリスク回避的に、損失場面ではリスク追求的になる。",
        application:
          "解約防止には「失うもの」を強調。新サービス導入時は無料トライアルで保有効果を生む。価格改定は段階的に。",
        researcher: "Daniel Kahneman & Amos Tversky (1979)",
      },
      {
        nameJa: "損失回避",
        nameEn: "Loss Aversion",
        oneLiner: "得ることより失うことを避けようとする基本的傾向",
        explanation:
          "人間は進化的に「失う」ことに敏感。これが現状維持バイアスの根底にあり、イノベーション阻害の主要因となる。",
        application:
          "「導入しないことによる機会損失」を数値化して提示。期限付きオファーで「今行動しないと失う」フレームを活用。",
        researcher: "Daniel Kahneman & Amos Tversky (1984)",
      },
      {
        nameJa: "保有効果",
        nameEn: "Endowment Effect",
        oneLiner: "所有しているものを実際の価値以上に評価する",
        explanation:
          "一度手にしたものを手放すことへの抵抗感。フリートライアル、サンプル配布が有効なのはこの効果による。",
        application:
          "無料トライアルの積極活用。「30日間無料」は保有効果を生み、解約時の損失回避が働く。カスタマイズ機能もこの効果を強化。",
        researcher: "Richard Thaler (1980)",
      },
      {
        nameJa: "曖昧性回避",
        nameEn: "Ambiguity Aversion",
        oneLiner: "確率が不明な状況を、確率が低い状況より嫌う",
        explanation:
          "既知のリスクより未知のリスクを避ける傾向。新市場参入、新技術導入への抵抗の根底にある。",
        application:
          "新規事業の提案では「何が分かっていて何が分からないか」を明確に。パイロットテストで不確実性を段階的に解消する設計。",
        researcher: "Daniel Ellsberg (1961)",
      },
    ],
  },
  {
    id: "social",
    label: "社会的認知",
    icon: Users,
    effects: [
      {
        nameJa: "基本的帰属錯誤",
        nameEn: "Fundamental Attribution Error",
        oneLiner:
          "他者の行動を能力や性格のせいにし、環境要因を軽視する",
        explanation:
          "部下の失敗を「能力不足」と断じるが、自分の失敗は「状況のせい」にする。組織マネジメントで最も有害なバイアスの一つ。",
        application:
          "パフォーマンス低下時は「環境要因チェックリスト」を先に確認。評価制度に環境要因の分析を組み込む。",
        researcher: "Lee Ross (1977)",
      },
      {
        nameJa: "心理的安全性",
        nameEn: "Psychological Safety",
        oneLiner:
          "チームで率直に発言・失敗できると感じられる雰囲気",
        explanation:
          "Google Project Aristotleで「最高のチームの最大因子」と判明。心理的安全性が低いと情報共有が滞り、イノベーションが阻害される。",
        application:
          "会議で「失敗から学んだこと」の共有時間を設ける。リーダーが先に弱みを見せるモデリング行動。匿名フィードバック制度の導入。",
        researcher: "Amy Edmondson (1999)",
      },
      {
        nameJa: "社会的証明",
        nameEn: "Social Proof",
        oneLiner: "他者の行動を「正しい行動」の手がかりにする",
        explanation:
          "不確実な状況で、多数派の行動に従う傾向。レビュー、導入事例、利用者数の表示が効果的なのはこの原理。",
        application:
          "「○○社も導入」「利用者数○万人」の表示。業界別・規模別の事例集。口コミ・レビューの積極活用。",
        researcher: "Robert Cialdini (1984)",
      },
      {
        nameJa: "同調圧力",
        nameEn: "Conformity Pressure",
        oneLiner: "集団の意見に合わせるために自分の意見を変える",
        explanation:
          "Aschの実験で明らかになった、明らかに間違った回答でも多数派に従う現象。組織の意思決定で「空気を読む」文化が質を低下させる。",
        application:
          "重要な会議では事前に個別意見を提出させる。匿名投票の活用。「反対意見を言う役割」を順番に割り当てる。",
        researcher: "Solomon Asch (1951)",
      },
    ],
  },
  {
    id: "time",
    label: "時間認知",
    icon: Clock,
    effects: [
      {
        nameJa: "双曲割引",
        nameEn: "Hyperbolic Discounting",
        oneLiner: "遠い将来の報酬より目前の報酬を過大評価する",
        explanation:
          "「今の1万円」と「1年後の1万2千円」で前者を選ぶが、「10年後の1万円」と「11年後の1万2千円」では後者を選ぶ。短期と長期で一貫しない時間選好。",
        application:
          "長期投資には「コミットメントデバイス」を設計。短期報酬と長期報酬の組み合わせでモチベーション設計。",
        researcher: "Richard Herrnstein (1961)",
      },
      {
        nameJa: "計画の錯誤",
        nameEn: "Planning Fallacy",
        oneLiner:
          "プロジェクトの所要時間とコストを系統的に過小評価する",
        explanation:
          "楽観バイアスと「今回は特別」という思い込みが原因。IT開発、建設、イベント企画など、あらゆるプロジェクトで発生。",
        application:
          "参照クラス予測法（類似プロジェクトの実績値を基準にする）の導入。バッファを制度的に組み込む。",
        researcher: "Daniel Kahneman & Amos Tversky (1979)",
      },
      {
        nameJa: "現在バイアス",
        nameEn: "Present Bias",
        oneLiner: "現在の出来事に重きを置き、将来の影響を割り引く",
        explanation:
          "短期的な快楽や成果を優先し、長期的な価値創造を後回しにする傾向。四半期決算の圧力がこのバイアスを強化する。",
        application:
          "長期KPIと短期KPIのバランス設計。「未来の自分への手紙」のような時間的距離を縮めるワーク。",
        researcher: "Ted O'Donoghue & Matthew Rabin (1999)",
      },
      {
        nameJa: "後知恵バイアス",
        nameEn: "Hindsight Bias",
        oneLiner:
          "結果を知った後に「最初から分かっていた」と思い込む",
        explanation:
          "結果を知ると、その結果が予測可能だったと信じる傾向。過去の成功を「実力」と過大評価し、失敗の教訓化を妨げる。",
        application:
          "意思決定ジャーナルで事前の予測を記録。振り返りでは「当時知り得た情報」のみで評価する制度を導入。",
        researcher: "Baruch Fischhoff (1975)",
      },
    ],
  },
  {
    id: "meta",
    label: "メタ認知",
    icon: Eye,
    effects: [
      {
        nameJa: "過信バイアス",
        nameEn: "Overconfidence Bias",
        oneLiner: "自分の判断の正確性を過大に見積もる",
        explanation:
          "専門家ほど陥りやすい。「90%確信がある」と言う時の実際の正答率は約70%。経営判断の楽観的偏りの主因。",
        application:
          "キャリブレーション・テストの定期実施。重要な判断では確信度を数値化し、実際の結果と比較する習慣。",
        researcher: "Albert Bandura (1977) / Philip Tetlock (2005)",
      },
      {
        nameJa: "ダニング＝クルーガー効果",
        nameEn: "Dunning-Kruger Effect",
        oneLiner:
          "能力が低いほど自分の能力を過大評価し、能力が高いほど過小評価する",
        explanation:
          "無知の無知。初心者は自分の知識の限界を知らないため自信過剰になり、熟練者は「みんなこれくらいできる」と過小評価する。",
        application:
          "スキル自己評価と客観テストの組み合わせ。360度フィードバックの導入。「知らないことを知っている」価値の共有。",
        researcher: "David Dunning & Justin Kruger (1999)",
      },
      {
        nameJa: "感情ヒューリスティック",
        nameEn: "Affect Heuristic",
        oneLiner: "感情的な反応が理性的な判断を方向づける",
        explanation:
          "ポジティブな感情を持つ対象はリスクを低く・利益を高く見積もり、ネガティブな感情の対象はその逆。投資判断、採用、パートナー選びに影響。",
        application:
          "重要な判断は感情ラベリング（今の感情を言語化）してから行う。「6秒ルール」で扁桃体ハイジャックを防ぐ。",
        researcher: "Paul Slovic (2000)",
      },
      {
        nameJa: "メタ認知能力",
        nameEn: "Metacognition",
        oneLiner:
          "自分の思考プロセスを客観的に観察・制御する能力",
        explanation:
          "「自分が何を知っていて何を知らないか」を正確に把握する力。優れた意思決定者の共通特性。訓練で向上可能。",
        application:
          "意思決定日記の習慣化。バイアス・チェックリストの活用。定期的な「判断品質レビュー会議」の設計。",
        researcher: "John Flavell (1979)",
      },
    ],
  },
  {
    id: "behavior",
    label: "行動変容",
    icon: Zap,
    effects: [
      {
        nameJa: "ナッジ理論",
        nameEn: "Nudge Theory",
        oneLiner:
          "選択の自由を保ちながら、望ましい行動を促す設計",
        explanation:
          "強制や禁止ではなく、選択肢の提示方法（チョイスアーキテクチャ）を工夫することで行動を変える。デフォルト設定、配置変更、社会的比較など。",
        application:
          "臓器提供のオプトアウト方式。カフェテリアの健康食品の配置。メールの送信前確認。年金の自動加入制度。",
        researcher: "Richard Thaler & Cass Sunstein (2008)",
      },
      {
        nameJa: "BJ Fogg行動モデル",
        nameEn: "Fogg Behavior Model",
        oneLiner: "行動 = 動機 x 能力 x きっかけ（B=MAP）",
        explanation:
          "行動が起きるには3要素が同時に閾値を超える必要がある。「やる気がない」のではなく、能力が不足しているかきっかけがないだけかもしれない。",
        application:
          "社員の行動変容は「もっと頑張れ」（動機）ではなく、手順の簡素化（能力）や通知設計（きっかけ）で解決できることが多い。",
        researcher: "BJ Fogg (2009)",
      },
      {
        nameJa: "習慣ループ",
        nameEn: "Habit Loop",
        oneLiner:
          "きっかけ → 行動 → 報酬のサイクルが習慣を形成する",
        explanation:
          "習慣は意識的な意思決定を経由しない自動的な行動パターン。既存の習慣ループを理解し、新しいループに書き換えることで行動変容が可能。",
        application:
          "既存の習慣（朝のコーヒー）にスタック（習慣スタッキング）して新行動を定着。報酬を変動させることで飽きを防ぐ。",
        researcher: "Charles Duhigg (2012) / Wendy Wood",
      },
      {
        nameJa: "実行意図",
        nameEn: "Implementation Intentions",
        oneLiner:
          "「いつ・どこで・何を」を事前に決めると行動実行率が倍増する",
        explanation:
          "「運動する」という目標意図より、「火曜と木曜の朝7時にジムで30分走る」という実行意図の方が実行率が2-3倍高い。",
        application:
          "プロジェクト計画では抽象的な目標だけでなく、具体的な行動計画（When-Where-What）を明記する。OKRに実行意図を組み込む。",
        researcher: "Peter Gollwitzer (1999)",
      },
    ],
  },
];

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export function KnowledgeEffects() {
  const [activeCategory, setActiveCategory] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  /* Scroll-triggered header animation */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".ke-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".ke-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".ke-tabs",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".ke-tabs",
            start: "top 92%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  /* Card fade-in animation on category change */
  useEffect(() => {
    if (!cardsRef.current) return;

    const cards = cardsRef.current.querySelectorAll(".ke-card");

    gsap.fromTo(
      cards,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
      }
    );
  }, [activeCategory]);

  const currentCategory = categories[activeCategory];

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden py-24 md:py-32 bg-[#0f1f33]"
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        {/* Header */}
        <div className="ke-header text-center mb-12 md:mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#c8a55a] mb-4">
            BEHAVIORAL SCIENCE DICTIONARY
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
            行動科学 効果辞典
          </h2>
        </div>

        {/* Category tabs */}
        <div
          ref={tabsRef}
          className="ke-tabs mb-12 md:mb-16 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          <nav
            className="flex gap-2 sm:gap-3 sm:flex-wrap sm:justify-center min-w-max sm:min-w-0"
            role="tablist"
            aria-label="行動科学カテゴリ"
          >
            {categories.map((cat, index) => {
              const Icon = cat.icon;
              const isActive = activeCategory === index;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${cat.id}`}
                  onClick={() => setActiveCategory(index)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                    whitespace-nowrap transition-all duration-300 cursor-pointer
                    ${
                      isActive
                        ? "bg-[#2d8a80] text-white shadow-lg shadow-[#2d8a80]/20"
                        : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white"
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Cards grid */}
        <div
          ref={cardsRef}
          id={`panel-${currentCategory.id}`}
          role="tabpanel"
          aria-label={currentCategory.label}
          className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6"
        >
          {currentCategory.effects.map((effect) => (
            <article
              key={effect.nameEn}
              className="ke-card p-6 rounded-2xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-all duration-300"
            >
              {/* Effect name */}
              <h3 className="text-lg font-bold text-white mb-0.5">
                {effect.nameJa}
              </h3>
              <p className="text-sm text-white/50 mb-3">{effect.nameEn}</p>

              {/* One-liner */}
              <p className="text-[#c8a55a] text-sm font-medium leading-relaxed mb-4">
                {effect.oneLiner}
              </p>

              {/* Explanation */}
              <p className="text-white/70 text-sm leading-relaxed mb-5">
                {effect.explanation}
              </p>

              {/* Application example */}
              <div className="border-l-2 border-[#2d8a80] pl-4 py-2 bg-[#2d8a80]/[0.06] rounded-r-lg mb-4">
                <p className="text-xs font-semibold text-[#2d8a80] mb-1.5 tracking-wide">
                  BUSINESS APPLICATION
                </p>
                <p className="text-white/60 text-sm leading-relaxed">
                  {effect.application}
                </p>
              </div>

              {/* Researcher */}
              <p className="text-xs text-white/40">{effect.researcher}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
