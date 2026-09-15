"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DiagnosticIntro } from "./diagnostic-intro";
import { DiagnosticQuestion, type Question } from "./diagnostic-question";
import { DiagnosticResult } from "./diagnostic-result";

// ── Question Data ──────────────────────────────────

const DOMAINS = [
  "業務フローの整理度",
  "情報の見える化",
  "属人化の度合い",
  "デジタル活用度",
  "意思決定の仕組み",
  "仕組み化の成熟度",
] as const;

const DOMAIN_ANGLES = [0, 60, 120, 180, 240, 300];

const QUESTIONS: Question[] = [
  // Domain 0: 業務フローの整理度
  { id: 1, domain: "業務フローの整理度", domainIndex: 0, text: "今の業務が「誰が・何を・どの順番で」やっているか、紙やツールで整理されていますか？" },
  { id: 2, domain: "業務フローの整理度", domainIndex: 0, text: "新しい人が入ったとき、業務の流れを見ればすぐに仕事を覚えられる状態ですか？" },
  { id: 3, domain: "業務フローの整理度", domainIndex: 0, text: "「なぜこのやり方なのか」を聞かれたとき、ちゃんと説明できますか？それとも「昔からこうだから」で止まっていますか？" },
  // Domain 1: 情報の見える化
  { id: 4, domain: "情報の見える化", domainIndex: 1, text: "売上・案件数・対応状況などの数字が、リアルタイムで誰でも見れる状態になっていますか？" },
  { id: 5, domain: "情報の見える化", domainIndex: 1, text: "「あの件、どうなってる？」と毎回聞かなくても、進捗が自然とわかる仕組みがありますか？" },
  { id: 6, domain: "情報の見える化", domainIndex: 1, text: "顧客情報や案件の履歴が、個人のメモやメールではなく、チームで共有されていますか？" },
  // Domain 2: 属人化の度合い（逆スコア）
  { id: 7, domain: "属人化の度合い", domainIndex: 2, text: "特定の人が休んだとき、その人の仕事を他のメンバーがすぐに引き継げますか？" },
  { id: 8, domain: "属人化の度合い", domainIndex: 2, text: "「あの人に聞かないとわからない」という業務が、3つ以上ありませんか？" },
  { id: 9, domain: "属人化の度合い", domainIndex: 2, text: "社長や特定のキーパーソンが抜けても、会社の業務は回りますか？" },
  // Domain 3: デジタル活用度
  { id: 10, domain: "デジタル活用度", domainIndex: 3, text: "紙の書類やFAXが、日常業務でまだ中心的に使われていませんか？" },
  { id: 11, domain: "デジタル活用度", domainIndex: 3, text: "スプレッドシートやクラウドツールを使って、情報を整理・共有できていますか？" },
  { id: 12, domain: "デジタル活用度", domainIndex: 3, text: "「手作業でやっているけど、本当は自動化できそう」と感じている業務はありませんか？" },
  // Domain 4: 意思決定の仕組み
  { id: 13, domain: "意思決定の仕組み", domainIndex: 4, text: "大事な判断をするとき、「なんとなく」ではなく、数字や事実をもとに決めていますか？" },
  { id: 14, domain: "意思決定の仕組み", domainIndex: 4, text: "「誰がどう決めるか」のルールが明確で、メンバー全員がそれを理解していますか？" },
  { id: 15, domain: "意思決定の仕組み", domainIndex: 4, text: "現場の判断に迷ったとき、「何を基準に判断すべきか」に立ち返れる仕組みがありますか？" },
  // Domain 5: 仕組み化の成熟度
  { id: 16, domain: "仕組み化の成熟度", domainIndex: 5, text: "新しく始めたルールや仕組みが、3ヶ月後もちゃんと続いていますか？" },
  { id: 17, domain: "仕組み化の成熟度", domainIndex: 5, text: "業務改善のアイデアが出たとき、「仕組み」に落とし込む流れがありますか？それとも掛け声だけで終わりますか？" },
  { id: 18, domain: "仕組み化の成熟度", domainIndex: 5, text: "「やるべきこと」と「やらなくていいこと」が明確に区別され、ムダな業務が減らせていますか？" },
];

// ── Domain Advice ──────────────────────────────────

