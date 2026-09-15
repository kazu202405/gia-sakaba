-- ===================================================================
-- 0007: applicants に Q&A 拡張カラム追加（9項目）
-- 作成: 2026-05-01
--
-- 追加する項目（Q&Aウィザード 24問の番号と対応）:
--   Q10  services_summary    サービス内容
--   Q16  favorites           好きなもの
--   Q17  current_hobby       最近ハマっていること
--   Q18  school_days_self    学生時代どんな子だったか
--   Q19  personal_values     大切にしていること（"values" は SQL 予約語のため personal_values）
--   Q20  status_message      ステータスメッセージ（LINE 一言と同種）
--   Q21  contact_line        LINE
--   Q22  contact_instagram   Instagram
--   Q23  contact_website     Webサイト
--
-- 後回し（5/26後 or Phase 2）:
--   Q1   photo_url           写真（Supabase Storage 設定が必要）
--   Q5   genre               ジャンル（43種選択UI）
--   Q8   location            拠点（複数可）
--   Q24  allow_direct_contact 直接連絡許可（連絡先公開/非公開トグル設計）
-- ===================================================================

ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS services_summary TEXT,
  ADD COLUMN IF NOT EXISTS status_message    TEXT,
  ADD COLUMN IF NOT EXISTS favorites         TEXT,
  ADD COLUMN IF NOT EXISTS current_hobby     TEXT,
  ADD COLUMN IF NOT EXISTS school_days_self  TEXT,
  ADD COLUMN IF NOT EXISTS personal_values   TEXT,
  ADD COLUMN IF NOT EXISTS contact_line      TEXT,
  ADD COLUMN IF NOT EXISTS contact_instagram TEXT,
  ADD COLUMN IF NOT EXISTS contact_website   TEXT;

-- PostgREST schema cache reload（追加カラムを REST API 経由で読み書きできるように）
NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- ✅ 完了。
-- 確認: SELECT column_name FROM information_schema.columns
--       WHERE table_name = 'applicants' ORDER BY ordinal_position;
-- ===================================================================
