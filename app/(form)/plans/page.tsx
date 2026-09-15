// 料金・案内ページ（公開・ログイン不要）。
// 初見のプロスペクトがプランの違いを1枚で掴むための比較ページ。
// LINE等で配布する想定（gia2018.com/plans）。
//
// 載せる段（2026-08-11）:
//   無料 / オンライン ¥4,980 / リアル ¥7,980
//   invite ¥11,000 と premium ¥33,000 は非公開（URL直渡し）なので載せない。
//
// 特典の正本（2026-08-11 五島さん確認）:
//   オンライン … Company Note ＋ 講義録画
//   リアル     … ＋ オフライン会・研究会
//   （contexts/projects/gia/stock_school.md §12）
//
// それ以前に書かれていた「紹介コーチAI / ストーリー磨き / 紹介依頼の仲介 /
// 懇親会」は**誤り**だったため差し替えた。旧サロン(¥990)時代の特典が
// そのまま残っていたもの。同じ文言が /upgrade にもあったので揃えている。
//
// CTA 設計:
//   無料会員   → /join（セミナー不要の無料登録。登録後マイページへ）
//   サロン/本会員 → /join?next=/upgrade（未ログインは登録→/upgrade、ログイン済は直行）
//     ※ /upgrade 側で 990/4,980 を選んで決済。Stripe 未設定中は「準備中→LINE」に倒れる。

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { SALON_PLAN_ENABLED } from "@/lib/config/membership";

export const metadata = {
  title: "プラン・料金 | GIA",
  description: SALON_PLAN_ENABLED
    ? "GIA の会員プラン。無料会員・一般会員（月990円）・オンライン会員（月4,980円）。紹介を仕組みにする実践コミュニティ。"
    : "GIA の会員プラン。無料会員・オンライン会員（月4,980円）。紹介を仕組みにする実践コミュニティ。",
};

interface Plan {
  eyebrow: string;
  name: string;
  price: string;
  priceNote: string;
  tagline: string;
  features: string[];
  /** 上位プランの「〜のすべて」継承を示す前置き行（任意） */
  inherits?: string;
  cta: { label: string; href: string };
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    eyebrow: "Free",
    name: "無料会員",
    price: "¥0",
    priceNote: "",
    tagline: "まずは中をのぞく",
    features: [
      "メンバー一覧・プロフィールの閲覧",
      "あなたが書いた項目だけ、相手の同じ項目も読める",
      "自分のプロフィールを掲載",
    ],
    cta: { label: "無料ではじめる", href: "/join" },
  },
  {
    eyebrow: "Member",
    name: "一般会員",
    price: "¥990",
    priceNote: "/ 月（税別）",
    tagline: "自分を整える",
    inherits: "無料会員のすべて＋",
    features: [
      "紹介コーチAI 24時間相談",
      "自分のストーリー・紹介文をAIと磨く",
      "気になる人への紹介依頼（主催者が仲介）",
      // "自分の鑑定で自分のことが分かる（近日）", // 鑑定は近日のため一旦非表示
      "限定回・少人数会への案内",
    ],
    cta: { label: "一般会員になる", href: "/join?next=/upgrade" },
  },
  {
    // 2026-08-10: 右腕AIの提供を停止したため、特典とタグラインから外した。
    // /upgrade 側と同じ引き算のみ（新しい売り文句は足していない）。
    eyebrow: "Full Member",
    name: "オンライン会員",
    price: "¥4,980",
    priceNote: "/ 月（税別）",
    tagline: "紹介を仕組みにする、学びと実践の場",
    inherits: "一般会員のすべて＋",
    features: [
      "Company Note（企業分析アプリ）が使える",
      "講義の録画を見られる",
    ],
    cta: { label: "オンライン会員になる", href: "/join?next=/upgrade" },
    highlighted: true,
  },
  {
    // 2026-08-11 追加。中身の定義は contexts/projects/gia/stock_school.md §12
    //   オンライン … Company Note ＋ 講義録画
    //   リアル     … ＋ オフライン会・研究会   ← ここが差分
    // 差分だけを書き、オンライン側の特典は inherits で継承として示す。
    eyebrow: "Real Member",
    name: "リアル会員",
    price: "¥7,980",
    priceNote: "/ 月（税別）",
    tagline: "オフラインの場に参加する",
    inherits: "オンライン会員のすべて＋",
    features: ["オフライン会・研究会への参加"],
    // /upgrade は online 固定なので、段を指定できる /upgrade/real へ送る
    cta: { label: "リアル会員になる", href: "/join?next=/upgrade/real" },
  },
];

