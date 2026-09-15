-- ===================================================================
-- 0072: seminars.recording_url（アーカイブ用 YouTube URL）
-- 作成: 2026-06-29
--
-- 背景:
--   テラこやの勉強会・セミナーに参加できなかった会員向けに、過去回の録画を
--   見られるアーカイブページを用意する。動画ファイルは自前で持たず（容量・帯域回避）、
--   YouTube 限定公開URLを1カラムで持つだけにする＝最軽量。
--   開催後に admin/seminars でこのURLを設定すると、会員のアーカイブページに
--   埋め込み表示される（date<今日 かつ recording_url ありの回）。
-- ===================================================================

ALTER TABLE seminars
  ADD COLUMN IF NOT EXISTS recording_url TEXT;

NOTIFY pgrst, 'reload schema';
