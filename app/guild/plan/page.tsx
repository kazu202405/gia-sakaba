import type { Metadata } from "next";
import { PlanForm } from "@/components/guild/plan-form";
import { getMyGuildBilling } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "有料会員" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [billing, query] = await Promise.all([getMyGuildBilling(), searchParams]);
  const checkoutResult = query.checkout === "success" || query.checkout === "canceled" ? query.checkout : undefined;
  return <PlanForm
    role={billing.role}
    billingStatus={billing.billing_status}
    isPaid={billing.is_paid}
    hasCustomer={Boolean(billing.stripe_customer_id)}
    checkoutResult={checkoutResult}
  />;
}
