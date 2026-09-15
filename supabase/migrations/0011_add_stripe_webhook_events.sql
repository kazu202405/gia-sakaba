-- ============================================================
-- Stripe Webhook の冪等性テーブル
-- ============================================================
-- Stripe は同一 event を再送する（ネットワーク不調・5xx応答時など）。
-- event.id を PK にして INSERT を試み、duplicate key なら処理スキップする
-- ことで、副作用が2回走るのを防ぐ。
--
-- 保持期間：履歴として残しても良いが、容量が気になれば 90日older は cron で消すなど。
-- 今は全件保持。

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,                            -- Stripe event ID (evt_xxx)
  type TEXT NOT NULL,                             -- event.type（例: checkout.session.completed）
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 受信時刻（再送がいつ来たか分析用）
  payload JSONB                                   -- デバッグ用に event 全体を保持（後でクエリしたい時のため）
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received_at
  ON stripe_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON stripe_webhook_events(type);

-- RLS 有効化（policy は意図的に作らない = deny all）。
-- service_role は RLS を bypass するので webhook ハンドラからは読み書き可能、
-- 万が一 anon キーから触られても deny される。
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
