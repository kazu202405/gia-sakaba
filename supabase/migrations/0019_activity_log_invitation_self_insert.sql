-- ===================================================================
-- 0019: activity_log に「member 自身が自分の invitation 操作をログ INSERT」許可
-- 作成: 2026-05-11
--
-- 背景:
--   0015/0016 で member（paid 会員）が紹介リンクを発行・取消できるようになった。
--   その操作を activity_log に積みたい（admin タブのログで監査線として追える）。
--   既存ポリシー：
--     - activity_log_admin_all : 主催者は全部可能
--     - activity_log_self_promote_insert (0014) : 本人による tier_auto_promote のみ
--   member の invitation 操作はどちらにも該当しないため、専用の self INSERT を追加する。
--
-- 許可条件（INSERT のみ。SELECT/UPDATE/DELETE は admin 専有のまま）:
--   - actor_id = auth.uid()                  本人による操作
--   - subject_type = 'invitation'
--   - action IN ('invitation_create', 'invitation_revoke', 'invitation_restore')
--   - 当該 invitation の created_by = auth.uid()  自分の招待のみ
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

DROP POLICY IF EXISTS activity_log_member_invitation_insert ON activity_log;

CREATE POLICY activity_log_member_invitation_insert
  ON activity_log
  FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND subject_type = 'invitation'
    AND action IN ('invitation_create', 'invitation_revoke', 'invitation_restore')
    AND EXISTS (
      SELECT 1 FROM invitations
       WHERE id = subject_id
         AND created_by = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- ✅ 完了。
-- 確認:
--   SELECT polname FROM pg_policy
--    WHERE polrelid = 'activity_log'::regclass;
-- ===================================================================
