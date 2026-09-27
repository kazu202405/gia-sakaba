import type { Metadata } from "next";
import { PlanForm } from "@/components/guild/plan-form";
import { getMyGuildBilling } from "@/lib/guild/server-data";
import { resolveSakabaPlan } from "@/lib/guild/billing-plans";
import { getConfiguredSakabaPrices, getSakabaStripeMode } from "@/lib/stripe/client";

export const metadata: Metadata = { title: "会員プラン" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [billing, query] = await Promise.all([getMyGuildBilling(), searchParams]);
  const checkoutResult = query.checkout === "success" || query.checkout === "canceled" ? query.checkout : undefined;
  const currentPlan = resolveSakabaPlan(billing, getConfiguredSakabaPrices());
  const portalConfigName = getSakabaStripeMode() === "live" ? "STRIPE_PORTAL_SAKABA_CONFIG_LIVE" : "STRIPE_PORTAL_SAKABA_CONFIG_TEST";
  const diningEnabled = process.env.SAKABA_880_ENABLED === "true"
    && Boolean(getConfiguredSakabaPrices().dining)
    && Boolean(process.env[portalConfigName]);
  return <PlanForm
    role={billing.role}
    billingStatus={billing.billing_status}
    isPaid={billing.is_paid}
    hasCustomer={Boolean(billing.stripe_customer_id)}
    currentPlan={currentPlan}
    companyNoteBenefit={billing.company_note_benefit}
    diningEnabled={diningEnabled}
    checkoutResult={checkoutResult}
  />;
}
