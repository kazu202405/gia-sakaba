import { describe, expect, it } from "vitest";
import { canSendMealWish, isPaidSakabaPlan, resolveSakabaPlan } from "./billing-plans";

const prices = { standard: "price_480", dining: "price_880" };

describe("Sakaba billing plans", () => {
  it("distinguishes free, 480 and 880 from the actual Stripe price", () => {
    expect(resolveSakabaPlan({ role: "member", billing_status: "free", stripe_price_id: null }, prices)).toBe("free");
    expect(resolveSakabaPlan({ role: "member", billing_status: "active", stripe_price_id: "price_480" }, prices)).toBe("standard");
    expect(resolveSakabaPlan({ role: "member", billing_status: "active", stripe_price_id: "price_880" }, prices)).toBe("dining");
  });

  it("does not grant a wish when payment has failed or the price is unknown", () => {
    expect(resolveSakabaPlan({ role: "member", billing_status: "past_due", stripe_price_id: "price_880" }, prices)).toBe("free");
    expect(resolveSakabaPlan({ role: "member", billing_status: "active", stripe_price_id: "other" }, prices)).toBe("unknown");
    expect(canSendMealWish("free")).toBe(false);
    expect(canSendMealWish("standard")).toBe(false);
    expect(canSendMealWish("unknown")).toBe(false);
    expect(canSendMealWish("dining")).toBe(true);
    expect(canSendMealWish("exempt")).toBe(true);
  });

  it("accepts only known checkout plans", () => {
    expect(isPaidSakabaPlan("standard")).toBe(true);
    expect(isPaidSakabaPlan("dining")).toBe(true);
    expect(isPaidSakabaPlan("free")).toBe(false);
    expect(isPaidSakabaPlan("price_arbitrary")).toBe(false);
  });
});
