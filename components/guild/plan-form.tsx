"use client";

import { useState } from "react";
import Link from "next/link";
import type { GuildBillingStatus } from "@/lib/guild/server-data";
import { SAKABA_PLAN_NAMES, type PaidSakabaPlan, type SakabaPlan } from "@/lib/guild/billing-plans";
import { PLAN_LIMITS } from "@/lib/guild/plan-usage";
import { BackLink, PageTitle, Window } from "./cards";

type Props = {
  role: "owner" | "master" | "member";
  billingStatus: GuildBillingStatus;
  isPaid: boolean;
  hasCustomer: boolean;
  currentPlan: SakabaPlan;
  companyNoteBenefit: boolean;
  diningEnabled: boolean;
  availabilityEnabled: boolean;
  checkoutResult?: "success" | "canceled";
};

// 数は PLAN_LIMITS（DBの sakaba.plan_limits と同じかをテストで見張っている）
const plans = [
  { key: "free", label: SAKABA_PLAN_NAMES.free, price: "0円", lead: "まず様子を見る・紹介を待つ", features: [`つながり申請は月${PLAN_LIMITS.free.intro}件`, `クエスト・集まりを出すのは月${PLAN_LIMITS.free.quest}件`, "名前・職業でメンバーを探せる", `プロジェクトは${PLAN_LIMITS.free.project}つまで`] },
  { key: "standard", label: SAKABA_PLAN_NAMES.standard, price: "月480円", lead: "月に何人か、自分から会いに行く", features: [`つながり申請は月${PLAN_LIMITS.standard.intro}件`, `クエスト・集まりを出すのは月${PLAN_LIMITS.standard.quest}件`, "業種・地域で絞り込み、「めいし」で並べて探せる", `プロジェクトは${PLAN_LIMITS.standard.project}つまで`, "有料会員限定の集まりに申し込める"] },
  { key: "dining", label: SAKABA_PLAN_NAMES.dining, price: "月880円", lead: "毎週動いて、仕事を回す", features: [`つながり申請は月${PLAN_LIMITS.dining.intro}件`, "クエスト・集まりは何件でも", "キーワードで本文まで探せる", "プロジェクトはいくつでも", "有料会員限定の集まりに申し込める", "会食の希望を管理者へ送れる"] },
] as const;

