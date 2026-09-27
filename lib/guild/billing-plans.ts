export type PaidSakabaPlan = "standard" | "dining";
export type SakabaPlan = "free" | PaidSakabaPlan | "exempt" | "unknown";

type BillingSnapshot = {
  role: "owner" | "master" | "member";
  billing_status: string;
  stripe_price_id: string | null;
};

export function resolveSakabaPlan(
  billing: BillingSnapshot,
  prices: { standard: string | undefined; dining: string | undefined },
): SakabaPlan {
  if (billing.role === "owner" || billing.role === "master" || billing.billing_status === "exempt") {
    return "exempt";
  }
  if (billing.billing_status !== "active" && billing.billing_status !== "trialing") return "free";
  if (prices.dining && billing.stripe_price_id === prices.dining) return "dining";
  if (prices.standard && billing.stripe_price_id === prices.standard) return "standard";
  return "unknown";
}

export function canSendMealWish(plan: SakabaPlan): boolean {
  return plan === "dining" || plan === "exempt";
}

export function isPaidSakabaPlan(value: unknown): value is PaidSakabaPlan {
  return value === "standard" || value === "dining";
}
