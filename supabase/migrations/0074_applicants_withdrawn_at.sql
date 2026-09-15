-- ===================================================================
-- 0074: applicants.withdrawn_at（退会ステータス）
-- 作成: 2026-07-06
--
-- 仕様（五島さん）:
--   退会は「削除」ではなく「ステータス変更」。再入会で戻せるようレコードは保持する。
--   null        = 在籍中
--   タイムスタンプ = 退会中
--   退会/再入会の履歴は activity_log(action='withdraw' / 'rejoin') に残し、
--   「一度退会 → 再入会」が追えるようにする。
--
--   退会操作時は管理APIが Stripe サブスクの解約も自動で行う（/api/admin/member/withdraw）。
--   tier や member_no は退会では触らない（保持）。実際のアクセスは Stripe 連動の webhook に任せる。
--
-- 適用方法: Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

alter table applicants add column if not exists withdrawn_at timestamptz;

comment on column applicants.withdrawn_at is
  '退会日時。null=在籍中。管理画面の退会トグルで設定し、再入会でnullに戻す。履歴はactivity_log。';

notify pgrst, 'reload schema';
