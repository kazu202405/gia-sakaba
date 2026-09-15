-- ===================================================================
-- 0002: SECURITY DEFINER 関数の search_path 修正
-- 作成: 2026-05-01
--
-- 問題: 0001 で作った handle_new_user() / is_admin() に search_path 指定が無く、
--       SECURITY DEFINER で実行される際に public スキーマのテーブルが見つからず
--       「Database error creating new user」が起きていた。
--
-- 修正: 関数定義に SET search_path = public, auth を追加。
--       既存定義を CREATE OR REPLACE で上書きする。
-- ===================================================================


-- 1. handle_new_user(): signup 時に applicants 行を自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.applicants (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;


-- 2. is_admin(): 主催者判定
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.email() = 'global.information.academy@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, auth;


-- ===================================================================
-- ✅ 修正完了。再度ユーザー作成を試してください。
-- ===================================================================
