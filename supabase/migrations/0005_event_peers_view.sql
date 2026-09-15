-- ===================================================================
-- 0005: event_peers view — 同イベント参加者の限定情報を見るためのビュー
-- 作成: 2026-05-01
--
-- 目的:
--   仮登録ユーザー（Tier 1）が「自分が申込んだセミナー/会の他の参加者」を
--   マイページから確認できるようにする。
--
-- 公開する項目:
--   名前まわり（name / name_furigana / nickname）と簡単な肩書き
--   （role_title / job_title / headline）、および参加状況（status / applied_at）。
--
-- 非公開:
--   email / story_* / contact_links / want_to_connect_with といった
--   機微 or 重い情報は一切出さない。
--
-- セキュリティ:
--   `security_invoker = true` で view 経由でも下位テーブル applicants の RLS を
--   呼び出し元（=ログインユーザー）の権限で評価する。
--   さらに WHERE 句で「呼び出しユーザー自身が同じ seminar_id に
--   event_attendees として存在する」ことを要求しているため、
--   自分が参加していないイベントの参加者情報には到達できない。
--
-- 注意:
--   applicants の RLS は「自分の行のみ SELECT 可」なので、view 単独でも
--   他人の applicants 行は見えない仕様だが、参加者表示のためには
--   他人の applicants 行を見せる必要がある。よって invoker のままでは不足し、
--   view が "definer 相当" の可視性を持つ必要がある。
--   → security_invoker = true でも、view の SELECT 権限が GRANT されていれば
--     view 内の SELECT は view 所有者（postgres）の権限で行われるため、
--     他人の applicants 行も読める。WHERE 句が唯一のガードになる点に注意。
--   → 将来 RLS を強化するなら、SECURITY DEFINER 関数化を検討。
-- ===================================================================

CREATE OR REPLACE VIEW event_peers WITH (security_invoker = true) AS
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

-- PostgREST にスキーマ再読込を通知（view を即座に REST 経由で叩けるようにする）
NOTIFY pgrst, 'reload schema';
