-- ai_clone_tenant_members の RLS UPDATE ポリシー追加
--
-- 背景:
--   0013 で SELECT ポリシーだけ作って UPDATE/INSERT/DELETE を入れていなかった。
--   RLS 有効テーブルでポリシー無しの操作は「全行が条件不一致」扱いになり、
--   error は null だが affected rows = 0 で silently fail する。
--
--   影響: settings 画面から自分の slack_user_id / google_calendar_id を保存しても
--   「保存しました」と表示されつつ実際は DB に書かれない状態だった。
--
-- 方針:
--   自分の行（user_id = auth.uid()）に対してだけ UPDATE を許可。
--   tenant_id の付け替えや user_id の変更は禁止したいので with check も同条件。
--   INSERT / DELETE は admin 操作なので別途（owner/admin 専用 server action から
--   service_role で書く想定）。今回は触らない。

create policy ai_clone_tenant_members_self_update
  on ai_clone_tenant_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
