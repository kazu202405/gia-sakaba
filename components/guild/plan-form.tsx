"use client";

import { useState } from "react";
import Link from "next/link";
import type { GuildBillingStatus } from "@/lib/guild/server-data";
import type { PaidSakabaPlan, SakabaPlan } from "@/lib/guild/billing-plans";
import { FREE_ACTIVE_PROJECT_LIMIT } from "@/lib/guild/membership";
import { BackLink, PageTitle, Window } from "./cards";

type Props = {
  role: "owner" | "master" | "member";
  billingStatus: GuildBillingStatus;
  isPaid: boolean;
  hasCustomer: boolean;
  currentPlan: SakabaPlan;
  diningEnabled: boolean;
  checkoutResult?: "success" | "canceled";
};

const plans = [
  { key: "free", label: "無料", price: "0円", lead: "仲間を知り、相談や集まりを見つける。", features: ["ギルド・クエストを使える", `プロジェクトは${FREE_ACTIVE_PROJECT_LIMIT}件まで`] },
  { key: "standard", label: "480円会員", price: "月480円", lead: "プロジェクトの記録を、数を気にせず残す。", features: ["無料プランの内容すべて", "プロジェクトをいくつでも作れる", "有料会員限定の集まりに申し込める"] },
  { key: "dining", label: "880円会員", price: "月880円", lead: "会って話したい人やテーマの希望を届ける。", features: ["480円会員の内容すべて", "会食の希望をギルドマスターへ送れる"] },
] as const;

export function PlanForm({ role, billingStatus, isPaid, hasCustomer, currentPlan, diningEnabled, checkoutResult }: Props) {
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
    if (exempt) return <span className="c-chip">管理者は全機能を利用できます</span>;
    if (currentPlan === plan) return <span className="c-chip">現在のプラン</span>;
    if (plan === "free") return <span className="c-muted text-xs">無料への変更は支払い管理から解約できます</span>;
    if (plan === "dining" && !diningEnabled) return <span className="c-muted text-sm">申し込みは準備中です</span>;
    if (billingStatus === "past_due") return <span className="c-muted text-sm">支払い方法を確認してから変更できます</span>;
    if (hasActiveContract) {
      if (!diningEnabled || (currentPlan !== "standard" && currentPlan !== "dining")) return null;
      return <button type="button" disabled={pending !== null} onClick={() => void openPortal(true)} className="c-button-sub inline-flex min-h-11 items-center px-4 text-sm disabled:opacity-50">
        {pending === "switch" ? "開いています…" : `${plan === "dining" ? "880円" : "480円"}へ変更する`}
      </button>;
    }
    if (isPaid) return null;
    return <button type="button" disabled={pending !== null} onClick={() => void openCheckout(plan)} className="rpg-button inline-flex min-h-11 items-center px-4 text-sm disabled:opacity-50">
      {pending === `checkout-${plan}` ? "決済画面を準備中…" : `▶ ${plan === "dining" ? "880円" : "480円"}会員に申し込む`}
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
      {plans.map((plan) => <div key={plan.key} className={`c-window flex min-w-0 flex-col p-5 sm:p-6 ${plan.key === "dining" ? "border-[#8f7337]" : ""}`}>
        <p className="c-label w-fit text-xs">{plan.label}</p>
        <p className="mt-5 text-[28px] leading-none tracking-wide">{plan.price}<span className="ml-1 text-xs">{plan.key !== "free" && "（税込）"}</span></p>
        <p className="mt-4 min-h-14 text-sm leading-relaxed">{plan.lead}</p>
        <ul className="mt-4 flex-1 space-y-3 border-t border-[#1b2a41]/25 pt-4 text-sm leading-relaxed">
          {plan.features.map((feature) => <li key={feature} className="flex gap-2"><span aria-hidden="true">▶</span><span>{feature}</span></li>)}
        </ul>
        <div className="mt-6 min-h-12">{actionFor(plan.key)}</div>
      </div>)}
    </section>

    <p className="c-muted text-sm leading-relaxed">480円・880円は月額制で、無料体験はありません。限定の集まりは不定期開催で、申し込み後に承認が必要な場合があります。880円では会食の希望を送れますが、開催・参加・希望どおりの出会いは保証されません。プラン変更時の請求額はStripeの確認画面でお確かめください。</p>

    {exempt ? <Window title="会員の状態"><p className="text-[15px] leading-relaxed">ギルドの管理者は、料金なしですべての機能を利用できます。Stripeへの申し込みは必要ありません。</p></Window>
      : (isPaid || billingStatus === "past_due" || hasCustomer) ? <Window title="会員の状態">
        <p className="text-[15px] leading-relaxed">{billingStatus === "past_due" ? "お支払いを確認できていません。支払い方法を確認してください。" : currentPlan === "standard" ? "現在、480円会員です。" : currentPlan === "dining" ? "現在、880円会員です。" : isPaid ? "現在、有料会員です。" : "現在は無料会員です。"}</p>
        <button type="button" disabled={pending !== null} onClick={() => void openPortal()} className="c-button-sub mt-5 min-h-11 px-5 text-sm disabled:opacity-50">{pending === "portal" ? "開いています…" : "支払い方法・解約を管理する"}</button>
      </Window> : null}
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
  </div>;
}
