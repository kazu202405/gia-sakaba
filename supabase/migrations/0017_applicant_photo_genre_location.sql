-- ===================================================================
-- 0017: applicants に photo_url / genre / location 列追加
--       + profile-photos Storage バケットと RLS
-- 作成: 2026-05-11
--
-- 目的:
--   mypage/edit の必須項目を 20 → 23 項目に拡張するための DB 基盤。
--   0007 で "後回し" としていた Q1/Q5/Q8 をここで取り込む。
--
-- 追加カラム（applicants）:
--   photo_url TEXT  プロフィール写真の public URL（Supabase Storage profile-photos バケットを指す）
--   genre     TEXT  ジャンル 43種から1つ（自由文字列としても運用可。UI 側で genreOptions 制約）
--   location  TEXT  拠点（東京 / 大阪 / 福岡 など。自由入力）
--
-- Storage:
--   profile-photos バケット作成（public read）。
--   オブジェクトキー規約: `<user_id>/<filename>`。
--   RLS:
--     - 読取り: anon/authenticated とも public 読み取り可（バケット public=true）
--     - 書込み: authenticated のうち、フォルダ名が自分の auth.uid() の時のみ
--     - 上書き/削除: 同上（自分のフォルダ配下のみ）
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================


-- ============================================================
-- 1. applicants にカラム追加
-- ============================================================
ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS genre     TEXT,
  ADD COLUMN IF NOT EXISTS location  TEXT;


-- ============================================================
-- 2. profile-photos Storage バケット作成
--    既に存在する場合は何もしない（冪等）
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', TRUE)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 3. profile-photos の Storage RLS
--    オブジェクトキーの 1階層目（path_tokens[1]）が自分の uid のときのみ書込可
-- ============================================================

-- 既存ポリシーを置き換え可能にするため一旦 DROP
DROP POLICY IF EXISTS profile_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS profile_photos_self_insert ON storage.objects;
DROP POLICY IF EXISTS profile_photos_self_update ON storage.objects;
DROP POLICY IF EXISTS profile_photos_self_delete ON storage.objects;

-- 読取り：誰でも可（バケット public=true と整合）
CREATE POLICY profile_photos_public_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-photos');

-- 作成：authenticated のうち、フォルダ名が自分の uid と一致する場合のみ
CREATE POLICY profile_photos_self_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 更新：自分のフォルダ配下のみ
CREATE POLICY profile_photos_self_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 削除：自分のフォルダ配下のみ
CREATE POLICY profile_photos_self_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- 4. PostgREST schema cache reload
-- ============================================================
NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- ✅ 完了。
-- 動作確認:
--   -- A. カラムが追加されたか
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'applicants'
--      AND column_name IN ('photo_url','genre','location');
--
--   -- B. バケットが存在するか
--   SELECT id, public FROM storage.buckets WHERE id = 'profile-photos';
--
--   -- C. authenticated 自分のフォルダにアップロード可能で、他人のフォルダは弾かれること
--   --    （Supabase ダッシュボード Storage → profile-photos で UI から確認）
-- ===================================================================