export function PlanForm({ role, billingStatus, isPaid, hasCustomer, currentPlan, companyNoteBenefit, diningEnabled, availabilityEnabled, checkoutResult }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const exempt = role === "owner" || role === "master" || billingStatus === "exempt";
  const hasActiveContract = billingStatus === "active" || billingStatus === "trialing";

  async function openCheckout(plan: PaidSakabaPlan) {
    if (pending) return;
    setPending(`checkout-${plan}`); setError("");
    try {
      const response = await fetch("/api/guild/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "決済画面を開けませんでした。");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "決済画面を開けませんでした。");
      setPending(null);
    }
  }

  async function openPortal(switchPlan = false) {
    if (pending) return;
    setPending(switchPlan ? "switch" : "portal"); setError("");
    try {
      const response = await fetch(`/api/guild/billing/portal${switchPlan ? "?switch=1" : ""}`, { method: "POST" });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "支払い管理を開けませんでした。");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "支払い管理を開けませんでした。");
      setPending(null);
    }
  }

  function actionFor(plan: "free" | PaidSakabaPlan) {
    if (exempt) return <span className="c-chip">管理者枠で利用可</span>;
    if (companyNoteBenefit) return plan === "dining" ? <span className="c-chip">Company Note特典で利用中</span> : null;
    if (currentPlan === plan) return <span className="c-chip">現在のプラン</span>;
    if (plan === "free") return <span className="c-muted text-xs">フリーに戻す場合は支払い管理から解約できます</span>;
    if (plan === "dining" && !diningEnabled) return <span className="c-muted text-sm">申し込みは準備中です</span>;
    if (billingStatus === "past_due") return <span className="c-muted text-sm">支払い方法を確認してから変更できます</span>;
    if (hasActiveContract) {
      if (!diningEnabled || (currentPlan !== "standard" && currentPlan !== "dining")) return null;
      return <button type="button" disabled={pending !== null} onClick={() => void openPortal(true)} className="c-button-sub inline-flex min-h-11 items-center px-4 text-sm disabled:opacity-50">
        {pending === "switch" ? "開いています…" : `${SAKABA_PLAN_NAMES[plan]}（月${plan === "dining" ? "880" : "480"}円）へ変更する`}
      </button>;
    }
    if (isPaid) return null;
    return <button type="button" disabled={pending !== null} onClick={() => void openCheckout(plan)} className="rpg-button inline-flex min-h-11 items-center px-4 text-sm disabled:opacity-50">
      {pending === `checkout-${plan}` ? "決済画面を準備中…" : `▶ ${SAKABA_PLAN_NAMES[plan]}（月${plan === "dining" ? "880" : "480"}円）に申し込む`}
    </button>;
  }

  return <div className="space-y-9">
    <BackLink href="/guild/me" label="マイページ" />
    <PageTitle title="会員プラン" lead="酒場は無料で使い始められます。使いたい機能に合わせて選んでください。" />

    {checkoutResult === "success" && <div role="status" className="c-card border-[#8f7337] px-4 py-3 text-sm">
      <p>お申し込みを受け付けました。会員状態の反映まで少し時間がかかることがあります。プロジェクトは削除されていません。</p>
      <Link href="/guild/projects" className="c-button-sub mt-3 h-10 px-4">▶ プロジェクト一覧を見る</Link>
    </div>}
    {checkoutResult === "canceled" && <p role="status" className="c-card border-dashed px-4 py-3 text-sm">申し込みはキャンセルされました。料金は発生していません。</p>}

    <section aria-label="3つの会員プラン" className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => <div key={plan.key} className={`c-window flex min-w-0 flex-col p-5 sm:p-6 ${plan.key === "dining" ? "border-[#8f7337]" : ""} ${(companyNoteBenefit ? plan.key === "dining" : currentPlan === plan.key) && !exempt ? "bg-[#f4ecd7]" : ""}`}>
        <p className="c-label w-fit text-xs">{plan.label}</p>
        <p className="mt-5 text-[28px] leading-none tracking-wide">{plan.price}<span className="ml-1 text-xs">{plan.key !== "free" && "（税込）"}</span></p>
        <p className="mt-4 min-h-14 text-sm leading-relaxed"><span className="c-label mb-1 block w-fit text-xs">こんな人に</span>{plan.lead}</p>
        <ul className="mt-4 flex-1 space-y-3 border-t border-[#1b2a41]/25 pt-4 text-sm leading-relaxed">
          {plan.features.map((feature) => <li key={feature} className="flex gap-2"><span aria-hidden="true">▶</span><span>{feature}</span></li>)}
          {plan.key === "dining" && availabilityEnabled && <li className="flex gap-2"><span aria-hidden="true">▶</span><span>会食に空いている日時を非公開で登録できる</span></li>}
        </ul>
        <div className="mt-6 min-h-12">{actionFor(plan.key)}</div>
      </div>)}
    </section>

    <div className="c-muted space-y-2 text-sm leading-relaxed">
      <p>つながり申請を受ける・クエストや集まりに参加する・名刺を載せる・入会のつながりは、どの段でも使えます。</p>
      <p>回数は毎月1日（日本時間）に戻ります。出した時点で数え、取り下げ・期限切れ・見送りになっても戻りません。クエストの参加希望者へ出すつながり申請は数えません。</p>
      <p>プラス・ビジネスは月額制で、無料体験はありません。有料会員向けの集まりは不定期開催で、申し込み後に承認が必要な場合があります。会食の開催・参加・希望どおりの出会いは保証されません。今後はビジネス限定の交流会も予定しています（開催時期未定）。プラン変更時の請求額はStripeの確認画面でお確かめください。</p>
    </div>

    {exempt ? <Window title="会員の状態">
        <p className="text-[15px] leading-relaxed">現在は管理者枠です。料金なしですべての機能を利用でき、Stripeへの申し込みは必要ありません。</p>
        {hasCustomer && <><p className="mt-3 text-sm leading-relaxed">過去の酒場の契約・支払い履歴がある場合は、支払い管理で確認できます。継続中の契約は管理者枠に変わっても自動解約されません。</p><button type="button" disabled={pending !== null} onClick={() => void openPortal()} className="c-button-sub mt-5 min-h-11 px-5 text-sm disabled:opacity-50">{pending === "portal" ? "開いています…" : "酒場の支払い・解約を管理する"}</button></>}
      </Window>
      : companyNoteBenefit ? <Window title="会員の状態">
        <p className="text-[15px] leading-relaxed">Company Noteの11,000円会員特典として、酒場のビジネス（月880円）の機能を利用できます。特典のために酒場へ申し込む必要はありません。</p>
        {hasActiveContract && <p className="mt-3 text-sm leading-relaxed">酒場の別契約は継続中です。特典が付いても自動解約されず、請求も止まりません。不要な場合は下のボタンから解約してください。</p>}
        {hasCustomer && <button type="button" disabled={pending !== null} onClick={() => void openPortal()} className="c-button-sub mt-5 min-h-11 px-5 text-sm disabled:opacity-50">{pending === "portal" ? "開いています…" : "酒場の支払い・解約を管理する"}</button>}
      </Window>
      : (isPaid || billingStatus === "past_due" || hasCustomer) ? <Window title="会員の状態">
        <p className="text-[15px] leading-relaxed">{billingStatus === "past_due" ? "お支払いを確認できていません。支払い方法を確認してください。" : currentPlan === "standard" ? "現在はプラス（月480円）です。" : currentPlan === "dining" ? "現在はビジネス（月880円）です。" : isPaid ? "現在、有料会員です。" : "現在はフリーです。"}</p>
        <button type="button" disabled={pending !== null} onClick={() => void openPortal()} className="c-button-sub mt-5 min-h-11 px-5 text-sm disabled:opacity-50">{pending === "portal" ? "開いています…" : (hasActiveContract || billingStatus === "past_due") ? "支払い方法・解約を管理する" : "支払い履歴を見る"}</button>
      </Window> : <Window title="会員の状態"><p className="text-[15px] leading-relaxed">現在はフリーです。上の比較から、いつでもプラス・ビジネスへの申し込みを選べます。</p></Window>}
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
  </div>;
}
