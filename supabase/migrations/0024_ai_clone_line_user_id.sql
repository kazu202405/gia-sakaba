-- ===================================================================
-- 0024: AI Clone — LINE 連携用 line_user_id 列追加
-- 作成: 2026-05-12
--
-- 目的:
--   Slack に続いて LINE Messaging API からも AI Clone を呼べるようにする。
--   LINE webhook で受け取った event.source.userId を tenant 解決するため、
--   tenant_members に line_user_id 列（UNIQUE）を追加する。
--
-- 設計:
--   * Slack の 0020 と同じパターン。
--   * 1 LINE user_id は1テナント・1メンバーに帰属（UNIQUE）。
--   * NULL 許容（LINE 未連携メンバーも保持可能）。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

alter table ai_clone_tenant_members
  add column line_user_id text;

create unique index ai_clone_tenant_members_line_user_id_unique
  on ai_clone_tenant_members(line_user_id)
  where line_user_id is not null;
