-- ===================================================================
-- 0022: AI Clone — Google Calendar 連携
-- 作成: 2026-05-12
--
-- 目的:
--   各テナントメンバーが自分の Google Calendar を Service Account 経由で
--   AI Clone に紐付けられるようにする。
--
--   運用方式 (C1: Service Account 共有方式):
--     1. クライアント本人が自分の Google Calendar 設定画面で
--        GIA の Service Account メアドを「予定の表示」権限で追加
--     2. 自分のカレンダーID（メアド形式）を /clone/<slug>/settings に貼る
--     3. AI Clone が DM 応答時、tenant の owner（または最初のメンバー）の
--        google_calendar_id を引いて events.list を呼ぶ
--
--   UNIQUE 制約は付けない：team プランで複数メンバーが
--   同じカレンダーを共有することもあり得るため。
--
-- 前提:
--   0020_ai_clone_slack_company_meeting.sql が適用済みであること。
--   ai_clone_tenant_members テーブルに slack_user_id 列が存在する。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

alter table ai_clone_tenant_members
  add column google_calendar_id text;

-- 検索用 index（owner の calendar を引く時に使う）
create index ai_clone_tenant_members_google_cal_idx
  on ai_clone_tenant_members(tenant_id, google_calendar_id)
  where google_calendar_id is not null;
