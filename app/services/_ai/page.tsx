import type { Metadata } from "next";
import Link from "next/link";
import { EdlRevealObserver } from "@/components/ui/edl-reveal";
import {
  startAiCloneAssistant,
  startAiClonePartner,
} from "./_actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "右腕AI | 紹介を仕組みにする、経営の右腕AI | GIA",
  description:
    "「たまに来る紹介」を「いつも来る仕組み」へ。会話・案件・判断・売上を学習した右腕AIが、社長の判断軸とGIAの紹介ノウハウで動き、商談前準備・紹介の種拾い・振り返りまでを毎日の仕組みに。経営の正本と日々の蓄積を AI が読み書きしながら育てる、本格装備の経営判断AI。",
  alternates: {
    canonical: "/services/ai",
  },
};

const pains = [
  {
    n: "PAIN 01",
    title: "会議の準備に、追われ続けている",
    body: "本論前の前提確認で時間が溶ける。担当者への資料依頼も結局自分でDM。1日の大半が会議と会議の準備で埋まっていく。",
  },
  {
    n: "PAIN 02",
    title: "現場のシグナルが、拾い切れない",
    body: "全社のチャットや日報の流量は限界超え。重要顧客の失注リスクや人材の不満が、起きてから耳に入る。",
  },
  {
    n: "PAIN 03",
    title: "紹介は来るが、再現性がない",
    body: "いい紹介はたまに来る。けれど、なぜ来たかを再現できない。商談の中で紹介の種を拾えているか、自分でも分からないまま「お願い」で終わる。",
  },
  {
    n: "PAIN 04",
    title: "判断軸が、組織に行き渡らない",
    body: "「これは社長ならどう判断するか」を毎回確認しないと社員が動けない。社長本人も、自分の判断軸を整理しきれていない。",
  },
];

// "思考" と "蓄積" に、それぞれ何が入るか
const insideMind = {
  label: "YOUR MIND / 経営判断軸",
  title: "あなたの思考",
  desc: "AIが毎回参照する「変わらない軸」。一度入れたら、判断ごとに自動で読み込まれる。",
  chips: [
    "ミッション・理念",
    "3カ年計画",
    "単年KPI",
    "判断基準",
    "サービス・商品",
    "口調・対応ルール",
    "FAQ・返答案",
    "NG判断",
  ],
};

const insideMemory = {
  label: "DAILY MEMORY / 日々の蓄積",
  title: "日々の蓄積",
  desc: "普段のチャットで話すだけで、AIが自動分類して積み上げる。書く負担はゼロ。",
  chips: [
    "人物・案件",
    "会話ログ",
    "案件進捗",
    "タスク・活動",
    "経費・売上",
    "判断履歴",
    "週次・月次レビュー",
    "ナレッジ",
  ],
};

const features = [
  {
    num: "01",
    eyebrow: "Feature 01 — Pre-meeting",
    title: "商談前のAI準備メモ",
    body: "明日のアポ毎に、相手の文脈と紹介につながる質問案までAIが整える。一般論を一切出さず、過去の関係性・判断軸・GIAの紹介ノウハウを踏まえた1枚に。",
    highlights: [
      "相手情報の要約 + 前回振り返り（人物・案件ノートを自動参照）",
      "今回の狙い・注意点（過去の関係性と判断軸を踏まえた一言）",
      "紹介につながる質問案 3つ（紹介の5条件を質問に組み込む）",
    ],
  },
  {
    num: "02",
    eyebrow: "Feature 02 — Capture",
    title: "チャットで話すだけで、ノートに貯まる",
    body: "5種類の発話（議事録／名刺／人物メモ／状態更新／判断履歴）を自動で構造化し、蓄積へ格納。書く負担ゼロで、毎日コンテキストが積まれていく。",
    highlights: [
      "議事録：複数会議でも1メッセージでOK。AIが自動分割・人物紐付け",
      "名刺：OCR文字列を投げれば顧客ノートに登録。会社・役職・メールを分解",
      "状態更新：「山口さんに提案した」で案件パイプラインを自動更新",
    ],
  },
  {
    num: "03",
    eyebrow: "Feature 03 — Dashboard",
    title: "ダッシュボードで、毎日の数字を一望",
    body: "営業パイプラインと売上進捗を、毎日見える形に。件数→率→質、の順に指標を深め、「再現できる形」になっているかをAIが判定する。",
    highlights: [
      "月次KPI 進捗を一目で（アポ／商談／提案／受注）",
      "売上進捗バー：今月の売上 vs 目標を毎日体感",
      "意思決定の蓄積：過去N日の Decision / Action 一覧",
    ],
  },
];

const numbers = [
  { label: "商談準備", before: "自分で資料収集・前回掘り返し", after: "AIが文脈・狙い・質問案を提示" },
  { label: "会議の準備密度", before: "議題のみ", after: "関係性・前回・狙い・質問案まで揃う" },
  { label: "現場ログ作成", before: "属人化・抜け落ち", after: "話せば自動で構造化・格納" },
];

// ノウハウ① 紹介の5条件
const fiveConditions = [
  {
    num: "01",
    title: "話しやすいストーリーがある",
    body: "紹介者がすぐ口に出せる、説明可能な物語が用意されている。",
  },
  {
    num: "02",
    title: "利用シーン・相手のイメージがわく",
    body: "「どんな人に役立つか」が、紹介者の頭に瞬時に浮かぶ。",
  },
  {
    num: "03",
    title: "他との違いがわかる",
    body: "「なぜあなたから」が、競合と比較しても明快に伝わる。",
  },
  {
    num: "04",
    title: "思い出されやすい",
    body: "必要な瞬間に、紹介者の記憶から自然に蘇るポジション。",
  },
  {
    num: "05",
    title: "ハードルが低い／安心材料がある",
    body: "紹介する側のリスクが低く、紹介された側も安心できる。",
  },
];

// ノウハウ② 仕組み化フレーム
const frames = [
  {
    n: "FRAME 01",
    title: "行動を分解する",
    body: "紹介や受注は結果。手前の行動（声かけ／質問／タイミング／フォロー）に分解して、どこで止まっているかを示す。",
  },
  {
    n: "FRAME 02",
    title: "ボトルネックを特定する",
    body: "「誰が／いつ／何を伝えたか」の5つの問いで止まりを特定。AIがチャットで属人化リスクとして通知。",
  },
  {
    n: "FRAME 03",
    title: "指標を深める",
    body: "件数 → 率 → 質、の順で指標を深める。「再現できる形」になっているかを判定する。",
  },
];

// ノウハウ③ 判断軸の例
const principles = [
  "数字より、直感を信じる",
  "短期売上より、関係性を優先",
  "既存を伸ばす ＞ 人を増やす",
  "完璧より、結果スピード",
];

