-- ===================================================================
-- 0004: event_attendees → applicants の直接 FK 化
-- 作成: 2026-05-01
--
-- 問題: 0001 では event_attendees.user_id → auth.users(id) として FK を張ったが、
--       applicants も auth.users(id) を参照する別経路のため、PostgREST が
--       event_attendees ↔ applicants の関係を schema cache で検出できない。
--       /admin で `applicants:applicants!inner(...)` の embed クエリが
--       「Could not find a relationship」エラーで失敗していた。
--
-- 解決: event_attendees.user_id の FK を applicants(id) に張り直す。
--       applicants.id 自体が auth.users(id) を参照しているので意味は同じ。
--       カスケード削除：auth.users 削除 → applicants 削除 → event_attendees 削除 の連鎖は維持される。
-- ===================================================================


-- 1. 既存 FK を削除（auth.users 参照）
ALTER TABLE event_attendees
  DROP CONSTRAINT IF EXISTS event_attendees_user_id_fkey;


-- 2. applicants(id) を参照する FK を張り直す
ALTER TABLE event_attendees
  ADD CONSTRAINT event_attendees_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES applicants(id) ON DELETE CASCADE;


-- 3. PostgREST schema cache を再読み込み
NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- ✅ 完了。/admin の applicants embed クエリが動くようになるはず。
-- 反映に数秒かかる場合あり。ブラウザでハードリロード（Ctrl+Shift+R）推奨。
-- ===================================================================
