import { afterEach, describe, expect, it, vi } from "vitest";
import { getSakabaPriceId, getSakabaStripeMode, getStripeMode } from "./client";

afterEach(() => vi.unstubAllEnvs());

describe("酒場だけのStripeモード", () => {
  it("酒場を本番にしても共通GIA決済はテストのまま", () => {
    vi.stubEnv("STRIPE_MODE", "test");
    vi.stubEnv("SAKABA_STRIPE_MODE", "live");
    vi.stubEnv("STRIPE_PRICE_SAKABA_LIVE", "price_live_example");
    expect(getStripeMode()).toBe("test");
    expect(getSakabaStripeMode()).toBe("live");
    expect(getSakabaPriceId()).toBe("price_live_example");
  });

  it("本番価格がなければテスト価格へフォールバックしない", () => {
    vi.stubEnv("SAKABA_STRIPE_MODE", "live");
    vi.stubEnv("STRIPE_PRICE_SAKABA_LIVE", "");
    vi.stubEnv("STRIPE_PRICE_SAKABA_TEST", "price_test_example");
    expect(() => getSakabaPriceId()).toThrow("STRIPE_PRICE_SAKABA_LIVE");
  });
});