// 一般会員（¥990）を一旦クローズ中（SALON_PLAN_ENABLED=false）。
// 無料 → 本会員の2段に絞り、本会員は無料会員の特典を継承する見せ方に差し替える。
const VISIBLE_PLANS: Plan[] = SALON_PLAN_ENABLED
  ? PLANS
  : PLANS.filter((p) => p.eyebrow !== "Member").map((p) =>
      p.eyebrow === "Full Member"
        ? {
            ...p,
            inherits: "無料会員のすべて＋",
            features: [
              "Company Note（企業分析アプリ）が使える",
              "講義の録画を見られる",
            ],
          }
        : p
    );

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-20 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* ヘッダー */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
            <span>PLANS</span>
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
          </div>
          <h1 className="font-serif text-[28px] sm:text-[36px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mt-5">
            プランを選ぶ
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            紹介を仕組みにする実践コミュニティ。
            <br className="hidden sm:block" />
            まずは無料から。必要になったら、いつでも上のプランへ。
          </p>
        </header>

        {/* プラン比較（一般会員クローズ中は無料／本会員の2段） */}
        <div
          className={`grid gap-6 items-stretch ${
            VISIBLE_PLANS.length >= 3
              ? "md:grid-cols-3"
              : "md:grid-cols-2 max-w-3xl mx-auto"
          }`}
        >
          {VISIBLE_PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        {/* 補足 */}
        <p className="text-center text-[11px] text-[var(--gia-deck-sub)] mt-10 leading-relaxed">
          ※ {SALON_PLAN_ENABLED ? "一般会員・本会員は" : "本会員は"}いつでも解約可能。決済は Stripe（クレジットカード）。
          <br className="hidden sm:block" />
          上位プランは下位プランの特典をすべて含みます。
        </p>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="text-xs text-[var(--gia-deck-navy)] hover:text-[var(--gia-deck-gold)] underline underline-offset-4 decoration-[var(--gia-deck-line)] hover:decoration-[var(--gia-deck-gold)] transition-colors"
          >
            すでにアカウントをお持ちの方はログイン
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── プランカード ────────────────────────────────────────────────────
function PlanCard({ plan }: { plan: Plan }) {
  const { highlighted } = plan;
  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden flex flex-col ${
        highlighted
          ? "border-2 border-[var(--gia-deck-gold)]/50 shadow-[0_8px_30px_-12px_rgba(180,140,60,0.25)]"
          : "border border-[var(--gia-deck-line)] shadow-[0_1px_2px_rgba(28,53,80,0.04)]"
      }`}
    >
      <div className="p-7 sm:p-8 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em]">
            {plan.eyebrow.toUpperCase()}
          </span>
          {highlighted && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gia-deck-gold)]/15 text-[var(--gia-deck-gold)] tracking-[0.05em]">
              おすすめ
            </span>
          )}
        </div>
        <h2 className="font-serif text-xl font-bold text-[var(--gia-deck-navy)] tracking-[0.04em]">
          {plan.name}
        </h2>
        <p className="text-xs text-[var(--gia-deck-sub)] mt-1 mb-4">
          {plan.tagline}
        </p>

        <div className="flex items-baseline gap-1 mb-5">
          <span className="font-serif text-3xl font-bold text-[var(--gia-deck-navy)] tracking-tight">
            {plan.price}
          </span>
          {plan.priceNote && (
            <span className="text-xs text-[var(--gia-deck-sub)]">
              {plan.priceNote}
            </span>
          )}
        </div>

        {plan.inherits && (
          <p className="text-[11px] font-semibold text-[var(--gia-deck-navy)]/70 mb-2">
            {plan.inherits}
          </p>
        )}
        <ul className="space-y-2.5 text-sm text-[var(--gia-deck-ink)] leading-relaxed mb-7 flex-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[var(--gia-deck-gold)] flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Link
          href={plan.cta.href}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold tracking-[0.08em] py-3.5 px-6 transition-colors duration-200 ${
            highlighted
              ? "bg-[var(--gia-deck-navy)] text-white shadow-sm hover:bg-[var(--gia-deck-navy-deep)]"
              : "border border-[var(--gia-deck-navy)]/20 text-[var(--gia-deck-navy)] hover:bg-[var(--gia-deck-navy)]/[0.04]"
          }`}
        >
          {plan.cta.label}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
