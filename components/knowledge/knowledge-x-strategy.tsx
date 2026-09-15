"use client";

import { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Flame,
  PenTool,
  Layers,
  UserCircle,
  CalendarClock,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { LucideIcon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

interface XItem {
  title: string;
  subtitle?: string;
  detail: string;
  evidence: string;
  action: string;
}

interface XCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  items: XItem[];
}

/* ─────────────────────────────────────────────
   Data
   ───────────────────────────────────────────── */

const xCategories: XCategory[] = [
  {
    id: "algorithm",
    label: "アルゴリズム攻略",
    icon: BarChart3,
    items: [
      {
        title: "エンゲージメント・スコアリング",
        subtitle: "Scoring Table",
        detail:
          "Xアルゴリズムは各アクションにスコアを付与してランキングする。RT（リツイート）×20、リプライ×13.5、いいね×0.5、ブックマーク×4、プロフィールクリック×12、滞在時間2分以上×10。RTとリプライが圧倒的に高い重み。",
        evidence:
          "Twitter公開ソースコード（2023年公開）のスコアリングアルゴリズムに基づく数値。エンゲージメント種別ごとの重み付けが明確化されている。",
        action:
          "RT・引用RTされやすい有益情報や議論喚起コンテンツを中心に設計。リプライを誘発する問いかけを含める。",
      },
      {
        title: "ネガティブシグナル",
        subtitle: "Negative Signals",
        detail:
          "ミュート・ブロック・「興味なし」報告・フォロー解除は大きなマイナスシグナル。外部リンク付き投稿はアルゴリズム上で明確にペナルティを受ける。連続投稿によるスパム判定もリーチを大幅に下げる。",
        evidence:
          "Twitter公開アルゴリズムでネガティブシグナルの減点係数が確認。外部リンクのペナルティは多数のA/Bテストで検証済み。",
        action:
          "外部リンクはリプライに配置。投稿間隔は最低30分以上空ける。攻撃的な表現を避け、ミュート率を下げる。",
      },
      {
        title: "エンゲージメント速度",
        subtitle: "Velocity Window",
        detail:
          "投稿後30〜60分のエンゲージメント速度がアルゴリズム評価の最重要指標。この「ゴールデンウィンドウ」で一定量のエンゲージメントを獲得すると、For Youタイムラインへの露出が大幅に拡大する。",
        evidence:
          "多数のX運用アカウントの分析データ。投稿後1時間以内のエンゲージメント率がインプレッションと強い正の相関。",
        action:
          "フォロワーのアクティブ時間に合わせて投稿。投稿直後に自らリプライやコミュニティで反応を生む。",
      },
      {
        title: "Blue認証ブースト",
        subtitle: "Blue Verification Boost",
        detail:
          "X Premium（Blue）認証アカウントはアルゴリズムスコアに約2〜4倍のブーストを受ける。リプライの優先表示、長文投稿、分析機能、広告収益分配など、リーチ拡大に直結する機能が解放される。",
        evidence:
          "Twitter公開アルゴリズムのauthor_is_blue_verifiedフラグによるスコア倍率。公式ドキュメントおよび実運用データで確認。",
        action:
          "本格運用するなら早期にBlue認証を取得。長文投稿機能を活用したスレッド代替戦略も検討。",
      },
      {
        title: "コンテンツタイプ別評価",
        subtitle: "Content Type Scoring",
        detail:
          "画像付き投稿はテキストのみの約2倍のエンゲージメント。動画は画像の1.5倍。カルーセル（複数画像）は滞在時間を伸ばしスコアアップ。投票機能はリプライ数を3〜5倍に増加させる。",
        evidence:
          "Buffer、Hootsuite等の大規模分析レポート（2023-2024）。画像・動画のエンゲージメント率はテキストのみ比で有意に高い。",
        action:
          "投稿の60%以上にビジュアル要素を含める。投票機能で双方向コミュニケーションを促進。",
      },
    ],
  },
  {
    id: "content",
    label: "コンテンツ戦略",
    icon: Flame,
    items: [
      {
        title: "5大バイラルパターン",
        subtitle: "Viral Content Types",
        detail:
          "①共感型（あるある系）②有益型（ノウハウ・Tips）③ネタ型（ユーモア・自虐）④議論型（意見・問題提起）⑤まとめ型（キュレーション・リスト）。この5パターンの組み合わせがバイラルの基本フレームワーク。",
        evidence:
          "BuzzSumo・X社内データ分析。100万インプレッション以上の投稿の85%以上がこの5パターンのいずれかに分類可能。",
        action:
          "週次コンテンツカレンダーで5パターンをバランスよく配分。自分のフォロワーに最も響くパターンをA/Bテストで特定。",
      },
      {
        title: "コンテンツアーキタイプ",
        subtitle: "Content Archetypes",
        detail:
          "①逆張り（通説の否定）②秘密の知識（業界インサイダー情報）③変革ストーリー（ビフォーアフター）④データ公開（独自調査・分析）⑤キュレーション（情報の体系的整理）。高エンゲージメント投稿はこれらのアーキタイプに沿っている。",
        evidence:
          "SNSマーケティング専門家の分析および10万件以上の高パフォーマンス投稿の傾向分析。",
        action:
          "自分の専門領域で各アーキタイプのテンプレートを作成。特に「逆張り」と「データ公開」は議論を生みやすく、アルゴリズム的にも有利。",
      },
      {
        title: "感情トリガーの設計",
        subtitle: "Emotional Triggers",
        detail:
          "怒り・不安・希望・驚き・帰属意識の5感情がシェアを駆動する。特に「怒り」と「不安」は反応速度が速くRT率が高い。一方「希望」と「帰属意識」はフォロー率に寄与する。",
        evidence:
          "ペンシルベニア大学Jonah Bergerの研究「Contagious」。高覚醒感情（怒り・不安・興奮）がシェアを促進することが実験で確認。",
        action:
          "投稿の冒頭で感情を喚起する一文を入れる。ただし怒りの多用はフォロワー離脱リスク。希望・有益で信頼を構築しつつ、適度に議論を混ぜる。",
      },
      {
        title: "コンテンツミックス比率",
        subtitle: "Content Mix Ratio",
        detail:
          "推奨比率: 有益コンテンツ40% / 共感・ストーリー25% / 議論・意見20% / プロモーション10% / ネタ5%。フォロワー規模のフェーズによって比率を調整。初期は有益寄り、成長期は議論・意見を増やす。",
        evidence:
          "Gary Vaynerchukの「Jab, Jab, Jab, Right Hook」理論。価値提供:販促の比率を3:1以上に保つことで長期的な信頼を構築。",
        action:
          "月次でコンテンツ比率をトラッキング。プロモーション過多にならないよう、Googleスプレッドシート等で管理。",
      },
    ],
  },
  {
    id: "hooks",
    label: "フック＆ライティング",
    icon: PenTool,
    items: [
      {
        title: "衝撃系フック",
        subtitle: "Shock Hooks",
        detail:
          "「知らないと損する〇〇」「〇〇は今すぐやめてください」「99%の人が間違えている〇〇」。読者の常識を覆す冒頭文で、スクロールを止めさせる。数字を含むと効果が約30%向上。",
        evidence:
          "Copyblogger・Hubspotの見出し分析。数字入り見出しはCTR（クリックスルー率）が36%高いというデータ。",
        action:
          "フックテンプレート集を作成し、投稿前に必ず冒頭文を3パターン作って最強を選ぶ。",
      },
      {
        title: "共感系フック",
        subtitle: "Empathy Hooks",
        detail:
          "「〇〇で悩んでいませんか？」「実は私も〇〇でした」「〇〇あるあるまとめ」。ターゲットの課題に寄り添う冒頭文は保存率・リプライ率が高い。自己開示を含むと信頼が生まれる。",
        evidence:
          "Brené Brownの脆弱性研究。自己開示は対人信頼を41%向上させるというUCLA研究結果。",
        action:
          "ペルソナの「3大悩み」をリストアップし、それぞれに対応する共感フックを用意しておく。",
      },
      {
        title: "実績・権威系フック",
        subtitle: "Authority Hooks",
        detail:
          "「〇〇を3年やった結論」「フォロワー1万人になって分かったこと」「年商○億の社長に聞いた〇〇」。具体的な数字と実績で権威性を示す。ただし誇張は逆効果。",
        evidence:
          "Cialdiniの影響力の武器「権威」原則。専門性の提示がメッセージの受容率を向上させることが実験で確認。",
        action:
          "自分の実績を数値化しておく（年数、実績数、成果等）。定期的にアップデートし、フック素材として活用。",
      },
      {
        title: "文字数最適化",
        subtitle: "Character Optimization",
        detail:
          "単独投稿の最適文字数は100〜140文字（日本語）。280文字以上は読了率が下がる。一文は40文字以内。改行を積極的に活用し、視認性を確保。箇条書きは認知負荷を下げる。",
        evidence:
          "Buddy Media調査: 100文字以内のツイートは17%高いエンゲージメント率。日本語投稿の分析でも同様の傾向。",
        action:
          "投稿は「一息で読める長さ」を意識。長い内容はスレッドに分割。投稿前に声に出して読み、冗長な部分を削る。",
      },
      {
        title: "パワーワード集",
        subtitle: "Power Words",
        detail:
          "「無料」「限定」「保存版」「完全ガイド」「裏技」「禁断」「最強」「神」。これらのパワーワードは注意を引く力が強い。ただし乱用するとスパム感が出るため、月に2-3回程度に留める。",
        evidence:
          "CoSchedule Headline Analyzerの100万件以上の見出し分析データ。パワーワードを含む見出しはCTRが平均12%向上。",
        action:
          "パワーワードリストを手元に用意。投稿のタイトルや冒頭に自然に組み込む。ただし内容の質が伴わないパワーワードは信頼を損なう。",
      },
    ],
  },
  {
    id: "threads",
    label: "スレッド設計",
    icon: Layers,
    items: [
      {
        title: "How-toスレッド",
        subtitle: "How-to Thread Template",
        detail:
          "1ツイート目: 問題提起＋「〇〇の方法を解説します」→ 各ステップを1ツイート1項目で解説 → 最後に要約＋CTA。手順系は保存率が高く、最もシェアされやすいスレッド形式。",
        evidence:
          "Typefully社の100万スレッド分析。How-to形式は平均エンゲージメント率が他形式の1.8倍。",
        action:
          "自分の専門領域で「〇〇のやり方」をリスト化。週1本のHow-toスレッドを習慣化。",
      },
      {
        title: "リスト型スレッド",
        subtitle: "List Thread Template",
        detail:
          "「〇〇な人の特徴7選」「おすすめツール10選」「知らないと損する○つの法則」。各項目を1ツイートで簡潔に。奇数より偶数のリストが好まれる傾向（7、10が特に効果的）。",
        evidence:
          "BuzzFeedの分析。リスト型コンテンツは他形式よりソーシャルシェア数が平均2倍。特に10項目リストが最高パフォーマンス。",
        action:
          "日常的に「〇〇選」のネタをメモ帳に蓄積。月2本のリスト型スレッドを目標に。",
      },
      {
        title: "ストーリー型スレッド",
        subtitle: "Story Thread Template",
        detail:
          "導入（状況設定）→ 葛藤（課題・困難）→ 転機（発見・気づき）→ 結末（結果・学び）→ CTA。物語構造は人間の脳に最も深く刻まれる情報伝達形式。",
        evidence:
          "Paul Zakのオキシトシン研究。物語形式は情報の記憶率を65-70%向上させ、行動喚起率が22倍に。",
        action:
          "自分の成功・失敗体験をストーリーテンプレートに当てはめてストック。月1本の「体験談スレッド」を投稿。",
      },
      {
        title: "スレッド基本ルール",
        subtitle: "Thread Fundamentals",
        detail:
          "①1ツイート目（フック）が最重要: ここでスレッド全体の成否が決まる。②最適な長さは5-10ツイート。③各ツイートは単独でも価値がある内容に。④最後のツイートにCTAを含める。⑤途中に画像を1-2枚入れると離脱率が下がる。",
        evidence:
          "Shield App分析。5-10ツイートのスレッドが最高のエンゲージメント/ツイート比率を達成。15ツイート以上は離脱率が急増。",
        action:
          "スレッド公開前チェックリスト: ①フックの強さ ②各ツイートの独立価値 ③視覚要素 ④CTA ⑤長さ。",
      },
    ],
  },
  {
    id: "profile",
    label: "プロフィール最適化",
    icon: UserCircle,
    items: [
      {
        title: "バイオ公式3パターン",
        subtitle: "Bio Formulas",
        detail:
          "①実績型:「〇〇実績 / △△専門 / □□発信中」②ベネフィット型:「〇〇な人に向けて△△を発信」③ストーリー型:「元〇〇 → △△を経て → 現在□□」。160文字以内で「何者か」「何を得られるか」を明確に伝える。",
        evidence:
          "HubSpot調査。明確なバリュープロポジションを含むバイオはフォロー率が47%向上。具体的な数字を含むと更に23%向上。",
        action:
          "3パターンすべて作成し、A/Bテスト。2週間ごとにフォロー率を比較して最適化。",
      },
      {
        title: "表示名・ユーザー名の最適化",
        subtitle: "Name Optimization",
        detail:
          "表示名: 本名 or ブランド名 + 肩書き or キーワード（例:「田中太郎｜行動科学マーケター」）。ユーザー名: シンプルで覚えやすい、アンダースコアや数字は最小限。検索されやすい名前が有利。",
        evidence:
          "X検索アルゴリズムは表示名とユーザー名をインデックス対象とする。キーワードを含む表示名は検索流入が約30%増加。",
        action:
          "表示名に専門領域のキーワードを含める。ユーザー名は全プラットフォームで統一。",
      },
      {
        title: "ヘッダー画像・固定ツイート",
        subtitle: "Header & Pinned Tweet",
        detail:
          "ヘッダー画像: 提供価値や実績を視覚的に伝えるバナー。固定ツイート: 自己紹介スレッド or 最高パフォーマンス投稿 or リードマグネット（無料配布物）。この2要素がプロフィール訪問者のフォロー判断を大きく左右する。",
        evidence:
          "SocialBee分析。最適化されたヘッダー画像はプロフィール滞在時間を35%延長。固定ツイートの変更でフォロー率が最大60%変動。",
        action:
          "月1回ヘッダー画像を更新。固定ツイートは2週間ごとに最高パフォーマンスの投稿と差し替え。",
      },
      {
        title: "プロフィール最適化チェックリスト",
        subtitle: "Profile Checklist",
        detail:
          "□ プロフ画像は顔がはっきり見える（ブランドロゴも可） □ バイオに具体的な数字・実績 □ バイオにCTA（「フォローで〇〇」） □ リンクは最も誘導したいページ □ 位置情報の設定 □ カテゴリの設定 □ ハイライト機能の活用",
        evidence:
          "Sprout Social調査。プロフィール要素が完全に最適化されたアカウントは、未最適化比でフォロー率が3.2倍。",
        action:
          "月初にチェックリストを実行。各項目を5段階評価し、最も低い項目から改善。",
      },
    ],
  },
  {
    id: "timing",
    label: "投稿タイミング＆運用",
    icon: CalendarClock,
    items: [
      {
        title: "平日ゴールデンタイム",
        subtitle: "Weekday Schedule",
        detail:
          "朝7:00-8:30（通勤タイム・情報収集）、昼12:00-13:00（ランチタイム）、夜20:00-22:00（リラックスタイム）。特に朝7:30と夜21:00がインプレッション最大化の最適タイミング。業界・ターゲットにより±1時間の調整を推奨。",
        evidence:
          "Sprout Social 2024グローバルレポート。日本市場のデータではSocial Dogの100万アカウント分析で同様のピーク確認。",
        action:
          "3つのゴールデンタイムに合わせて予約投稿。最低1日2投稿（朝+夜）を基本リズムに。",
      },
      {
        title: "曜日別戦略",
        subtitle: "Day-of-Week Strategy",
        detail:
          "月曜: 週始めの意気込み・目標系。火-木: 専門知識・How-to・データ系（最もエンゲージメントが高い）。金曜: まとめ・振り返り系。土曜: 軽めのネタ・パーソナル系。日曜: 翌週の予告・マインドセット系。",
        evidence:
          "CoSchedule 2024分析。火・水・木の投稿が平均15-20%高いエンゲージメント率を記録。週末は全体的にリーチが低下。",
        action:
          "曜日別テーマを固定し、コンテンツカレンダーを週単位で作成。ルーティン化で制作負荷を軽減。",
      },
      {
        title: "フェーズ別投稿頻度",
        subtitle: "Phase-Based Frequency",
        detail:
          "立ち上げ期（0-1K）: 1日3-5投稿＋積極的なリプライ。成長期（1K-10K）: 1日2-3投稿＋スレッド週2本。安定期（10K+）: 1日1-2投稿＋質重視。どのフェーズでもリプライ返信は全投稿の50%以上の時間を割く。",
        evidence:
          "Hootsuite分析。投稿頻度とフォロワー成長率の相関。立ち上げ期は量が質より重要、10K以降は質が量に勝る傾向。",
        action:
          "現在のフェーズを確認し、適切な投稿頻度を設定。量を出す時期と質を高める時期を意識的に切り替える。",
      },
      {
        title: "季節イベント・トレンド活用",
        subtitle: "Seasonal & Trend Strategy",
        detail:
          "年始（目標設定）、年度始め（新生活）、GW前、夏休み前、年末（振り返り）の5大タイミングでフォロワーが急増しやすい。トレンドトピックの早期便乗（発生後2時間以内）でインプレッションが通常の5-10倍に。",
        evidence:
          "Twitter Japan公式レポート。季節イベント関連投稿は通常投稿比で平均3倍のインプレッション。トレンド便乗の早期参入者は遅延参入者の8倍のリーチ。",
        action:
          "年間イベントカレンダーを作成し、2週間前から準備。トレンド検知ツール（TweetDeck等）で常時モニタリング。",
      },
    ],
  },
];

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export function KnowledgeXStrategy() {
  const [activeCategory, setActiveCategory] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  /* Scroll-triggered header animation */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".kx-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".kx-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".kx-tabs",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".kx-tabs",
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

    const cards = cardsRef.current.querySelectorAll(".kx-card");

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

  const currentCategory = xCategories[activeCategory];

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
        <div className="kx-header text-center mb-12 md:mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#c8a55a] mb-4">
            X (TWITTER) STRATEGY DICTIONARY
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
            X（Twitter）攻略辞典
          </h2>
        </div>

        {/* Category tabs */}
        <div className="kx-tabs mb-12 md:mb-16 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav
            className="flex gap-2 sm:gap-3 sm:flex-wrap sm:justify-center min-w-max sm:min-w-0"
            role="tablist"
            aria-label="X攻略カテゴリ"
          >
            {xCategories.map((cat, index) => {
              const Icon = cat.icon;
              const isActive = activeCategory === index;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-x-${cat.id}`}
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
          id={`panel-x-${currentCategory.id}`}
          role="tabpanel"
          aria-label={currentCategory.label}
          className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6"
        >
          {currentCategory.items.map((item) => (
            <article
              key={item.title}
              className="kx-card p-6 rounded-2xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-all duration-300"
            >
              {/* Item name */}
              <h3 className="text-lg font-bold text-white mb-0.5">
                {item.title}
              </h3>
              {item.subtitle && (
                <p className="text-sm text-white/50 mb-3">{item.subtitle}</p>
              )}

              {/* Detail */}
              <p className="text-white/70 text-sm leading-relaxed mb-5">
                {item.detail}
              </p>

              {/* Evidence */}
              <div className="border-l-2 border-[#c8a55a] pl-4 py-2 bg-[#c8a55a]/[0.06] rounded-r-lg mb-4">
                <p className="text-xs font-semibold text-[#c8a55a] mb-1.5 tracking-wide">
                  DATA / EVIDENCE
                </p>
                <p className="text-white/60 text-sm leading-relaxed">
                  {item.evidence}
                </p>
              </div>

              {/* Action */}
              <div className="border-l-2 border-[#2d8a80] pl-4 py-2 bg-[#2d8a80]/[0.06] rounded-r-lg">
                <p className="text-xs font-semibold text-[#2d8a80] mb-1.5 tracking-wide">
                  ACTION
                </p>
                <p className="text-white/60 text-sm leading-relaxed">
                  {item.action}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