// 5プラン（プラン0 + 4プラン）
const plans = [
  {
    code: "PLAN 00",
    name: "紹介コーチ（紹介設計研究所）",
    price: "¥990",
    priceNote: "/月（一般会員費・税込）",
    note: "ブラウザだけで使える紹介コーチ。GIA共通ノウハウ＋あなたの設計に沿って、紹介の言い回しや次の一手を相談できる（個別の事業データは保存しない）。",
    flag: false,
  },
  {
    code: "PLAN 01",
    name: "アシスタント",
    price: "¥4,980",
    priceNote: "/月",
    note: "自分専用。1日1回、商談前メモを通知。紹介質問案・振り返りテンプレ。",
    flag: false,
  },
  {
    code: "PLAN 02",
    name: "パートナー",
    price: "¥7,980",
    priceNote: "/月",
    note: "アシスタント全機能 + 1日2回以上の通知。商談前リマインド・夕方の振り返り。",
    flag: false,
  },
  {
    code: "PLAN 03",
    name: "チーム",
    price: "¥29,800〜",
    priceNote: "/月（〜¥49,800）",
    note: "判断軸とGIAノウハウを本格装備。社長の頭の中を組織の資産に。本ページの詳細はこのプラン。",
    flag: true,
  },
  {
    code: "PLAN 04",
    name: "カスタマイズ",
    price: "¥150,000〜",
    priceNote: "/月（6ヶ月契約）",
    note: "会社個別に設計・伴走。営業フロー整理／KPI設計／月次改善ミーティング。基本3名まで。",
    flag: false,
  },
];

const flow = [
  {
    num: "STEP 01",
    title: "チャット・Google Calendar 接続",
    body: "既存のチャット（Slack 等）と Google Calendar・社内ドキュメントに右腕AIを接続。手順マニュアル提供、代行依頼も可能（チーム以上）。",
  },
  {
    num: "STEP 02",
    title: "経営コンテキスト初期インストール",
    body: "ミッション・3年計画・KPI・判断基準・関係者マップを一緒に整理。AIの「正本」を作り込む壁打ちセッション（チーム以上）。ここまでの所要は経営者ご自身のペース次第です。",
  },
  {
    num: "STEP 03",
    title: "毎日の運用開始",
    body: "経営コンテキストが揃った時点から、朝晩の通知が届き始めます。最初は雑音が混ざりますが、フィードバックを返すたびに判断の精度が上がっていきます。",
  },
  {
    num: "STEP 04",
    title: "右腕AIが自走へ",
    body: "判断軸が固まり、自律的に判断・通知できる状態へ。月次レビューで判断パターンが経営判断軸へ昇格、組織の判断資産として育っていきます。",
  },
];

// Why Now 比較
const whyNowToolSide = [
  { strong: "データの接続", body: "カレンダー／メール／会議の連携" },
  { strong: "要約・自動分類", body: "議事録、検索、タグ付け" },
  { strong: "標準的なAIアシスタント", body: "テンプレ的な対話・自動化" },
];

const whyNowOurSide = [
  { strong: "判断履歴・案件・人物の蓄積", body: "数年分は、一瞬では作れない" },
  { strong: "紹介設計・判断軸（人的OS）", body: "ツールが用意してくれない領域" },
  { strong: "会社の「らしさ」の言語化", body: "属人化を解いて引き継ぐ仕組み" },
];

