import type Stripe from "stripe";

/** WebhookのAPIバージョンによって異なる請求書のサブスク参照位置を吸収する。 */
export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
  const subscription = invoice.parent?.subscription_details?.subscription ?? legacy ?? null;
  return typeof subscription === "string" ? subscription : subscription?.id ?? null;
}
