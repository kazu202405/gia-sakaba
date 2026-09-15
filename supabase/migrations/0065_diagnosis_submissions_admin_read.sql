-- 売上ボトルネック診断の回答を admin（/admin の「ログ → アンケート」タブ）が
-- 閲覧できるようにする SELECT ポリシー。
--
-- 0064 ではポリシー無し（service_role 専用）にしたが、admin 画面は他タブと同様
-- anon キー＋管理者セッションで読む。既存テーブルと同じく is_admin() に SELECT を許可する。
-- 一般ユーザー・匿名は引き続き読めない。API の INSERT は service_role が RLS をバイパスする。

create policy "diagnosis_submissions_admin_read_all"
  on public.diagnosis_submissions
  for select
  using (is_admin());
