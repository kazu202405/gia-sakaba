-- ===================================================================
-- 0073: seminar_materials（過去の勉強会の資料：ファイル/URL）＋ Storage バケット
-- 作成: 2026-06-29
--
-- 背景:
--   「過去の勉強会」で、各回に複数の資料（PDF等のファイル or 外部/YouTube URL）を
--   タイトル・説明つきで添付できるようにする。録画メイン動画は seminars.recording_url（0072）。
--   資料ファイルは会員限定にしたいので private バケットに置き、会員側は service_role で
--   発行した署名URL（短命）で配信する（バケット自体は非公開）。
--   admin は anon キー＋管理者セッションで操作するため、is_admin() の RLS / Storage ポリシーを付ける。
-- ===================================================================

-- ── 資料テーブル ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seminar_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id uuid NOT NULL REFERENCES public.seminars(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('file', 'url')),
  title text NOT NULL,
  description text,
  file_path text,   -- Storage 上のパス（kind='file' のとき）
  file_name text,   -- 元のファイル名（表示・ダウンロード名用）
  url text,         -- 外部/YouTube URL（kind='url' のとき）
  is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seminar_materials_seminar
  ON public.seminar_materials(seminar_id);

ALTER TABLE public.seminar_materials ENABLE ROW LEVEL SECURITY;

-- admin: 全操作（anon キー＋管理者セッション）
DROP POLICY IF EXISTS "seminar_materials_admin_all" ON public.seminar_materials;
CREATE POLICY "seminar_materials_admin_all"
  ON public.seminar_materials
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 会員(authenticated): 公開済みのみ閲覧
DROP POLICY IF EXISTS "seminar_materials_member_read" ON public.seminar_materials;
CREATE POLICY "seminar_materials_member_read"
  ON public.seminar_materials
  FOR SELECT
  TO authenticated
  USING (is_published);

-- ── Storage バケット（非公開） ────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('seminar-materials', 'seminar-materials', false)
ON CONFLICT (id) DO NOTHING;

-- admin だけがこのバケットを操作可（会員側の読み出しは service_role の署名URLで行う）
DROP POLICY IF EXISTS "seminar_materials_storage_admin_all" ON storage.objects;
CREATE POLICY "seminar_materials_storage_admin_all"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'seminar-materials' AND is_admin())
  WITH CHECK (bucket_id = 'seminar-materials' AND is_admin());

NOTIFY pgrst, 'reload schema';
