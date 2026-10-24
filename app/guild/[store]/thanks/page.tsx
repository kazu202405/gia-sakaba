import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageTitle, Window } from "@/components/guild/cards";
import { isCheckoutSessionId, isConfirmedSakabaCheckout } from "@/lib/guild/checkout-return";
import { getMyGuildBilling } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/server";
import { getSakabaStripeClient } from "@/lib/stripe/client";
import { currentStore } from "@/lib/guild/current-store";
import { outsideStorePath } from "@/lib/guild/store-path";
import { Go } from "@/components/guild/go-mark";

export const metadata: Metadata = { title: "お申し込みありがとうございます" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ session_id?: string; from?: string }> };

export default async function GuildThanksPage({ searchParams }: Props) {
  const store = await currentStore();
  const query = await searchParams;
  const sessionId = query.session_id;
  if (!isCheckoutSessionId(sessionId)) redirect(store.path("/plan"));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(outsideStorePath("login", `?next=${encodeURIComponent(store.path("/plan"))}`));

  let confirmed = false;
  let unavailable = false;
  try {
    const session = await getSakabaStripeClient().checkout.sessions.retrieve(sessionId);
    confirmed = isConfirmedSakabaCheckout(session, user.id);
  } catch {
    unavailable = true;
  }

  if (!confirmed && !unavailable) redirect(store.path("/plan"));

  let reflected = false;
  if (confirmed) {
    try { reflected = (await getMyGuildBilling()).is_paid; }
    catch { /* 支払いは確認済み。DB反映の確認だけ後でやり直せる。 */ }
  }

  const returnToProjects = query.from === "projects";
  const primaryHref = returnToProjects ? store.path("/projects") : store.path("/me");
  const primaryLabel = returnToProjects ? <><Go />プロジェクトを見る</> : <><Go />マイページへ</>;

  return <div className="mx-auto max-w-2xl space-y-9">
    <PageTitle title={confirmed ? "ありがとうございました" : "決済状況を確認しています"} lead={confirmed
      ? `${store.config.name}の有料会員にお申し込みいただき、ありがとうございます。`
      : "決済の確認に少し時間がかかっています。この画面を再読み込みしてください。"} />
    <Window title={confirmed ? "お申し込みの確認" : "確認中"}>
      {confirmed ? <>
        <p className="text-[15px] leading-relaxed">Stripeでのお支払いを確認しました。</p>
        <p className="c-muted mt-3 text-sm leading-relaxed">{reflected
          ? "有料会員の機能を利用できます。"
          : "会員状態の反映には少し時間がかかることがあります。反映されない場合は、少し待ってから開き直してください。"}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={primaryHref} className="rpg-button inline-flex min-h-12 items-center px-5">{primaryLabel}</Link>
          <Link href={store.path("/plan")} className="c-button-sub inline-flex min-h-12 items-center px-5">会員の状態を見る</Link>
        </div>
      </> : <>
        <p className="text-sm leading-relaxed">確認が続く場合は、マイページで会員の状態をご確認ください。決済を繰り返さないでください。</p>
        <Link href={store.path("/plan")} className="c-button-sub mt-5 inline-flex min-h-12 items-center px-5">会員の状態を見る</Link>
      </>}
    </Window>
  </div>;
}
