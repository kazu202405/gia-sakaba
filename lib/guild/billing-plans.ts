export type PaidSakabaPlan = "standard" | "dining";
export type SakabaPlan = "free" | PaidSakabaPlan | "exempt" | "unknown";

export const SAKABA_PLAN_NAMES = {
  free: "フリー",
  standard: "プラス",
  dining: "ビジネス",
} as const;

type BillingSnapshot = {
  role: "owner" | "master" | "member";
  billing_status: string;
  stripe_price_id: string | null;
  company_note_benefit?: boolean;
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

// A Company Note subscription grants access, but is not a Sakaba Stripe contract.
// Keep the two plans separate so existing Sakaba charges remain visible/manageable.
export function resolveSakabaAccessPlan(
  billing: BillingSnapshot,
  prices: { standard: string | undefined; dining: string | undefined },
): SakabaPlan {
  const contractPlan = resolveSakabaPlan(billing, prices);
  if (contractPlan === "exempt") return contractPlan;
  return billing.company_note_benefit ? "dining" : contractPlan;
}

export function canSendMealWish(plan: SakabaPlan): boolean {
  return plan === "dining" || plan === "exempt";
}

export function isPaidSakabaPlan(value: unknown): value is PaidSakabaPlan {
  return value === "standard" || value === "dining";
}
