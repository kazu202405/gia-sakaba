-- AI Clone テナントの Stripe 連携カラム追加。
-- Stripe Checkout 完了で webhook が ai_clone_tenants を自動作成する際、
-- 既存 customer / subscription を再利用したり、サブスク状態を反映するために必要。
--
-- 設計判断:
--   * applicants テーブルと同じ命名（stripe_customer_id / stripe_subscription_id / subscription_status）に揃える
--   * subscription_status は Stripe の値そのまま（'active' / 'past_due' / 'canceled' / 'incomplete' 等）
--   * tenants.status（'active' / 'paused' / 'terminated'）とは別軸：
--     - tenants.status はサービス提供状態
--     - subscription_status は決済状態
--     両方が揃って初めて課金されている扱い
--   * いずれも null 許容（admin が手動作成した tenant 用にレガシー互換）

alter table ai_clone_tenants
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text;

-- customer_id / subscription_id は重複しないので unique 制約を貼っておく
-- （null は複数許容されるので、admin 手動作成テナントも問題なく共存できる）
create unique index if not exists ai_clone_tenants_stripe_customer_uidx
  on ai_clone_tenants(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists ai_clone_tenants_stripe_subscription_uidx
  on ai_clone_tenants(stripe_subscription_id)
  where stripe_subscription_id is not null;
