-- ============================================================
-- Stripe 連携用フィールドを applicants に追加
-- ============================================================
-- 2tier モデル（仮登録=tentative / 本登録=paid=サロン本会員）の課金管理用。
-- checkout.session.completed → これらに値が入り、tier='paid' へ昇格。
-- customer.subscription.deleted → tier='tentative' へ revert（IDは履歴として残す選択肢もある）。

ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT;
  -- subscription_status: 'active' | 'past_due' | 'canceled' | 'incomplete' | NULL
  -- Stripe の Subscription.status をそのまま反映（NULL = 未契約）

-- 検索用 index（webhook で customer_id から applicant を引くため）
CREATE INDEX IF NOT EXISTS idx_applicants_stripe_customer
  ON applicants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
