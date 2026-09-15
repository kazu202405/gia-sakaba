-- ===================================================================
-- 0006: event_peers view から security_invoker を外す
-- 作成: 2026-05-01
--
-- 問題: 0005 で view を WITH (security_invoker = true) で作ったため、
--       view 内部の applicants / event_attendees JOIN にも呼出元の RLS が適用され、
--       「自分のレコード以外は見えない」状態になっていた。
--
-- 解決: security_invoker を外し、view owner（postgres = RLS bypass）で評価させる。
--       view の WHERE EXISTS 句で auth.uid() フィルタは効くので、
--       「同イベント参加者だけ」のセキュリティ境界は維持される。
--       （auth.uid() は SECURITY DEFINER 内でも呼出元 JWT を返す）
-- ===================================================================

DROP VIEW IF EXISTS event_peers;

CREATE OR REPLACE VIEW event_peers AS
SELECT
  a.id,
  a.name,
  a.name_furigana,
  a.nickname,
  a.role_title,
  a.job_title,
  a.headline,
  ea.seminar_id,
  ea.status AS attendance_status,
  ea.applied_at
FROM applicants a
JOIN event_attendees ea ON a.id = ea.user_id
WHERE EXISTS (
  SELECT 1 FROM event_attendees self_ea
  WHERE self_ea.user_id = auth.uid()
  AND self_ea.seminar_id = ea.seminar_id
);

GRANT SELECT ON event_peers TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- ✅ 完了。
-- 確認: ログインユーザーが /members/app/mypage を開くと
-- 「他のお申込者」に同イベント参加者の名前が出るはず。
-- ===================================================================
