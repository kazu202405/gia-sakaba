-- ===================================================================
-- 0014: activity_log に「本人による tier_auto_promote の self-INSERT」許可
-- 作成: 2026-05-11
--
-- 目的:
--   /api/profile/save から、プロフィール完成度100%到達時に
--   tier='tentative' → 'registered' の自動昇格ログを本人として
--   activity_log に書き込めるようにする。
--
--   既存の activity_log_admin_all ポリシーは admin only INSERT のみ許可しており、
--   本人による self-INSERT は拒否されてしまうため、限定的に許可ポリシーを追加する。
--
-- 許可条件（INSERT のみ。SELECT/UPDATE/DELETE は admin 専有のまま）:
--   - actor_id   = auth.uid()                  本人による操作であること
--   - subject_id = auth.uid()                  対象も本人自身であること
--   - subject_type = 'applicant'
--   - action     = 'tier_auto_promote'         他種ログを偽装できないように限定
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

DROP POLICY IF EXISTS activity_log_self_promote_insert ON activity_log;

CREATE POLICY activity_log_self_promote_insert
  ON activity_log
  FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND subject_id = auth.uid()
    AND subject_type = 'applicant'
    AND action = 'tier_auto_promote'
  );

-- PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- ✅ 完了。
-- 確認:
--   SELECT polname, polcmd FROM pg_policy
--    WHERE polrelid = 'activity_log'::regclass;
-- ===================================================================
