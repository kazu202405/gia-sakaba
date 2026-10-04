import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MEMBERSHIP_PLANS } from "@/lib/membership/plans";

// Company Note の有料会員は、酒場のビジネスプラン（月880円）の機能を使える（0127・2026-10-04）。
// 判定は GIA の isActiveMember（lib/membership/plans.ts）と同じでないといけない。
// 会員の段を足したのに SQL を直し忘れると「Company Noteでは有料なのに酒場では無料」になるので見張る。
const sql = readFileSync(join(process.cwd(), "supabase/migrations/0127_sakaba_company_note_benefit_all_members.sql"), "utf8");
const body = sql.slice(sql.indexOf("as $$"), sql.indexOf("$$;"));

describe("Company Note会員の特典（sakaba.has_company_note_11000_benefit）", () => {
  it("会員の段と旧テラこやを全部含む", () => {
    const listed = body.match(/a\.plan in \(([^)]*)\)/)?.[1] ?? "";
    const plans = [...listed.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
    expect(plans).toEqual([...MEMBERSHIP_PLANS, "terakoya"].sort());
  });

  it("旧サロン・旧本会員（tier = paid）も含み、Stripeの契約や状態では絞らない", () => {
    expect(body).toContain("a.tier = 'paid'");
    expect(body).not.toContain("subscription_status");
    expect(body).not.toContain("stripe_subscription_id");
  });

  it("画面に招待プランの金額を出さない", () => {
    for (const file of ["app/guild/me/page.tsx", "components/guild/plan-form.tsx"]) {
      expect(readFileSync(join(process.cwd(), file), "utf8")).not.toContain("11,000円会員特典");
    }
  });
});
