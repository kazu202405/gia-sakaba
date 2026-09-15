-- ===================================================================
-- 0012: 主催者用メモ + アクティビティログ
-- 作成: 2026-05-11
--
-- 目的:
--   1. applicants.admin_notes ─ 会員ごとに主催者が書き込む自由テキスト
--      （event_attendees.notes は申請単位、こちらは人単位）
--   2. activity_log ─ 主催者の操作履歴（tier 変更等）を追跡可能にする
--      ActivityTab は現状 event_attendees の timestamp から擬似生成して
--      いるが、tier 変更のような「申請に紐付かない操作」も拾えるようにする
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

-- ============================================================
-- 1. applicants.admin_notes
-- ============================================================
ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;


-- ============================================================
-- 2. activity_log テーブル
-- ============================================================
-- 主催者操作の監査ログ。誰が・何を・どう変えたか。
-- subject_type で対象テーブルを識別、details に旧値・新値などを JSONB で格納。
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 例: 'applicant' / 'event_attendee'
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  -- 例: 'tier_change' / 'admin_notes_update' / 'manual_subscription_cancel'
  action TEXT NOT NULL,
  -- 旧値・新値・理由など自由形式
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_subject
  ON activity_log(subject_type, subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_actor
  ON activity_log(actor_id, created_at DESC);


-- ============================================================
-- 3. RLS（主催者のみ全操作可能）
-- ============================================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_log_admin_all ON activity_log;
CREATE POLICY activity_log_admin_all
  ON activity_log
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());


-- ============================================================
-- 4. PostgREST schema cache reload
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- ✅ 完了。
-- 確認:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'applicants' AND column_name = 'admin_notes';
--   SELECT table_name FROM information_schema.tables
--    WHERE table_name = 'activity_log';
-- ===================================================================
