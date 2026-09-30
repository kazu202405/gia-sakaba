"use client";

import { useState } from "react";
import Link from "next/link";
import type { GuildBillingStatus } from "@/lib/guild/server-data";
import { SAKABA_PLAN_NAMES, type PaidSakabaPlan, type SakabaPlan } from "@/lib/guild/billing-plans";
import { PLAN_LIMITS } from "@/lib/guild/plan-usage";
import { BackLink, PageTitle, Window } from "./cards";
import { PHRASE_WRAP, Ph } from "./phrase";
import { EnterprisePlan } from "./enterprise-plan";

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

// 数は PLAN_LIMITS（DBの sakaba.plan_limits と同じかをテストで見張っている）。
// 文の中の | は折り返してよい位置（components/guild/phrase.tsx）
type Feature = { title: string; desc: string };
const F = {
  intro: (n: number | null): Feature => ({ title: `つながり申請 月${n}件`, desc: "気になるメンバーに|「会ってみたい」と|申し込めます。|相手が承諾すると、|お互いの連絡先が|見えます。" }),
  quest: (n: number | null): Feature => ({ title: n === null ? "クエスト・集まり 何件でも" : `クエスト・集まり 月${n}件`, desc: "仕事の依頼や相談、|飲み会などの|呼びかけを、|掲示板に出せます。" }),
  project: (n: number | null): Feature => ({ title: n === null ? "プロジェクト いくつでも" : `プロジェクト ${n}つまで`, desc: "自分の仕事を|タスクに分けて|進める記録帳です。" }),
  nameSearch: { title: "名前・職業で探す", desc: "メンバー名鑑で、|名前や職業から|人を探せます。" },
  filter: { title: "絞り込み・めいし表示", desc: "業種や地域で|しぼり込んだり、|名刺の画像を|並べて見たりできます。" },
  keyword: { title: "キーワード検索", desc: "自己紹介や|さがしているものなど、|本文の言葉まで|探せます。" },
  members: { title: "有料会員限定の集まり", desc: "管理者が開く|会員限定の集まりに|申し込めます。" },
  wish: { title: "会食の希望", desc: "会ってみたい人や|話したいテーマを、|管理者に伝えられます。" },
  availability: { title: "会食のマッチング", desc: "空いている日時を|登録しておくと、|日程の合うメンバーが|数名そろったときに、|管理者から|会食のご案内が|届きます。|（登録した日時が|見えるのは、|あなたと管理者|だけです）" },
} satisfies Record<string, Feature | ((n: number | null) => Feature)>;

