-- /clone/goshima/services 投入用 Seed（Stripe設計）
-- 出典: z.md（2026-05-12 セッション）/ contexts/projects/gia/ai_clone.md
-- 使い方: Supabase SQL Editor で全文ペースト→Run
--
-- 構造:
--   name    = 商品名
--   pricing = 金額 + 課金タイプ + Stripe種別 を1テキストにまとめる
--   その他カラム（target_audience / problem_solved / offering / good_fit / bad_fit 等）は
--   後から UI（/clone/goshima/services/[id]）で追記する想定。
--
-- 注意: テーブルが空の前提（既存サービスがあれば誤って削除しないよう、DELETE は省く）。

insert into ai_clone_service (tenant_id, name, pricing)
select t.id, v.name, v.pricing
from ai_clone_tenants t,
(values
  -- サブスク商品
  ('サロン月額',              '990円/月（月次サブスク・Stripe Subscription）'),
  ('軽量アプリ保守',          '月3-5万（月次サブスク・Stripe Subscription）'),
  ('AI Clone アシスタント',   '4,980円/月（月次サブスク・Stripe Subscription）'),
  ('AI Clone パートナー',     '7,980円/月（月次サブスク・Stripe Subscription）'),
  ('AI Clone チーム',         '29,800〜49,800円/月（月次サブスク・Stripe Subscription）'),
  ('AI Clone カスタマイズ',   '150,000円〜/月（6ヶ月契約・月次サブスク・Stripe Subscription）'),

  -- 単発商品
  ('AI Clone 初期費',         '代行 27,000円 / チーム 50,000〜100,000円（単発・Stripe One-time）'),
  ('アプリ初期構築費',         '20-60万（単発 or 分割・Stripe One-time / Installments）'),
  ('セミナー参加費',          '5,000円（単発・Stripe One-time）')
) as v(name, pricing)
where t.slug = 'goshima';
