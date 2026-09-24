"use client";

import { useState } from "react";
import Link from "next/link";
import type { GuildBillingStatus } from "@/lib/guild/server-data";
import { ENTRY_PLAN_PRICE_LABEL, FREE_ACTIVE_PROJECT_LIMIT } from "@/lib/guild/membership";
import { BackLink, PageTitle, Window } from "./cards";

type Props = {
  role: "owner" | "master" | "member";
  billingStatus: GuildBillingStatus;
  isPaid: boolean;
  hasCustomer: boolean;
  checkoutResult?: "success" | "canceled";
};

export function PlanForm({ role, billingStatus, isPaid, hasCustomer, checkoutResult }: Props) {
  const [pending, setPending] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState("");
  const exempt = role === "owner" || role === "master" || billingStatus === "exempt";

  async function open(endpoint: "checkout" | "portal") {
    if (pending) return;
    setPending(endpoint); setError("");
    try {
      const response = await fetch(`/api/guild/billing/${endpoint}`, { method: "POST" });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "画面を開けませんでした。");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "画面を開けませんでした。");
      setPending(null);
    }
  }

  return <div className="space-y-9">
    <BackLink href="/guild/me" label="マイページ" />
    <PageTitle title="有料会員" lead="名鑑・クエスト・しょうかいは、無料のまま使えます。" />

    {checkoutResult === "success" && <div role="status" className="c-card border-[#8f7337] px-4 py-3 text-sm">
      <p>お申し込みを受け付けました。会員状態の反映まで少し時間がかかることがあります。プロジェクトは削除されていません。</p>
      <Link href="/guild/projects" className="c-button-sub mt-3 h-10 px-4">▶ プロジェクト一覧を見る</Link>
    </div>}
    {checkoutResult === "canceled" && <p role="status" className="c-card border-dashed px-4 py-3 text-sm">申し込みはキャンセルされました。料金は発生していません。</p>}

    <Window title="ないよう">
      <ul className="space-y-2 text-[15px] leading-relaxed">
        <li>▶ プロジェクトをいくつでも進められる（無料は{FREE_ACTIVE_PROJECT_LIMIT}つまで）</li>
        <li>▶ 有料会員限定の集まりに申し込める。</li>
      </ul>
      {!exempt && !isPaid && billingStatus !== "past_due" && <>
        <p className="mt-5 text-[15px] leading-relaxed">{ENTRY_PLAN_PRICE_LABEL}の月額制です。無料体験期間はありません。</p>
        <button type="button" disabled={pending !== null} onClick={() => void open("checkout")} className="rpg-button mt-5 h-12 w-full px-6 text-base disabled:opacity-50 sm:w-auto">{pending === "checkout" ? "決済画面を準備中…" : "▶ 有料会員に申し込む"}</button>
        {hasCustomer && <button type="button" disabled={pending !== null} onClick={() => void open("portal")} className="c-button-sub mt-3 h-11 w-full px-5 text-sm disabled:opacity-50 sm:ml-3 sm:w-auto">支払い履歴を見る</button>}
      </>}
    </Window>

    {exempt ? <Window title="会員の状態">
      <p className="text-[15px] leading-relaxed">ギルドの管理者は、料金なしですべての機能を利用できます。Stripeへの申し込みは必要ありません。</p>
    </Window> : isPaid ? <Window title="会員の状態">
      <p className="text-[15px]">現在、有料会員です。</p>
      <button type="button" disabled={pending !== null} onClick={() => void open("portal")} className="c-button-sub mt-5 h-11 px-5 text-sm disabled:opacity-50">{pending === "portal" ? "開いています…" : "支払い方法・解約を管理する"}</button>
    </Window> : billingStatus === "past_due" ? <Window title="会員の状態">
      <p className="text-[15px] leading-relaxed">お支払いを確認できていません。支払い方法を確認してください。</p>
      <button type="button" disabled={pending !== null} onClick={() => void open("portal")} className="rpg-button mt-5 h-12 w-full px-6 text-base disabled:opacity-50 sm:w-auto">{pending === "portal" ? "開いています…" : "▶ 支払いを確認する"}</button>
    </Window> : null}
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
  </div>;
}