export default async function AICloneServicePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const checkoutUnavailable = checkout === "unavailable";
  return (
    <div className="edl-root bg-[var(--edl-off-white)] text-[var(--edl-body)]">
      <EdlRevealObserver />

      {checkoutUnavailable && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-xl">
          <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm leading-relaxed shadow-lg">
            ただいまオンライン決済を準備中です。お申し込みご希望の方は、お手数ですが
            LINE・お問い合わせよりご連絡ください。順次ご案内いたします。
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative pt-32 md:pt-44 pb-24 md:pb-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-16 md:gap-24 items-end">
          <div>
            <span className="edl-eyebrow edl-reveal mb-7">
              AI Clone — 紹介を仕組みにする右腕AI
            </span>
            <h1
              className="edl-headline edl-reveal mb-7"
              data-delay="1"
              style={{ fontSize: "clamp(38px, 4.6vw, 68px)" }}
            >
              紹介を、運から<br />
              <span className="accent">仕組み</span>へ<span className="period">.</span>
            </h1>
            <span
              className="edl-reveal edl-jp-keep block font-[family-name:var(--font-mincho)] text-[var(--edl-navy)] font-medium tracking-[0.04em] mt-2"
              data-delay="2"
              style={{ fontSize: "clamp(18px, 2vw, 24px)" }}
            >
              <span className="text-[var(--edl-gold)]">— </span>
              それを動かすのが、あなたの右腕AI。
            </span>
            <p
              className="edl-reveal mt-8 max-w-[44ch] text-[15px] tracking-[0.02em] text-[var(--edl-body)]"
              data-delay="3"
              style={{ lineHeight: 2.05 }}
            >
              「たまに来る紹介」を「いつも来る仕組み」へ。会話・案件・判断・売上を学習し、
              <strong className="edl-hl">社長の判断軸とGIAの紹介ノウハウ</strong>
              で動く右腕AIが、普段のチャット（Slack 推奨）で対話するだけで、
              商談前準備・紹介の種拾い・振り返りまでを毎日の仕組みにします。
              <strong className="edl-hl">経営の正本</strong>と<strong className="edl-hl">日々の蓄積</strong>を、AIが読み書きしながら育てていきます。
            </p>

            <div
              className="edl-reveal mt-10 flex flex-col items-start gap-5"
              data-delay="4"
            >
              <a
                href="https://page.line.me/131liqrt"
                target="_blank"
                rel="noopener noreferrer"
                className="edl-cta-primary line"
              >
                LINEで体験セッションを申し込む
                <span className="arrow" />
              </a>
              <a href="#core-loop" className="edl-cta-secondary">
                仕組みを見る
              </a>
              <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.24em] text-[var(--edl-muted)] uppercase mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--edl-gold)] mr-2 align-middle" />
                Beta cohort  /  月 1〜2 社限定
              </p>
            </div>
          </div>

          {/* 右：エディトリアル数字パネル */}
          <div
            className="edl-reveal hidden md:block border-l border-[var(--edl-gold)] pl-10"
            data-delay="4"
          >
            <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.32em] text-[var(--edl-muted)] mb-6">
              FROM ─── TO
            </p>
            <dl className="space-y-7">
              <div>
                <dt className="font-[family-name:var(--font-mincho)] text-sm text-[var(--edl-muted)]">
                  商談準備
                </dt>
                <dd className="font-[family-name:var(--font-mincho)] text-2xl text-[var(--edl-navy)] tracking-tight mt-1 leading-[1.4]">
                  自分で集める <span className="text-[var(--edl-gold)] mx-1.5">→</span> AIが揃える
                </dd>
              </div>
              <div>
                <dt className="font-[family-name:var(--font-mincho)] text-sm text-[var(--edl-muted)]">
                  判断軸の置き場
                </dt>
                <dd className="font-[family-name:var(--font-mincho)] text-3xl text-[var(--edl-navy)] tracking-tight mt-1">
                  頭の中 <span className="text-[var(--edl-gold)] mx-2">→</span> 引き継げる形
                </dd>
              </div>
              <div>
                <dt className="font-[family-name:var(--font-mincho)] text-sm text-[var(--edl-muted)]">
                  会社の記憶
                </dt>
                <dd className="font-[family-name:var(--font-mincho)] text-3xl text-[var(--edl-navy)] tracking-tight mt-1">
                  属人 <span className="text-[var(--edl-gold)] mx-2">→</span> 組織資産
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* 02 — Pain */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">02 — Pain</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            経営者に起きている、<br />
            <span className="accent">4つの構造的な問題</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[56ch] mb-16 text-[15px] text-[var(--edl-body)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            忙しさじゃない。情報過多でもない。
            時間／把握／紹介／判断軸、
            <strong className="edl-hl">すべてが頭の中だけにある</strong>
            ことが、判断と紹介を鈍らせています。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
            {pains.map((p, i) => (
              <div
                key={p.title}
                className="edl-reveal bg-[var(--edl-off-white)] p-8 md:p-10"
                data-delay={String((i % 2) + 1)}
              >
                <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold)] mb-4">
                  {p.n}
                </p>
                <h3 className="font-[family-name:var(--font-mincho)] text-xl md:text-2xl text-[var(--edl-navy)] mb-4 tracking-[0.02em]">
                  {p.title}
                </h3>
                <p className="text-[14px] text-[var(--edl-body)] leading-[2]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 — Core Loop (dark) */}
      <section
        id="core-loop"
        className="py-24 md:py-32 px-6 md:px-16 bg-[var(--edl-navy)] text-white border-b border-[var(--edl-line-dark)]"
      >
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num on-dark edl-reveal">
            03 — The Loop
          </span>
          <h2
            className="edl-headline on-dark edl-reveal mt-4 mb-6 max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            あなたの思考を、<br />
            <span className="accent">忘れず動く</span>右腕AI
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal text-white/75 max-w-[60ch] mb-16 text-[15px]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            ミッション・判断基準・KPI・関係者マップを「変わらない軸」として
            AIが毎回参照しつつ、毎日のチャットで思考と蓄積の両方を読み取り・書き戻す。
            この往復が、右腕AIのコアループです。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-10 items-stretch">
            {/* 左：YOUR MIND（内側に蓄積を「セクション仕切り」として配置） */}
            <div
              className="edl-reveal flex flex-col border border-white/20 p-7 md:p-9 bg-white/[0.03]"
              data-delay="1"
            >
              <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-3">
                YOUR MIND / THINKING
              </p>
              <p className="font-[family-name:var(--font-mincho)] text-xl text-white mb-3 tracking-[0.02em]">
                あなたの思考
              </p>
              <p className="text-[13px] text-white/70 leading-[1.95]">
                ミッション・判断基準・KPI・サービス情報・関係者マップ。
                <strong className="text-white">「変わらない軸」</strong>として
                AIが毎回参照する。
              </p>

              <div className="mt-6 pt-6 border-t border-white/15">
                <p className="font-[family-name:var(--font-en)] text-[9px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-2">
                  DAILY MEMORY / 内側に蓄積
                </p>
                <p className="font-[family-name:var(--font-mincho)] text-[15px] text-white mb-2 tracking-[0.02em]">
                  日々の蓄積
                </p>
                <p className="text-[12px] text-white/65 leading-[1.85]">
                  会話・判断・案件進捗・売上・人物メモが、毎日積まれる。
                  思考の「外」ではなく、思考の中で育つ。
                </p>
              </div>
            </div>

            {/* 中央：矢印 + 縦線コネクタ（デスクトップは縦軸、モバイルは横軸） */}
            <div
              className="edl-reveal flex flex-row md:flex-col items-center justify-center md:justify-between gap-8 md:gap-0 md:py-2"
              data-delay="2"
            >
              <div className="flex flex-col items-center">
                <span className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-2">
                  読む
                </span>
                <span aria-hidden className="md:hidden text-[var(--edl-gold)] text-[28px] leading-none">
                  ↓
                </span>
                <span aria-hidden className="hidden md:inline text-[var(--edl-gold)] text-[32px] leading-none">
                  →
                </span>
              </div>

              {/* デスクトップのみ：縦の金線でループ感を出す */}
              <span
                aria-hidden
                className="hidden md:block md:flex-1 md:w-px md:my-4 md:min-h-[60px]"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(184,153,104,0.6) 0%, rgba(214,168,91,0.2) 50%, rgba(184,153,104,0.6) 100%)",
                }}
              />

              <div className="flex flex-col items-center">
                <span aria-hidden className="md:hidden text-[var(--edl-gold)] text-[28px] leading-none">
                  ↑
                </span>
                <span aria-hidden className="hidden md:inline text-[var(--edl-gold)] text-[32px] leading-none">
                  ←
                </span>
                <span className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold-soft)] mt-2">
                  書き戻す
                </span>
              </div>
            </div>

            {/* 右：AI（tag を mt-auto で下端に固定して左カードと高さを揃える） */}
            <div
              className="edl-reveal flex flex-col border border-[var(--edl-gold-soft)] p-7 md:p-9 bg-[var(--edl-gold-soft)]/[0.04]"
              data-delay="3"
            >
              <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-3">
                RIGHT HAND / AI
              </p>
              <p className="font-[family-name:var(--font-mincho)] text-xl text-white mb-3 tracking-[0.02em]">
                あなたの右腕AI
              </p>
              <p className="text-[13px] text-white/70 leading-[1.95]">
                チャットツール（Slack 推奨）で毎日のやりとり。
                思考と蓄積の両方を読み取り、書き戻す。
              </p>

              <div className="mt-6 pt-6 border-t border-white/15">
                <p className="font-[family-name:var(--font-en)] text-[9px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-3">
                  ROLE / 担うこと
                </p>
                <ul className="space-y-2 text-[12px] text-white/75 leading-[1.85]">
                  <li className="flex gap-2">
                    <span className="text-[var(--edl-gold)] mt-1">●</span>
                    <span>朝晩の通知で経営の流れを保つ</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--edl-gold)] mt-1">●</span>
                    <span>発話を自動分類して蓄積に積み上げる</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--edl-gold)] mt-1">●</span>
                    <span>判断軸に照らして次の一手を提案</span>
                  </li>
                </ul>
              </div>

              <span className="mt-auto pt-6 inline-block self-start font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)]">
                — YOUR RIGHT HAND, AS AI
              </span>
            </div>
          </div>

          <div className="edl-reveal mt-14 border-l-2 border-[var(--edl-gold)] pl-6 md:pl-8" data-delay="2">
            <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-2">
              CORE LOOP
            </p>
            <p className="text-[16px] md:text-[18px] text-white leading-[1.95] max-w-[64ch]">
              使うほど、
              <strong className="text-[var(--edl-gold-soft)]">本人の思考・判断・仕事の流れ</strong>が、
              毎日育つ仕組みに変わる。
            </p>
          </div>

          {/* 中間 CTA */}
          <div className="edl-reveal mt-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-8" data-delay="3">
            <a
              href="https://page.line.me/131liqrt"
              target="_blank"
              rel="noopener noreferrer"
              className="edl-cta-secondary on-dark"
            >
              30分の体験セッションで実演を見る
            </a>
            <span className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.24em] text-white/55 uppercase">
              Beta cohort  /  月 1〜2 社限定
            </span>
          </div>
        </div>
      </section>

      {/* 04 — Inside（思考と蓄積に、それぞれ何が入るか） */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">04 — Inside</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[30ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            思考と蓄積に、<br />
            <span className="accent">何が入るか</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[60ch] mb-16 text-[15px] text-[var(--edl-body)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            AIに渡すのは、難しいデータベースではありません。
            判断のたびに参照する<strong className="edl-hl">「変わらない軸」</strong>と、
            日々の中で生まれる<strong className="edl-hl">「蓄積」</strong>。
            この2つだけです。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
            {/* 思考 */}
            <div className="edl-reveal bg-[var(--edl-off-white)] p-8 md:p-10 flex flex-col" data-delay="1">
              <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] mb-3">
                {insideMind.label}
              </p>
              <p className="font-[family-name:var(--font-mincho)] text-2xl text-[var(--edl-navy)] mb-3 tracking-[0.02em]">
                {insideMind.title}
              </p>
              <p className="text-[14px] text-[var(--edl-body)] leading-[1.95] mb-7 max-w-[44ch]">
                {insideMind.desc}
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                {insideMind.chips.map((c) => (
                  <span
                    key={c}
                    className="font-[family-name:var(--font-mincho)] text-[13px] text-[var(--edl-navy)] border border-[var(--edl-line)] bg-white px-3 py-1.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* 蓄積 */}
            <div className="edl-reveal bg-[var(--edl-off-white)] p-8 md:p-10 flex flex-col" data-delay="2">
              <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] mb-3">
                {insideMemory.label}
              </p>
              <p className="font-[family-name:var(--font-mincho)] text-2xl text-[var(--edl-navy)] mb-3 tracking-[0.02em]">
                {insideMemory.title}
              </p>
              <p className="text-[14px] text-[var(--edl-body)] leading-[1.95] mb-7 max-w-[44ch]">
                {insideMemory.desc}
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                {insideMemory.chips.map((c) => (
                  <span
                    key={c}
                    className="font-[family-name:var(--font-mincho)] text-[13px] text-[var(--edl-navy)] border border-[var(--edl-line)] bg-white px-3 py-1.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="edl-reveal mt-6 text-[12px] text-[var(--edl-muted)] leading-[1.85] max-w-[60ch]" data-delay="3">
            ※ 思考は一度入れたら自動で参照され、蓄積は普段のチャットから AI が自動で積み上げます。
            手動で書く・整理する作業は要りません。
          </p>
        </div>
      </section>

      {/* 05 — Core Features (3つの機能) */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">05 — Core</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-20 max-w-[26ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            右腕AIが<span className="accent">担う、3つの仕事</span>
            <span className="period">.</span>
          </h2>

          <div className="space-y-20 md:space-y-28">
            {features.map((f) => (
              <div
                key={f.num}
                className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-16 items-start"
              >
                <div className="edl-reveal">
                  <p className="font-[family-name:var(--font-en)] text-[64px] md:text-[88px] leading-none text-[var(--edl-gold)] tracking-tight">
                    {f.num}
                  </p>
                </div>
                <div className="edl-reveal" data-delay="1">
                  <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-muted)] mb-3">
                    {f.eyebrow}
                  </p>
                  <h3
                    className="font-[family-name:var(--font-mincho)] text-[var(--edl-navy)] mb-6"
                    style={{
                      fontSize: "clamp(22px, 2.4vw, 32px)",
                      lineHeight: 1.4,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p className="max-w-[58ch] text-[15px] text-[var(--edl-body)] mb-8" style={{ lineHeight: 2 }}>
                    {f.body}
                  </p>
                  <ul className="border-t border-[var(--edl-line)]">
                    {f.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-4 py-4 border-b border-[var(--edl-line)]"
                      >
                        <span className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] mt-1.5">
                          ●
                        </span>
                        <span className="text-[14px] text-[var(--edl-body)] leading-[1.9]">
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* 中間 CTA */}
          <div className="edl-reveal mt-20 md:mt-24 border-t border-[var(--edl-line)] pt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <p className="font-[family-name:var(--font-mincho)] text-[16px] md:text-[18px] text-[var(--edl-navy)] leading-[1.85] max-w-[42ch]">
              <strong className="edl-hl">3つの機能</strong>を、貴社のチャットでそのまま実演します。
            </p>
            <a
              href="https://page.line.me/131liqrt"
              target="_blank"
              rel="noopener noreferrer"
              className="edl-cta-secondary"
            >
              30分の体験セッションを申し込む
            </a>
          </div>
        </div>
      </section>

      {/* 06 — Effects (dark) */}
      <section className="py-24 md:py-32 px-6 md:px-16 bg-[var(--edl-navy)] text-white border-b border-[var(--edl-line-dark)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num on-dark edl-reveal">06 — Effects</span>
          <h2
            className="edl-headline on-dark edl-reveal mt-4 mb-16 max-w-[26ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            右腕AIを置いた後の<span className="accent">変化</span>
            <span className="period">.</span>
          </h2>

          <div className="border-t border-[var(--edl-gold-soft)]">
            {numbers.map((n, i) => (
              <div
                key={n.label}
                className="edl-reveal grid grid-cols-12 items-baseline py-7 md:py-9 border-b border-white/15"
                data-delay={String((i % 4) + 1)}
              >
                <div className="col-span-12 md:col-span-4 font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-white/65">
                  {String(i + 1).padStart(2, "0")} — {n.label}
                </div>
                <div className="col-span-6 md:col-span-4 mt-3 md:mt-0 font-[family-name:var(--font-mincho)] text-white/45 text-base md:text-lg line-through decoration-white/20">
                  {n.before}
                </div>
                <div className="col-span-6 md:col-span-4 mt-3 md:mt-0 font-[family-name:var(--font-mincho)] text-white text-2xl md:text-3xl tracking-tight">
                  <span className="text-[var(--edl-gold-soft)] mr-3">→</span>
                  {n.after}
                </div>
              </div>
            ))}
          </div>

          <p className="edl-reveal mt-10 text-[12px] text-white/55 leading-[1.85] max-w-[64ch]" data-delay="2">
            ※ Beta期の設計値です。経営コンテキスト初期インストール後、2週間の運用フェーズで現場の文脈にチューニングしながら、1〜3ヶ月で段階的に到達を目指します。
            実数値は Beta コホート完了後、貴社の状況に即した数字で改めてご共有します。
          </p>
        </div>
      </section>

      {/* 07 — Interface (Slack + Dashboard Mock) */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">07 — Interface</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            毎日のチャットが入口、<br />
            <span className="accent">ダッシュボード</span>で一望<span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[60ch] mb-16 text-[15px] text-[var(--edl-body)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            ダッシュボードも管理画面も覚える必要はありません。
            朝晩の通知も、シグナルも、判断軸のアップデートも、
            すべて普段お使いのチャットと音声入力で完結。
            蓄積された数字は、落ち着いたトーンの一画面で見渡せます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-6 md:gap-8 items-start">
            {/* A/B Comparison Mock — 汎用AI vs 右腕AI */}
            <div className="edl-reveal" data-delay="1">
              <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-muted)] mb-3">
                01 — 汎用AI vs 右腕AI
              </p>
              <div className="bg-white border border-[var(--edl-line)] p-5 md:p-6 text-[12px] leading-[1.85]">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[var(--edl-line)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--edl-gold)]" />
                  <span className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.25em] text-[var(--edl-gold)] font-semibold">
                    SAME QUESTION, DIFFERENT ANSWER
                  </span>
                  <span className="ml-auto font-[family-name:var(--font-en)] text-[10px] text-[var(--edl-muted)]">
                    08:00
                  </span>
                </div>

                {/* USER */}
                <div className="mb-4">
                  <p className="font-[family-name:var(--font-en)] text-[9px] tracking-[0.3em] text-[var(--edl-muted)] mb-1.5">
                    USER
                  </p>
                  <p className="font-[family-name:var(--font-mincho)] text-[13px] text-[var(--edl-navy)] pl-3 border-l border-[var(--edl-line)] leading-[1.85]">
                    今週、何から動く？
                  </p>
                </div>

                {/* 汎用AI */}
                <div className="mb-4 opacity-70">
                  <p className="font-[family-name:var(--font-en)] text-[9px] tracking-[0.3em] text-[var(--edl-muted)] mb-1.5">
                    汎用AI <span className="tracking-[0.05em] normal-case">（メモリ機能あり）</span>
                  </p>
                  <p className="font-[family-name:var(--font-mincho)] text-[13px] text-[var(--edl-body)] pl-3 border-l border-[var(--edl-muted)]/40 leading-[1.95]">
                    以前「紹介経由が多い」とおっしゃっていましたね。
                    タスクを整理して、優先順位をつけるのがおすすめです。
                  </p>
                </div>

                {/* 右腕AI */}
                <div>
                  <p className="font-[family-name:var(--font-en)] text-[9px] tracking-[0.3em] text-[var(--edl-gold)] font-semibold mb-1.5">
                    右腕AI <span className="tracking-[0.05em] normal-case text-[var(--edl-gold-soft)]">（経営判断軸入り）</span>
                  </p>
                  <div className="pl-3 border-l-2 border-[var(--edl-gold)]">
                    <p className="font-[family-name:var(--font-mincho)] text-[13px] text-[var(--edl-navy)] mb-2 font-semibold">
                      売上に近い順で 3つ：
                    </p>
                    <ul className="space-y-1.5 text-[12px] text-[var(--edl-body)] leading-[1.7]">
                      <li>
                        ① <strong className="text-[var(--edl-navy)]">A社：</strong>紹介3件提示（前回 4/15「9割」発言）
                      </li>
                      <li>
                        ② <strong className="text-[var(--edl-navy)]">B様：</strong>契約フォロー（提案後 14日）
                      </li>
                      <li>
                        ③ <strong className="text-[var(--edl-navy)]">C社：</strong>継続提案（契約終了 7日前）
                      </li>
                    </ul>
                    <p className="mt-3 pt-2.5 border-t border-[var(--edl-line)] text-[11px] text-[var(--edl-muted)] leading-[1.85]">
                      判断軸「<span className="text-[var(--edl-navy)] font-semibold">関係性優先</span>」「<span className="text-[var(--edl-navy)] font-semibold">既存を伸ばす ＞ 人を増やす</span>」に照らして配列。
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[var(--edl-muted)] leading-[1.85]">
                ※ 同じ問いでも、<strong className="text-[var(--edl-navy)]">経営判断軸・KPI・案件状態</strong>を参照する右腕AIは、一般論ではなく具体名と判断根拠で返します。
              </p>
            </div>

            {/* Dashboard Mock */}
            <div className="edl-reveal" data-delay="2">
              <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-muted)] mb-3">
                02 — DASHBOARD
              </p>
              <div className="bg-white border border-[var(--edl-line)] p-5 md:p-7">
                <div className="flex items-baseline justify-between border-b border-[var(--edl-line)] pb-3 mb-4">
                  <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] font-semibold">
                    RIGHT-HAND AI / DASHBOARD
                  </p>
                  <p className="font-[family-name:var(--font-en)] text-[10px] text-[var(--edl-muted)]">
                    2026.05.02
                  </p>
                </div>

                <p className="font-[family-name:var(--font-mincho)] text-[18px] md:text-[22px] text-[var(--edl-navy)] mb-1 tracking-[0.02em]">
                  経営者ダッシュボード
                </p>
                <p className="text-[11px] text-[var(--edl-muted)] mb-5">
                  チャット・Calendar・社内ドキュメントから経営シグナルを自動抽出
                </p>

                <div className="grid grid-cols-4 gap-2 mb-5">
                  {[
                    { label: "新規アポ", val: "18", target: "/30", pct: 60 },
                    { label: "商談", val: "9", target: "/15", pct: 60 },
                    { label: "提案", val: "5", target: "/9", pct: 56 },
                    { label: "受注", val: "2", target: "/5", pct: 40 },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="border border-[var(--edl-line)] p-2.5"
                    >
                      <p className="text-[8px] tracking-[0.15em] text-[var(--edl-muted)] uppercase mb-1.5">
                        {s.label}
                      </p>
                      <p className="font-[family-name:var(--font-mincho)] text-[20px] text-[var(--edl-navy)] leading-none mb-1">
                        {s.val}
                        <span className="text-[10px] text-[var(--edl-muted)] ml-0.5">
                          {s.target}
                        </span>
                      </p>
                      <div className="relative h-1 bg-[var(--edl-line)] mt-1.5">
                        <div
                          className="absolute inset-y-0 left-0 bg-[var(--edl-gold)]"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[var(--edl-navy)] text-white p-3.5 mb-5">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="font-[family-name:var(--font-en)] text-[9px] tracking-[0.3em] text-[var(--edl-gold-soft)] font-semibold">
                      MONTHLY REVENUE
                    </p>
                    <p className="font-[family-name:var(--font-mincho)] text-[10px] text-white/70">
                      ¥420万 / 目標 ¥800万
                    </p>
                  </div>
                  <div className="relative h-1 bg-white/15">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-white to-[var(--edl-gold-soft)]"
                      style={{ width: "52%" }}
                    />
                  </div>
                  <p className="font-[family-name:var(--font-mincho)] text-right text-[var(--edl-gold-soft)] text-[11px] mt-1.5">
                    52%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-[var(--edl-gold)] font-semibold mb-2 uppercase">
                      CEOの今日
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-[var(--edl-body)]">
                      <li className="flex gap-2">
                        <span className="text-[var(--edl-gold)] font-mono tabular-nums">
                          10:30
                        </span>
                        <span>A社 商談</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[var(--edl-gold)] font-mono tabular-nums">
                          14:00
                        </span>
                        <span>経営会議</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[var(--edl-gold)] font-mono tabular-nums">
                          16:00
                        </span>
                        <span>取締役会</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-[var(--edl-gold)] font-semibold mb-2 uppercase">
                      直近の意思決定
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-[var(--edl-body)]">
                      <li className="flex gap-2 items-baseline">
                        <span className="text-[9px] tracking-[0.15em] text-[var(--edl-gold)]">
                          決定
                        </span>
                        <span>価格改定（10月）</span>
                      </li>
                      <li className="flex gap-2 items-baseline">
                        <span className="text-[9px] tracking-[0.15em] text-[var(--edl-gold)]">
                          決定
                        </span>
                        <span>新規採用 2名</span>
                      </li>
                      <li className="flex gap-2 items-baseline">
                        <span className="text-[9px] tracking-[0.15em] text-[var(--edl-muted)]">
                          ACTION
                        </span>
                        <span>新サービス検討開始</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="edl-reveal mt-6 text-[11px] text-[var(--edl-muted)]" data-delay="3">
            ※ 画面イメージ。実際のデータはあなたの経営コンテキスト・社内ドキュメント・Calendarに連動して動的に表示されます。
          </p>
        </div>
      </section>

      {/* 08 — Plans (5プラン) */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">08 — Plans</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[30ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            5プランで、<span className="accent">段階的に深まる</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[60ch] mb-16 text-[15px] text-[var(--edl-body)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            一般会員特典の<strong className="edl-hl">紹介コーチ（プラン0）</strong>から、
            会社個別に伴走する<strong className="edl-hl">カスタマイズ（プラン4）</strong>まで。
            使い方の深さで段階的にご提供します。
          </p>

          {/* Scarcity 注記 — Beta cohort 月1〜2社限定 */}
          <div className="edl-reveal mb-10 md:mb-12 border border-[var(--edl-gold)]/40 bg-[var(--edl-gold-soft)]/[0.08] p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
            <span className="inline-flex items-center gap-2.5 font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] font-semibold whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--edl-gold)]" />
              BETA COHORT
            </span>
            <p className="text-[13px] text-[var(--edl-body)] leading-[1.85]">
              Beta期は丁寧な並走運用のため、<strong className="text-[var(--edl-navy)]">月 1〜2 社に限らせていただいています</strong>。次の受付枠はLINEでご確認ください。
            </p>
          </div>

          <div className="flex items-baseline justify-between border-b border-[var(--edl-line)] pb-3 mb-6">
            <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.32em] text-[var(--edl-muted)]">
              USE CASES & PLANS
            </p>
            <p className="text-[11px] text-[var(--edl-muted)]">
              ※ 本ページは「チーム」プランの詳細
            </p>
          </div>

          {/* プラン0：サロン特典として4プランから独立した1行カードで */}
          {(() => {
            const plan0 = plans.find((p) => p.code === "PLAN 00");
            if (!plan0) return null;
            return (
              <div className="edl-reveal mb-5 border border-[var(--edl-line)] bg-[var(--edl-off-white)] p-5 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-4 md:gap-8 items-center">
                <div>
                  <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] mb-2">
                    {plan0.code}  /  一般会員特典
                  </p>
                  <p className="font-[family-name:var(--font-mincho)] text-[17px] text-[var(--edl-navy)] tracking-[0.02em]">
                    {plan0.name}
                  </p>
                </div>
                <p className="text-[12.5px] text-[var(--edl-body)] leading-[1.85] max-w-[52ch]">
                  {plan0.note}
                </p>
                <div className="text-left md:text-right">
                  <p className="font-[family-name:var(--font-mincho)] text-2xl text-[var(--edl-navy)] tracking-tight">
                    {plan0.price}
                  </p>
                  <p className="text-[10px] tracking-wider text-[var(--edl-muted)] mt-0.5">
                    {plan0.priceNote}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* 4プラン（01〜04）— チーム(flag:true)に RECOMMENDED バナー */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
            {plans
              .filter((p) => p.code !== "PLAN 00")
              .map((p) => (
                <div
                  key={p.code}
                  className={`relative p-6 md:p-7 flex flex-col overflow-hidden ${
                    p.flag
                      ? "bg-[var(--edl-navy)] text-white"
                      : "bg-[var(--edl-off-white)]"
                  }`}
                >
                  {p.flag && (
                    <div className="-mt-6 md:-mt-7 -mx-6 md:-mx-7 mb-5 bg-[var(--edl-gold)] text-[var(--edl-navy-deep)] text-center py-2 font-[family-name:var(--font-en)] text-[10px] tracking-[0.32em] font-bold">
                      RECOMMENDED
                    </div>
                  )}
                  <p
                    className={`font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] mb-3 ${
                      p.flag ? "text-[var(--edl-gold-soft)]" : "text-[var(--edl-gold)]"
                    }`}
                  >
                    {p.code}
                  </p>
                  <p
                    className={`font-[family-name:var(--font-mincho)] text-[16px] mb-3 tracking-[0.02em] ${
                      p.flag ? "text-white" : "text-[var(--edl-navy)]"
                    }`}
                  >
                    {p.name}
                  </p>
                  <p
                    className={`font-[family-name:var(--font-mincho)] text-2xl tracking-tight mb-1 ${
                      p.flag
                        ? "text-[var(--edl-gold-soft)]"
                        : "text-[var(--edl-navy)]"
                    }`}
                  >
                    {p.price}
                  </p>
                  <p
                    className={`text-[10px] tracking-wider mb-4 opacity-70 ${
                      p.flag ? "text-white" : "text-[var(--edl-muted)]"
                    }`}
                  >
                    {p.priceNote}
                  </p>
                  <p
                    className={`text-[12px] leading-[1.85] mt-auto ${
                      p.flag ? "text-white/75" : "text-[var(--edl-body)]"
                    }`}
                  >
                    {p.note}
                  </p>
                  {(p.code === "PLAN 01" || p.code === "PLAN 02") && (
                    <form
                      action={
                        p.code === "PLAN 01"
                          ? startAiCloneAssistant
                          : startAiClonePartner
                      }
                      className="mt-5"
                    >
                      <SubmitButton
                        pendingText="決済へ移動中…"
                        className={`w-full inline-flex items-center justify-center rounded-md py-2.5 px-4 text-[11px] font-bold tracking-[0.18em] transition-colors disabled:opacity-60 ${
                          p.flag
                            ? "bg-[var(--edl-gold)] text-[var(--edl-navy-deep)] hover:bg-[var(--edl-gold-soft)]"
                            : "bg-[var(--edl-navy)] text-white hover:bg-[var(--edl-navy-deep)]"
                        }`}
                      >
                        このプランで始める
                      </SubmitButton>
                    </form>
                  )}
                </div>
              ))}
          </div>

          <p className="mt-5 text-[12px] text-[var(--edl-muted)] leading-[1.95]">
            ※ 月額は税別。<strong className="edl-hl">アシスタント／パートナーは初期費なし・セルフ完結</strong>。
            お申込み後、画面の案内に沿って Slack／LINE／Google Calendar を接続し、
            ダッシュボードから経営コンテキストをご自身で入力していただきます。
            チーム以上は別途お見積り（経営コンテキスト初期インストール込み）。
            AI API利用料は通常使用分まで月額に含む。
          </p>
          <p className="mt-2 text-[12px] text-[var(--edl-muted)] leading-[1.95]">
            ※ プラン0（紹介コーチ）はGIA一般会員特典。ブラウザだけで使え、個別の事業データは保存しません。プラン01以降に進むと、自分専用の判断軸とノートが構築されます。
          </p>
        </div>
      </section>

      {/* 09 — Optional Know-how: 一時非表示
          （5要素・仕組み化フレーム・判断パターンはセミナー独占コンテンツのためLPに載せない方針） */}
      {false && (
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">09 — Optional</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[34ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            ご希望の方には、<br />
            <span className="accent">GIAのノウハウを無料で重ねます</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[62ch] mb-6 text-[15px] text-[var(--edl-body)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            右腕AIは<strong className="edl-hl">あなた自身の判断軸だけでも動きます</strong>。
            「紹介設計の方法論まで載せたい」「属人化を解きたい」と感じた方には、
            GIAが現場で蓄積した3つのノウハウを、
            <strong className="edl-hl">追加費用なし</strong>でAIに重ねてインストールできます。
            無理に薦めるものではありません。必要だと感じた方だけ、選んでください。
          </p>
          <p
            className="edl-reveal mb-20 max-w-[62ch] text-[12px] text-[var(--edl-muted)] leading-[1.95]"
            data-delay="3"
          >
            ※ ノウハウインストールはチーム以上のプランに含まれます（追加料金なし）。
            アシスタント／パートナーをご利用中で「やはり乗せたい」と感じた場合は、いつでも追加可能です。
          </p>

          {/* ノウハウ① 紹介の5条件 */}
          <div className="mb-20 md:mb-24">
            <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold)] mb-3 edl-reveal">
              KNOW-HOW 01 / 紹介が起こる条件
            </p>
            <h3
              className="edl-reveal font-[family-name:var(--font-mincho)] text-[var(--edl-navy)] mb-10 max-w-[34ch]"
              data-delay="1"
              style={{ fontSize: "clamp(22px, 2.4vw, 32px)", letterSpacing: "0.02em", lineHeight: 1.4 }}
            >
              紹介は「お願い」ではなく、<span className="text-[var(--edl-gold)]">5つの要素</span>が揃った時に起きる。
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
              {fiveConditions.map((c, i) => (
                <div
                  key={c.num}
                  className="edl-reveal bg-[var(--edl-off-white)] p-6 md:p-7"
                  data-delay={String((i % 4) + 1)}
                >
                  <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] mb-3">
                    {c.num}
                  </p>
                  <h4 className="font-[family-name:var(--font-mincho)] text-[15px] text-[var(--edl-navy)] mb-3 leading-[1.5] tracking-[0.02em]">
                    {c.title}
                  </h4>
                  <p className="text-[12px] text-[var(--edl-body)] leading-[1.95]">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="edl-reveal mt-5 text-[12px] text-[var(--edl-muted)] leading-[1.85] max-w-[60ch]" data-delay="2">
              この5条件の観点を、AIが商談前メモ・シグナル抽出・通知判断のロジックに組み込みます。
            </p>
          </div>

          {/* ノウハウ② 仕組み化フレーム */}
          <div className="mb-20 md:mb-24">
            <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold)] mb-3 edl-reveal">
              KNOW-HOW 02 / 紹介を仕組みに変える
            </p>
            <h3
              className="edl-reveal font-[family-name:var(--font-mincho)] text-[var(--edl-navy)] mb-10 max-w-[34ch]"
              data-delay="1"
              style={{ fontSize: "clamp(22px, 2.4vw, 32px)", letterSpacing: "0.02em", lineHeight: 1.4 }}
            >
              結果ではなく、手前の<span className="text-[var(--edl-gold)]">「行動」</span>を再現できる形にする。
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
              {frames.map((f, i) => (
                <div
                  key={f.n}
                  className="edl-reveal bg-[var(--edl-off-white)] p-7 md:p-9"
                  data-delay={String((i % 3) + 1)}
                >
                  <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] mb-3">
                    {f.n}
                  </p>
                  <h4 className="font-[family-name:var(--font-mincho)] text-[17px] text-[var(--edl-navy)] mb-3 tracking-[0.02em]">
                    {f.title}
                  </h4>
                  <p className="text-[13px] text-[var(--edl-body)] leading-[1.95]">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="edl-reveal mt-5 text-[12px] text-[var(--edl-muted)] leading-[1.85] max-w-[60ch]" data-delay="2">
              「あの社長だから出来た」を、誰がやっても回る形へ。AIが日々の判断を構造的に検知します。
            </p>
          </div>

          {/* ノウハウ③ 判断パターン保持 */}
          <div>
            <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold)] mb-3 edl-reveal">
              KNOW-HOW 03 / 経営者の判断パターン保持
            </p>
            <h3
              className="edl-reveal font-[family-name:var(--font-mincho)] text-[var(--edl-navy)] mb-10 max-w-[34ch]"
              data-delay="1"
              style={{ fontSize: "clamp(22px, 2.4vw, 32px)", letterSpacing: "0.02em", lineHeight: 1.4 }}
            >
              あなたの<span className="text-[var(--edl-gold)]">哲学</span>を学習し、<br />
              次の一手を後押しする相棒に。
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
              {principles.map((p, i) => (
                <div
                  key={p}
                  className="edl-reveal bg-[var(--edl-off-white)] p-6 md:p-7"
                  data-delay={String((i % 4) + 1)}
                >
                  <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] mb-3">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="font-[family-name:var(--font-mincho)] text-[16px] text-[var(--edl-navy)] leading-[1.6] tracking-[0.02em]">
                    {p}
                  </p>
                </div>
              ))}
            </div>
            <p className="edl-reveal mt-5 text-[12px] text-[var(--edl-muted)] leading-[1.85] max-w-[64ch]" data-delay="2">
              単なるAI秘書ではなく、「あなたの判断軸を学習した分身」として、過去の成功パターンを引いて次の一手を後押しします。
            </p>
          </div>
        </div>
      </section>

      )}

      {/* 09 — Flow（旧 10。Know-how 非表示に伴い番号繰り上げ） */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">09 — Flow</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-16 max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            導入の流れ、<br />
            <span className="accent">入力が済んだ瞬間</span>から、動き出す<span className="period">.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
            {flow.map((s, i) => (
              <div
                key={s.num}
                className="edl-reveal bg-[var(--edl-off-white)] p-8 md:p-10"
                data-delay={String((i % 4) + 1)}
              >
                <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold)] mb-4">
                  {s.num}
                </p>
                <h3 className="font-[family-name:var(--font-mincho)] text-lg text-[var(--edl-navy)] mb-3 tracking-[0.02em]">
                  {s.title}
                </h3>
                <p className="text-[13px] text-[var(--edl-body)] leading-[1.9]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10 — Why Now (dark) */}
      <section className="py-24 md:py-32 px-6 md:px-16 bg-[var(--edl-navy)] text-white border-b border-[var(--edl-line-dark)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num on-dark edl-reveal">10 — Why Now</span>
          <h2
            className="edl-headline on-dark edl-reveal mt-4 mb-6 max-w-[32ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            数年後、AIが進化する。<br />
            それでも<span className="accent">差がつく</span>のは、自社で用意したもの<span className="period">.</span>
          </h2>
          <p
            className="edl-reveal text-white/75 max-w-[60ch] mb-16 text-[15px]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            ツール側がやってくれることは数年でコモディティ化する。
            けれど、判断履歴・紹介設計・会社の「らしさ」は、
            <strong className="text-white">早く始めた会社にしか作れない時間資産</strong>です。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px border border-white/15">
            <div className="bg-white/[0.03] p-7 md:p-9">
              <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-white/55 mb-5">
                ツール側が用意してくれること
              </p>
              <ul className="space-y-4 mb-6">
                {whyNowToolSide.map((t) => (
                  <li key={t.strong} className="text-[14px] leading-[1.9]">
                    <strong className="text-white block mb-1">{t.strong}</strong>
                    <span className="text-white/65 text-[13px]">{t.body}</span>
                  </li>
                ))}
              </ul>
              <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold-soft)] border-t border-white/15 pt-4">
                → 数年でコモディティ化する
              </p>
            </div>
            <div className="bg-white/[0.03] p-7 md:p-9">
              <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-5">
                自社で用意するもの
              </p>
              <ul className="space-y-4 mb-6">
                {whyNowOurSide.map((t) => (
                  <li key={t.strong} className="text-[14px] leading-[1.9]">
                    <strong className="text-white block mb-1">{t.strong}</strong>
                    <span className="text-white/65 text-[13px]">{t.body}</span>
                  </li>
                ))}
              </ul>
              <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold-soft)] border-t border-white/15 pt-4">
                → 早く始めた会社にしか作れない時間資産
              </p>
            </div>
          </div>

          <div className="edl-reveal mt-10 border-l-2 border-[var(--edl-gold)] pl-6 md:pl-8" data-delay="2">
            <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-2">
              WHAT YOU&apos;RE BUYING
            </p>
            <p className="text-[16px] md:text-[18px] text-white leading-[1.95] max-w-[64ch]">
              今始めるのは、
              <strong className="text-[var(--edl-gold-soft)]">未来の「起動時間」</strong>を買うこと。
              ツールが進化した瞬間、ゼロから始める会社との差は数か月〜数年分になる。
            </p>
          </div>
        </div>
      </section>

      {/* 11 — CTA */}
      <section className="py-24 md:py-36 px-6 md:px-16 edl-section-fade-deep text-white">
        <div className="max-w-[1240px] mx-auto text-center">
          <span className="edl-section-num on-dark edl-reveal is-centered">
            11 — Inquiry
          </span>
          <h2
            className="edl-headline on-dark edl-reveal mt-6 mb-8 mx-auto max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.4vw, 48px)" }}
          >
            社長の頭脳と、<br />
            GIAのノウハウ。<br />
            両方を、<span className="accent">右腕AI</span>に<span className="period">.</span>
          </h2>
          <p
            className="edl-reveal mx-auto max-w-[52ch] text-white/70 text-[15px] mb-12"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            30分の体験セッションで、実際のチャットでAIと会話、ダッシュボードデモ、
            貴社にとって最適なプランを一緒に確認できます。
            Beta期は丁寧な並走運用のため、月1〜2社に限らせていただいています。
          </p>
          <div className="edl-reveal flex flex-col items-center gap-5" data-delay="3">
            <a
              href="https://page.line.me/131liqrt"
              target="_blank"
              rel="noopener noreferrer"
              className="edl-cta-primary on-dark line"
            >
              LINEで体験セッションを申し込む
              <span className="arrow" />
            </a>
            <Link href="/" className="edl-cta-secondary on-dark">
              GIAについて見る
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
