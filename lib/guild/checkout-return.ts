type CheckoutSnapshot = {
  mode: string | null;
  status: string | null;
  payment_status: string;
  metadata: Record<string, string> | null;
};

export function isCheckoutSessionId(value: string | undefined): value is string {
  return Boolean(value && /^cs_(?:test|live)_[A-Za-z0-9]+$/.test(value));
}

/** 戻り先のURLだけでは成功と見なさず、Stripeのセッションと本人を照合する。 */
export function isConfirmedSakabaCheckout(session: CheckoutSnapshot, userId: string): boolean {
  return session.mode === "subscription"
    && session.status === "complete"
    && session.payment_status === "paid"
    && session.metadata?.purpose === "sakaba"
    && session.metadata.user_id === userId;
}