const plans = [
  { key: "free", label: SAKABA_PLAN_NAMES.free, price: "0円", lead: "まず様子を見る・|紹介を待つ", features: [F.intro(PLAN_LIMITS.free.intro), F.quest(PLAN_LIMITS.free.quest), F.nameSearch, F.project(PLAN_LIMITS.free.project)] },
  { key: "standard", label: SAKABA_PLAN_NAMES.standard, price: "月480円", lead: "月に何人か、|自分から|会いに行く", features: [F.intro(PLAN_LIMITS.standard.intro), F.quest(PLAN_LIMITS.standard.quest), F.nameSearch, F.filter, F.project(PLAN_LIMITS.standard.project), F.members] },
  { key: "dining", label: SAKABA_PLAN_NAMES.dining, price: "月880円", lead: "毎週動いて、|仕事を回す", features: [F.intro(PLAN_LIMITS.dining.intro), F.quest(PLAN_LIMITS.dining.quest), F.filter, F.keyword, F.project(PLAN_LIMITS.dining.project), F.members, F.wish] },
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
    if (plan === "free") return <span className="c-muted text-xs">フリープランに戻す場合は支払い管理から解約できます</span>;
    if (plan === "dining" && !diningEnabled) return <span className="c-muted text-sm">申し込みは準備中です</span>;
    if (billingStatus === "past_due") return <span className="c-muted text-sm">支払い方法を確認してから変更できます</span>;
    if (hasActiveContract) {
      if (!diningEnabled || (currentPlan !== "standard" && currentPlan !== "dining")) return null;
      return <button type="button" disabled={pending !== null} onClick={() => void openPortal(true)} className="c-button-sub inline-flex min-h-11 items-center px-4 text-sm disabled:opacity-50">
        {pending === "switch" ? "開いています…" : <Ph text={`${SAKABA_PLAN_NAMES[plan]}|（月${plan === "dining" ? "880" : "480"}円）へ|変更する`} />}
      </button>;
    }
    if (isPaid) return null;
    return <button type="button" disabled={pending !== null} onClick={() => void openCheckout(plan)} className="rpg-button inline-flex min-h-11 items-center px-4 text-sm disabled:opacity-50">
      {pending === `checkout-${plan}` ? "決済画面を準備中…" : <Ph text={`▶ ${SAKABA_PLAN_NAMES[plan]}|（月${plan === "dining" ? "880" : "480"}円）に|申し込む`} />}
    </button>;
  }

  return <div className="space-y-9">
    <BackLink href="/guild/me" label="マイページ" />
    <PageTitle title="会員プラン" lead={<span className={PHRASE_WRAP}><Ph text="酒場は無料で|使い始められます。|使いたい機能に|合わせて|選んでください。" /></span>} />

    {checkoutResult === "success" && <div role="status" className="c-card border-[#8f7337] px-4 py-3 text-sm">
      <p>お申し込みを受け付けました。会員状態の反映まで少し時間がかかることがあります。プロジェクトは削除されていません。</p>
      <Link href="/guild/projects" className="c-button-sub mt-3 h-10 px-4">▶ プロジェクト一覧を見る</Link>
    </div>}
    {checkoutResult === "canceled" && <p role="status" className="c-card border-dashed px-4 py-3 text-sm">申し込みはキャンセルされました。料金は発生していません。</p>}

    <section aria-label="3つの会員プラン" className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => <div key={plan.key} className={`c-window flex min-w-0 flex-col p-5 sm:p-6 ${PHRASE_WRAP} ${plan.key === "dining" ? "border-[#8f7337]" : ""} ${(companyNoteBenefit ? plan.key === "dining" : currentPlan === plan.key) && !exempt ? "bg-[#f4ecd7]" : ""}`}>
        {/* 名前と同じドット文字の大きさ（16pxの倍数だと升目どおりに出る） */}
        <h2 className="guild-px text-[32px] leading-none tracking-[0.15em]">{plan.label}</h2>
        <p className="mt-4 text-[28px] leading-none tracking-wide">{plan.price}<span className="ml-1 text-xs">{plan.key !== "free" && "（税込）"}</span></p>
        <p className="mt-5 min-h-14 text-[15px] leading-relaxed"><span className="c-label mb-1 block w-fit text-base">こんな人に</span><Ph text={plan.lead} /></p>
        <ul className="mt-4 flex-1 space-y-4 border-t border-[#1b2a41]/25 pt-4">
          {[...plan.features, ...(plan.key === "dining" && availabilityEnabled ? [F.availability] : [])].map((feature) => <li key={feature.title} className="flex gap-2">
            <span aria-hidden="true" className="text-sm leading-relaxed">▶</span>
            <span className="min-w-0">
              <span className="block text-[15px] leading-relaxed">{feature.title}</span>
              <span className="c-muted block text-xs leading-relaxed"><Ph text={feature.desc} /></span>
            </span>
          </li>)}
        </ul>
        <div className="mt-6 min-h-12">{actionFor(plan.key)}</div>
      </div>)}
    </section>
    {/* 押した場所の近くに出す（ページの一番下だと、画面の外で気づかれない） */}
    {error && <p role="alert" className="c-card border-[#c62828] px-4 py-3 text-sm text-[#c62828]">{error}</p>}

    <EnterprisePlan isMaster={exempt && role !== "member"} />

    <div className={`space-y-5 text-sm leading-relaxed ${PHRASE_WRAP}`}>
      <div className="space-y-2">
        <p><Ph text="プランで変わるのは、|自分から動く回数|（つながり申請・|クエストを出す）と、|人を探す・|仕事を記録する|道具です。" /></p>
        <p><Ph text="つながり申請を受ける・|クエストや集まりに|参加する・|名刺を載せる・|入会のつながりは、|どの⁠「プラン」⁠でも|使えます。" /></p>
      </div>
      <div>
        <p className="c-label text-base">かいすうの かぞえかた</p>
        <ul className="c-muted mt-2 space-y-1.5">
          <li>▶ <Ph text="回数は毎月1日|（日本時間）に|戻ります。" /></li>
          <li>▶ <Ph text="出した時点で数え、|取り下げ・期限切れ・|見送りになっても|戻りません。" /></li>
          <li>▶ <Ph text="クエストの参加希望者へ|出すつながり申請は|数えません。" /></li>
        </ul>
      </div>
      <div>
        <p className="c-label text-base">おしはらい について</p>
        <ul className="c-muted mt-2 space-y-1.5">
          <li>▶ <Ph text="プラスプラン・|ビジネスプランは|月額制で、|無料体験は|ありません。" /></li>
          <li>▶ <Ph text="有料会員向けの集まりは|不定期開催で、|申し込み後に|承認が必要な場合が|あります。" /></li>
          <li>▶ <Ph text="会食の開催・参加・|希望どおりの出会いは|保証されません。" /></li>
          <li>▶ <Ph text="今後はビジネスプラン限定の|交流会も|予定しています|（開催時期未定）。" /></li>
          <li>▶ <Ph text="プラン変更時の請求額は、|Stripeの確認画面で|お確かめください。" /></li>
        </ul>
      </div>
    </div>

    {exempt ? <Window title="会員の状態">
        <p className="text-[15px] leading-relaxed">現在は管理者枠です。料金なしですべての機能を利用でき、Stripeへの申し込みは必要ありません。</p>
        {hasCustomer && <><p className="mt-3 text-sm leading-relaxed">過去の酒場の契約・支払い履歴がある場合は、支払い管理で確認できます。継続中の契約は管理者枠に変わっても自動解約されません。</p><button type="button" disabled={pending !== null} onClick={() => void openPortal()} className="c-button-sub mt-5 min-h-11 px-5 text-sm disabled:opacity-50">{pending === "portal" ? "開いています…" : "酒場の支払い・解約を管理する"}</button></>}
      </Window>
      : companyNoteBenefit ? <Window title="会員の状態">
        <p className="text-[15px] leading-relaxed">Company Noteの11,000円会員特典として、酒場のビジネスプラン（月880円）の機能を利用できます。特典のために酒場へ申し込む必要はありません。</p>
        {hasActiveContract && <p className="mt-3 text-sm leading-relaxed">酒場の別契約は継続中です。特典が付いても自動解約されず、請求も止まりません。不要な場合は下のボタンから解約してください。</p>}
        {hasCustomer && <button type="button" disabled={pending !== null} onClick={() => void openPortal()} className="c-button-sub mt-5 min-h-11 px-5 text-sm disabled:opacity-50">{pending === "portal" ? "開いています…" : "酒場の支払い・解約を管理する"}</button>}
      </Window>
      : (isPaid || billingStatus === "past_due" || hasCustomer) ? <Window title="会員の状態">
        <p className="text-[15px] leading-relaxed">{billingStatus === "past_due" ? "お支払いを確認できていません。支払い方法を確認してください。" : currentPlan === "standard" ? "現在はプラスプラン（月480円）です。" : currentPlan === "dining" ? "現在はビジネスプラン（月880円）です。" : isPaid ? "現在、有料会員です。" : "現在はフリープランです。"}</p>
        <button type="button" disabled={pending !== null} onClick={() => void openPortal()} className="c-button-sub mt-5 min-h-11 px-5 text-sm disabled:opacity-50">{pending === "portal" ? "開いています…" : (hasActiveContract || billingStatus === "past_due") ? "支払い方法・解約を管理する" : "支払い履歴を見る"}</button>
      </Window> : <Window title="会員の状態"><p className="text-[15px] leading-relaxed">現在はフリープランです。上の比較から、いつでもプラスプラン・ビジネスプランへの申し込みを選べます。</p></Window>}
  </div>;
}
