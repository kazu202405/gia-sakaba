import { describe, expect, it } from "vitest";
import { isCheckoutSessionId, isConfirmedSakabaCheckout } from "./checkout-return";

const paid = {
  mode: "subscription",
  status: "complete",
  payment_status: "paid",
  metadata: { purpose: "sakaba", user_id: "member-1" },
};

describe("isConfirmedSakabaCheckout", () => {
  it("本人の完了した酒場サブスクだけを確認済みにする", () => {
    expect(isConfirmedSakabaCheckout(paid, "member-1")).toBe(true);
    expect(isConfirmedSakabaCheckout(paid, "someone-else")).toBe(false);
    expect(isConfirmedSakabaCheckout({ ...paid, payment_status: "unpaid" }, "member-1")).toBe(false);
    expect(isConfirmedSakabaCheckout({ ...paid, status: "open" }, "member-1")).toBe(false);
    expect(isConfirmedSakabaCheckout({ ...paid, metadata: { purpose: "membership", user_id: "member-1" } }, "member-1")).toBe(false);
  });
});

describe("isCheckoutSessionId", () => {
  it("テストと本番の決済IDだけを受け付ける", () => {
    expect(isCheckoutSessionId("cs_test_123ABC")).toBe(true);
    expect(isCheckoutSessionId("cs_live_123ABC")).toBe(true);
    expect(isCheckoutSessionId("cs_test_123?next=evil")).toBe(false);
    expect(isCheckoutSessionId(undefined)).toBe(false);
  });
});
