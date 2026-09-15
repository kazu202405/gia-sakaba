-- /clone/[slug]/core-os/annual-kpi の汎用化。
-- 旧: 1年度=1レコード、固定6指標カラム（売上/MRR/商談/投稿/セミナー/導入）
-- 新: 1年度=複数レコード、各レコードに title + target_value + unit を持つ
--
-- 設計判断（2026-05-12）:
--   - 事業フェーズで重要指標が変わるので固定カラムは硬すぎる
--   - 進捗率機能（current_value vs target_value）は Phase 2 でTODO（ai_clone.md）
--
-- 既存データはまだ空のため、安全に DROP + ADD で構造を入れ替える。
-- ai_clone_kpi_weekly_reviews / ai_clone_kpi_monthly_reviews / ai_clone_kpi_decision_logs
-- は ai_clone_annual_kpi.id を参照しているが、テーブル自体は維持されるので影響なし。

-- 旧カラム削除
alter table ai_clone_annual_kpi drop column if exists yearly_theme;
alter table ai_clone_annual_kpi drop column if exists revenue_target;
alter table ai_clone_annual_kpi drop column if exists mrr_target;
alter table ai_clone_annual_kpi drop column if exists meeting_target;
alter table ai_clone_annual_kpi drop column if exists post_target;
alter table ai_clone_annual_kpi drop column if exists seminar_target;
alter table ai_clone_annual_kpi drop column if exists deal_target;

-- 新カラム追加
alter table ai_clone_annual_kpi add column if not exists title text;
alter table ai_clone_annual_kpi add column if not exists target_value numeric;
alter table ai_clone_annual_kpi add column if not exists unit text;

-- title は必須（後付けで NOT NULL を入れる前に空テーブル前提で安全に）
alter table ai_clone_annual_kpi alter column title set not null;
