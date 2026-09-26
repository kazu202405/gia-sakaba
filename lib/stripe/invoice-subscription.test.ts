import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { invoiceSubscriptionId } from "./invoice-subscription";

describe("invoiceSubscriptionId", () => {
  it("古いWebhookのinvoice.subscriptionを読む", () => {
    expect(invoiceSubscriptionId({ subscription: "sub_old" } as unknown as Stripe.Invoice)).toBe("sub_old");
  });

  it("新しいWebhookのparent.subscription_detailsを読む", () => {
    const invoice = { parent: { subscription_details: { subscription: "sub_new" } } };
    expect(invoiceSubscriptionId(invoice as unknown as Stripe.Invoice)).toBe("sub_new");
  });

  it("単発請求ではnullを返す", () => {
    expect(invoiceSubscriptionId({} as Stripe.Invoice)).toBeNull();
  });
});
