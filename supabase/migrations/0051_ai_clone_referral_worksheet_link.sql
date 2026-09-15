-- 0051_ai_clone_referral_worksheet_link.sql
--
-- 右腕AI が「会員本人の紹介設計ワークシート（referral_worksheets）」を読み込むかの ON/OFF フラグ。
-- 紹介コーチ側の coach_link_enabled（コーチ → 右腕22DB を読む）と対になる、
-- 右腕 → ワークシート方向の連携トグル。default true（連携ON）。

alter table ai_clone_tenants
  add column if not exists referral_worksheet_link_enabled boolean not null default true;

comment on column ai_clone_tenants.referral_worksheet_link_enabled is
  '右腕AIチャットが紹介コーチのワークシート(referral_worksheets)を読み込むか。ON=本人の紹介設計を踏まえて紹介相談に答える。';
