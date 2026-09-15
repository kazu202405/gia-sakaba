import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { startAiCloneAssistant, startAiClonePartner } from "../services/_ai/_actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "お申し込み・ご相談 | 右腕AI | GIA",
  description:
    "右腕AIを始める。プランを選んですぐ始めるか、まずは体験セッション・個別相談から。会社の規模・課題に合わせてご案内します。",
  alternates: { canonical: "/start" },
};

const LINE_URL = "https://page.line.me/131liqrt";

const selfServePlans = [
  {
    name: "アシスタント",
    price: "¥4,980",
    priceNote: "/月",
    body: "紹介の種拾い・商談前準備・振り返りを毎日の仕組みに。まず1人で始める基本装備。",
    points: ["会話・人物・案件の記録と想起", "毎日の売上行動3件の提案", "Slack / LINE / Web で完結"],
    action: startAiCloneAssistant,
  },
  {
    name: "パートナー",
    price: "¥7,980",
    priceNote: "/月",
    body: "アシスタント全機能 + 能動的に動く右腕。商談前リマインド・夕方の振り返りまで。",
    points: ["アシスタントの全機能", "1日2回以上の能動通知", "商談前リマインド・夕方の振り返り"],
    action: startAiClonePartner,
    recommended: true,
  },
];

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const checkoutUnavailable = checkout === "unavailable";
  return (
    <div className="min-h-screen bg-[var(--edl-off-white)] text-[var(--edl-body)]">
      {checkoutUnavailable && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-xl">
          <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm leading-relaxed shadow-lg">
            ただいまオンライン決済を準備中です。お申し込みご希望の方は、お手数ですが
            LINE・お問い合わせよりご連絡ください。順次ご案内いたします。
          </div>
        </div>
      )}
      {/* Hero */}
      <section className="px-6 md:px-16 pt-32 md:pt-40 pb-12 md:pb-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[920px] mx-auto text-center">
          <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.34em] text-[var(--edl-gold)] uppercase mb-4">
            Get Started
          </p>
          <h1
            className="text-[var(--edl-navy)] font-bold"
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: "clamp(26px, 4vw, 44px)",
              lineHeight: 1.4,
              letterSpacing: "0.02em",
            }}
          >
            右腕AIを、始める。
          </h1>
          <p className="mt-5 text-[14px] md:text-[15px] leading-[2] text-[var(--edl-muted)] max-w-[44ch] mx-auto">
            プランを選んですぐ始める。あるいは、まず体験セッション・個別相談から。
            会社の規模や課題に合わせてご案内します。
          </p>
        </div>
      </section>

      {/* 2つの道 */}
      <section className="px-6 md:px-16 py-16 md:py-24">
        <div className="max-w-[1080px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* A. すぐ始める（プラン選択→決済） */}
          <div className="flex flex-col">
            <div className="mb-6">
              <span className="inline-block text-[11px] tracking-[0.2em] text-[var(--edl-gold)] uppercase font-[family-name:var(--font-en)]">
                Plan A
              </span>
              <h2
                className="mt-2 text-[var(--edl-navy)] font-bold"
                style={{ fontFamily: "'Noto Serif JP', serif", fontSize: "clamp(19px, 2.2vw, 24px)" }}
              >
                プランを選んで、すぐ始める
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {selfServePlans.map((p) => (
                <div
                  key={p.name}
                  className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
                    p.recommended
                      ? "border-[var(--edl-navy)] shadow-[0_12px_40px_-16px_rgba(15,31,51,0.25)]"
                      : "border-[var(--edl-line)]"
                  }`}
                >
                  {p.recommended && (
                    <span className="absolute -top-3 left-6 rounded-full bg-[var(--edl-navy)] px-3 py-1 text-[10px] font-medium tracking-[0.1em] text-white">
                      おすすめ
                    </span>
                  )}
                  <h3 className="text-[15px] font-bold text-[var(--edl-navy)]">{p.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-[26px] font-bold text-[var(--edl-navy)]">{p.price}</span>
                    <span className="text-[12px] text-[var(--edl-muted)]">{p.priceNote}</span>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-[1.9] text-[var(--edl-muted)]">{p.body}</p>
                  <ul className="mt-4 space-y-2 flex-1">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-[12.5px] text-[var(--edl-body)]">
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--edl-gold)]" />
                        <span className="leading-[1.7]">{pt}</span>
                      </li>
                    ))}
                  </ul>
                  <form action={p.action} className="mt-5">
                    <SubmitButton
                      pendingText="決済へ移動中…"
                      className={`w-full rounded-xl px-4 py-3 text-[13px] font-semibold tracking-[0.06em] transition-colors disabled:opacity-60 ${
                        p.recommended
                          ? "bg-[var(--edl-navy)] text-white hover:bg-[var(--edl-navy)]/90"
                          : "border border-[var(--edl-navy)] text-[var(--edl-navy)] hover:bg-[var(--edl-navy)] hover:text-white"
                      }`}
                    >
                      このプランで始める
                    </SubmitButton>
                  </form>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-[1.9] text-[var(--edl-muted)]">
              ※ お申し込みにはログイン（新規登録）が必要です。決済はオンライン準備中の場合があり、
              その際はご案内画面に切り替わります。
            </p>
          </div>

          {/* B. まず相談・体験（LINE） */}
          <div className="flex flex-col rounded-2xl border border-[var(--edl-line)] bg-[var(--edl-navy)] p-8 text-white">
            <span className="inline-block text-[11px] tracking-[0.2em] text-[var(--edl-gold)] uppercase font-[family-name:var(--font-en)]">
              Plan B
            </span>
            <h2
              className="mt-2 font-bold"
              style={{ fontFamily: "'Noto Serif JP', serif", fontSize: "clamp(19px, 2.2vw, 24px)" }}
            >
              まずは、体験・個別相談から
            </h2>
            <p className="mt-4 text-[13px] leading-[2] text-white/80">
              「自社に合うか」「どう使うか」を、実際の画面と御社の状況で一緒に確かめます。
              チーム導入（¥29,800〜）やカスタマイズ（¥150,000〜）は、課題に合わせて個別にご案内します。
            </p>
            <ul className="mt-5 space-y-2 flex-1">
              {["5分のデモで「忘れている売上の掘り起こし」を体験", "御社の人脈・案件での使い方を相談", "チーム / カスタムの見積もり"].map(
                (t) => (
                  <li key={t} className="flex items-start gap-2 text-[13px] text-white/90">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--edl-gold)]" />
                    <span className="leading-[1.8]">{t}</span>
                  </li>
                ),
              )}
            </ul>
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#06C755] px-5 py-3.5 text-[13px] font-semibold tracking-[0.06em] text-white transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" />
              LINEで体験セッションを申し込む
            </a>
          </div>
        </div>

        {/* 詳細LPへ */}
        <div className="max-w-[1080px] mx-auto mt-12 text-center">
          <Link
            href="/services/ai"
            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--edl-navy)] no-underline hover:text-[var(--edl-gold)] transition-colors"
          >
            右腕AIの詳細・全プランを見る
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
