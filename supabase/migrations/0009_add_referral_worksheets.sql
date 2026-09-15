-- ===================================================================
-- 0009: referral_worksheets テーブル追加
-- 作成: 2026-05-10
--
-- 役割:
--   サロン会員（applicants）が紹介コーチに渡すための「紹介設計ワークシート」
--   22項目（WS01 見せ方 8 / WS02 価値 7 / WS03 仕組み化 5）を保存する。
--   applicants と 1:1。
--
-- 設計判断:
--   22項目を applicants にカラム展開せず、JSONB 1カラムで保持する。
--   理由:
--     - 項目追加・削除・名前変更時に migration 不要
--     - 後に "履歴を取りたい / 月次スナップショット" 拡張がしやすい
--     - applicants の肥大化を避ける（既に約20カラム）
--
-- JSONB のキー命名:
--   lib/coach/worksheet-schema.ts の field.id と一致。
--   例: { "ws01_01": "...話題になる要素...", "ws02_04": "...USP...", ... }
--
-- スキーマ:
--   user_id    : applicants の id と 1:1（CASCADE で同期削除）
--   data       : JSONB（空オブジェクトでスタート）
--   created_at : 行作成時刻（＝ そのユーザーが初めてワークシートを書き始めた時刻）
--   updated_at : 既存の update_updated_at_column() トリガーで自動更新
--
-- RLS:
--   applicants と同じく「自分の行は全操作OK / 管理者は全件SELECT」のパターン。
-- ===================================================================

CREATE TABLE referral_worksheets (
  user_id UUID PRIMARY KEY REFERENCES applicants(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 自動更新（0001 で定義済みの関数を再利用）
CREATE TRIGGER referral_worksheets_updated_at
  BEFORE UPDATE ON referral_worksheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE referral_worksheets ENABLE ROW LEVEL SECURITY;

-- 自分の行は SELECT / INSERT / UPDATE / DELETE すべて許可
CREATE POLICY "referral_worksheets_self_all" ON referral_worksheets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 管理者は全件 SELECT 可（運用モニタリング用）
CREATE POLICY "referral_worksheets_admin_read_all" ON referral_worksheets
  FOR SELECT
  USING (is_admin());

-- PostgREST schema cache reload（追加テーブルを REST API 経由で読み書きできるように）
NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- ✅ 完了。
-- 確認:
--   SELECT table_name FROM information_schema.tables
--     WHERE table_schema = 'public' AND table_name = 'referral_worksheets';
--   SELECT policyname FROM pg_policies WHERE tablename = 'referral_worksheets';
-- ===================================================================
