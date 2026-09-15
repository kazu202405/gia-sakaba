-- ===================================================================
-- 0003: applicants に email カラム追加
-- 作成: 2026-05-01
--
-- 背景: 管理画面で申込者一覧を表示するとき、メアドが見えないと
--       「誰なのか」を識別できない（auth.users へのアクセスは
--       RLSで管理者でも制限されるため）。
--
-- 解決: applicants テーブルに email を持たせる（auth.users.email を複製）。
--       trigger で signup 時に自動で埋める。既存ユーザーは backfill。
-- ===================================================================


-- 1. email カラム追加
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants(email);


-- 2. trigger を更新（email も入れる）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.applicants (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;


-- 3. 既存 applicants（主催者ユーザー含む）の email を backfill
UPDATE applicants a
SET email = u.email
FROM auth.users u
WHERE a.id = u.id AND a.email IS NULL;


-- ===================================================================
-- ✅ 完了。
-- 確認: SELECT id, name, email FROM applicants;
--       → 主催者ユーザーの email が global.information.academy@gmail.com になっているはず
-- ===================================================================