interface DomainAdviceLevel {
  advice: string;
  example: string;
  evidence: string;
}

const DOMAIN_ADVICE: Record<string, { high: DomainAdviceLevel; mid: DomainAdviceLevel; low: DomainAdviceLevel }> = {
  "業務フローの整理度": {
    high: {
      advice: "業務フローがしっかり整理されています。この状態なら、AIやツールを入れたときに効果が出やすい土台ができています。",
      example: "ある飲食専門の不動産会社では、業務フローを可視化したことで、紙ベースだった査定業務をシステム化。作業時間を大幅に短縮し、新規事業の立ち上げにリソースを回せるようになりました。",
      evidence: "業務プロセスが可視化されている企業は、そうでない企業と比較してDX施策の成功率が約3倍高いという調査結果があります。",
    },
    mid: {
      advice: "ある程度は整理されていますが、「暗黙のルール」がまだ残っていそうです。まずは一番複雑な業務から、流れを書き出してみましょう。",
      example: "ある補助金申請会社では、スプレッドシートに散らばっていた情報を一元管理しただけで、申請業務の効率が大きく改善。AIによる計画書の下書き自動生成にもつなげられました。",
      evidence: "マッキンゼーの調査によると、業務の可視化だけで平均20〜30%の効率改善が見込めるとされています。",
    },
    low: {
      advice: "業務フローが「人の頭の中」にしかない状態です。AIの前に、まず「今の仕事の流れ」を紙に書き出すところから始めましょう。それだけで改善ポイントが見えてきます。",
      example: "ある高圧電気工事会社では、煩雑だった事務作業を整理し、経営数字の見える化と役割設計を実施。社長不在でも回る体制を構築できました。",
      evidence: "業務フローが未整理の企業では、従業員が業務時間の約30%を「情報を探す」ことに費やしているというデータがあります。",
    },
  },
  "情報の見える化": {
    high: {
      advice: "情報がきちんと見える化されています。次のステップとして、そのデータを使った判断の自動化やアラート設定に進めます。",
      example: "ある省エネコンサルティング会社では、バラバラだった顧客・営業データを統合し、ダッシュボードで経営数字がリアルタイムに見える状態を構築。営業育成も仕組み化できました。",
      evidence: "データドリブンな意思決定を行う企業は、そうでない企業に比べて生産性が5〜6%高いことがMITの研究で明らかになっています。",
    },
    mid: {
      advice: "一部の情報は共有されていますが、「聞かないとわからない」がまだ残っていませんか？まずは一番よく聞かれる情報をダッシュボード化してみましょう。",
      example: "ある企業では、週次ミーティングの報告をスプレッドシートのダッシュボードに置き換えただけで、会議時間が半減。「報告のための報告」がなくなりました。",
      evidence: "ガートナーの調査によると、必要な情報にすぐアクセスできる環境を整えるだけで、意思決定のスピードが約2倍になるとされています。",
    },
    low: {
      advice: "情報が個人のメモやメールに散在している状態です。まずは顧客情報か案件情報、どちらか1つをチームで共有する仕組みを作るところから始めましょう。",
      example: "ある企業では、営業案件をスプレッドシート1枚にまとめただけで、「あの案件どうなった？」の確認が激減。それだけで週に数時間の業務時間が浮きました。",
      evidence: "情報のサイロ化は、企業の生産性を年間で平均20〜25%低下させるとフォレスターの調査で報告されています。",
    },
  },
  "属人化の度合い": {
    high: {
      advice: "属人化が少なく、チームで業務が回せる状態です。この強みを活かして、さらに効率化やAI活用を進められるフェーズです。",
      example: "ある公共工事会社では、経営者が業務フローに入らなくてもよい仕組みを構築。在宅スタッフのみで業務が回る体制を実現し、事業拡大の準備に入れました。",
      evidence: "組織の知識が個人ではなくチームに蓄積されている企業は、従業員の離職による業務影響が約70%軽減されるという研究があります。",
    },
    mid: {
      advice: "一部の業務で属人化が進んでいます。「あの人がいないと回らない」業務をリストアップし、引き継ぎ可能な手順書を1つずつ作りましょう。",
      example: "ある企業では、ベテラン社員の「頭の中のノウハウ」を3ヶ月かけてマニュアル化。その結果、新人の戦力化が2ヶ月早まり、ベテランも新しい業務に集中できるようになりました。",
      evidence: "属人化した業務は、担当者が離職したとき平均して3〜6ヶ月の業務停滞を引き起こすとされています。",
    },
    low: {
      advice: "業務が特定の人に集中しています。人が抜けるたびに同じ問題が繰り返される状態です。まずは最も属人化している業務を1つ選び、手順を書き出すところから始めましょう。",
      example: "ある企業では、社長にしかできなかった見積もり業務の判断基準を明文化。3つのルールを決めただけで、他のメンバーでも8割の見積もりが作れるようになりました。",
      evidence: "中小企業庁の調査によると、事業承継の最大の障壁は「経営者の頭の中にしかないノウハウの引き継ぎ」であり、属人化の解消が経営の持続性に直結します。",
    },
  },
  "デジタル活用度": {
    high: {
      advice: "デジタルツールをうまく活用できています。次はAI連携や自動化で、さらに業務を効率化するフェーズに進めます。",
      example: "ある美容用品商社では、定型業務にAIを導入して工数を削減。空いたリソースでブランド発信を強化し、運用しやすい体制を構築しました。",
      evidence: "デジタルツールを効果的に活用している中小企業は、そうでない企業と比較して売上成長率が約2倍高いという調査があります。",
    },
    mid: {
      advice: "ツールは入っていますが、まだ「一部の人だけが使っている」状態かもしれません。全員が自然に使える仕組みを整えると、効果が大きく変わります。",
      example: "ある企業では、導入したツールの使い方を「朝礼で1分だけ共有」する習慣を作ったところ、3ヶ月後の利用率が2倍に。大事なのは導入ではなく定着です。",
      evidence: "導入したITツールの約70%が、定着支援不足で十分に活用されていないというガートナーの調査結果があります。",
    },
    low: {
      advice: "紙や手作業中心の業務が多い状態です。ただし、いきなりAIを入れる必要はありません。まずはスプレッドシート1枚で情報を整理するだけでも、かなり変わります。",
      example: "ある建設会社では、紙で管理していた工事案件をGoogleスプレッドシートに移しただけで、現場と事務所の情報共有がリアルタイムに。追加コストゼロで改善が始まりました。",
      evidence: "総務省の調査によると、中小企業のデジタル化は「高度なツール」より「身近なツールの活用」から始めた方が成功率が約3倍高いとされています。",
    },
  },
  "意思決定の仕組み": {
    high: {
      advice: "判断の仕組みがしっかりできています。データに基づいた意思決定が根付いている状態なので、AI活用で判断の精度やスピードをさらに上げられます。",
      example: "ある製造業では、チェックリスト型の判断プロセスを導入したことで、会議時間が30%短縮。「誰が見ても同じ判断になる」仕組みが、スピードと精度の両方を上げました。",
      evidence: "ノーベル経済学賞のカーネマン教授の研究によると、構造化された判断プロセスを使うだけで、誤った判断が最大40%減少するとされています。",
    },
    mid: {
      advice: "判断の仕組みはありますが、「結局、社長が決める」になりがちかもしれません。判断基準を3つだけ明文化するところから始めてみましょう。",
      example: "ある企業では月1回「判断の振り返り会」を始めたところ、同じミスの再発が半減。「あのとき、なぜその判断をしたか」を振り返るだけで、次の判断の質が上がりました。",
      evidence: "心理学者ゲイリー・クラインの「プレモーテム」手法では、判断の前に「もし失敗したらその原因は？」と考えるだけで、判断精度が30%向上するとされています。",
    },
    low: {
      advice: "判断が「あの人次第」になっていませんか？まずは「何を基準に決めるか」を紙に書き出すところから。それだけで判断のブレが減り、業務のスピードが上がります。",
      example: "ある小売業では、判断基準を3つだけ明文化したことで、店長不在時の「判断待ち」がほぼゼロに。現場スタッフが自信を持って動けるようになりました。",
      evidence: "コロンビア大学のアイエンガー教授の研究では、判断基準が明確なほど意思決定のスピードと満足度が向上し、「決められない」ストレスが大幅に減ることがわかっています。",
    },
  },
  "仕組み化の成熟度": {
    high: {
      advice: "一度決めたことがちゃんと続く組織です。この仕組みを「見える化」して共有できれば、さらにスケールアップが可能です。",
      example: "ある企業では業務チェックリストを全員で共有した結果、新人の戦力化が2ヶ月早まりました。「暗黙の型」を形にするだけで、引き継ぎの質が大きく変わります。",
      evidence: "MIT習慣研究ラボの研究では、習慣のループ（きっかけ→行動→報酬）を可視化すると、定着率が飛躍的に向上することがわかっています。",
    },
    mid: {
      advice: "新しいルールは作るけど、気づいたら元通り…ということはありませんか？「いつ・何をきっかけに・何をする」を具体的に決めると定着しやすくなります。",
      example: "ある企業では「毎朝5分の振り返り」を既存の朝礼にくっつけたところ、3ヶ月後も95%が継続。新しい行動は、すでにやっていることに「ついでに」乗せるのがコツです。",
      evidence: "スタンフォード大学のBJ・フォッグ教授の行動デザイン研究では、既存の習慣に新しい行動を紐づけると、定着率が約3倍になることが実証されています。",
    },
    low: {
      advice: "「やろう！」と決めたことが続かない傾向があります。まずは1つだけ、毎日の業務に組み込める小さな改善から試してみましょう。",
      example: "ある企業では、週に1つだけ「これだけはやる」を決めるルールを導入。半年後には業務効率が20%改善し、「続いた」という成功体験がチームの自信になりました。",
      evidence: "行動科学の「小さな習慣」理論では、小さな改善の積み重ねは複利のように成果を生むとされています。毎日1%の改善で、1年後には37倍の差になる計算です。",
    },
  },
};

