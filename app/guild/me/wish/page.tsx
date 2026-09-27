import type { Metadata } from "next";
import Link from "next/link";
import { BackLink, PageTitle, Window } from "@/components/guild/cards";
import { MealWishEditor } from "@/components/guild/meal-wish-editor";
import { MealAvailabilityEditor } from "@/components/guild/meal-availability-editor";
import { canSendMealWish, resolveSakabaAccessPlan } from "@/lib/guild/billing-plans";
import { getMyMealAvailability } from "@/lib/guild/meal-availability-server";
import { getMealWish } from "@/lib/guild/meal-wishes-server";
import { getMyGuildBilling } from "@/lib/guild/server-data";
import { getConfiguredSakabaPrices } from "@/lib/stripe/client";

export const metadata: Metadata = { title: "会食の希望" };

export default async function MealWishPage() {
  const billing = await getMyGuildBilling();
  const eligible = canSendMealWish(resolveSakabaAccessPlan(billing, getConfiguredSakabaPrices()));
  const enabled = process.env.SAKABA_880_ENABLED === "true";
  const wish = eligible && enabled ? await getMealWish(billing.guild_id, billing.user_id) : null;
  const availabilityEnabled = enabled && process.env.SAKABA_AVAILABILITY_ENABLED === "true";
  const availability = eligible && availabilityEnabled ? await getMyMealAvailability(billing.guild_id, billing.user_id) : [];

  return <div className="space-y-9">
    <BackLink href="/guild/me" label="マイページ" />
    <PageTitle title="会食の希望" lead="会って話したい人やテーマを、ギルドマスターに伝えられます。" />
    <Window title="希望を伝える">
      {!enabled ? <p className="text-sm">この機能は準備中です。</p>
        : !eligible ? <div className="space-y-4 text-sm"><p>会食の希望は、会食プラン（月880円）から送れます。</p><Link href="/guild/plan" className="c-button-sub inline-flex min-h-11 items-center px-4">会員プランを見る</Link></div>
          : <MealWishEditor initialText={wish?.wish_text ?? ""} />}
    </Window>
    {eligible && availabilityEnabled && <Window title="会食に空いている日時"><MealAvailabilityEditor initial={availability} /></Window>}
    <p className="c-muted text-sm leading-relaxed">希望を受け取っても、会食の開催・参加や、希望に合う人との出会いを約束するものではありません。</p>
  </div>;
}