function getAdviceLevel(domain: string, score: number): DomainAdviceLevel {
  const advice = DOMAIN_ADVICE[domain];
  if (!advice) return { advice: "", example: "", evidence: "" };
  if (score >= 70) return advice.high;
  if (score >= 45) return advice.mid;
  return advice.low;
}

// ── State Types ────────────────────────────────────

type Phase = "intro" | "questions" | "result";

// ── Component ──────────────────────────────────────

export function DiagnosticApp() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  // HPのCTAから ?start=true で遷移してきた場合、イントロをスキップ
  useEffect(() => {
    if (searchParams.get("start") === "true") {
      setPhase("questions");
    }
  }, [searchParams]);

  const handleStart = useCallback(() => {
    setPhase("questions");
    setCurrentQuestionIndex(0);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleAnswer = useCallback(
    (questionId: number, score: number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: score }));

      // Auto-advance after a short delay
      setTimeout(() => {
        if (currentQuestionIndex < QUESTIONS.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setPhase("result");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 300);
    },
    [currentQuestionIndex]
  );

  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  const handleRetry = useCallback(() => {
    setPhase("intro");
    setCurrentQuestionIndex(0);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Calculate domain results
  const calculateResults = () => {
    return DOMAINS.map((domain, i) => {
      const domainQuestions = QUESTIONS.filter((q) => q.domainIndex === i);
      const domainAnswers = domainQuestions.map((q) => answers[q.id] || 3);
      const average = domainAnswers.reduce((a, b) => a + b, 0) / domainAnswers.length;
      const score = Math.round(average * 20);

      const adviceLevel = getAdviceLevel(domain, score);
      return {
        label: domain,
        score,
        angle: DOMAIN_ANGLES[i],
        advice: adviceLevel.advice,
        example: adviceLevel.example,
        evidence: adviceLevel.evidence,
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1f33]">
      {phase === "intro" && <DiagnosticIntro onStart={handleStart} />}

      {phase === "questions" && (
        <DiagnosticQuestion
          question={QUESTIONS[currentQuestionIndex]}
          currentIndex={currentQuestionIndex}
          totalQuestions={QUESTIONS.length}
          currentAnswer={answers[QUESTIONS[currentQuestionIndex].id]}
          onAnswer={handleAnswer}
          onBack={handleBack}
          canGoBack={currentQuestionIndex > 0}
        />
      )}

      {phase === "result" && (
        <DiagnosticResult
          domainResults={calculateResults()}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
