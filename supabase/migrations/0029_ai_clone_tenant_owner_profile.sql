-- ===================================================================
-- 0029: AI Clone — テナントオーナーの占術プロフィール + 朝のブリーフィングフラグ
-- 作成: 2026-05-17
--
-- 目的:
--   1. ai_clone_tenants にオーナー本人の生年月日・性別・出生地を追加
--   2. 朝6時の占いブリーフィング配信フラグを追加
--
-- Why:
--   オーナー本人を ai_clone_person に登録せず、テナントマスタに直接持つ方針。
--   理由：
--     * person は「他人を記録する場所」という抽象が崩れない
--     * 1テナント=1オーナーなので1対1で素直
--     * 紹介元/紹介先 picker や人物一覧に「自分」が混ざるUI事故を防ぐ
--   将来「自分も含めて全メンバーを占う」展開が必要になったら、
--   person 側に self_person_id FK を生やしてハイブリッドにする予定。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

alter table ai_clone_tenants
  add column owner_birthday date,
  add column owner_birth_hour integer check (owner_birth_hour is null or (owner_birth_hour between 0 and 23)),
  add column owner_birthplace text,
  add column owner_gender text,
  add column morning_briefing_enabled boolean not null default false;

-- 朝のブリーフィングを送るテナントだけを高速に絞り込むための部分インデックス
create index ai_clone_tenants_morning_briefing_idx
  on ai_clone_tenants(slug)
  where morning_briefing_enabled = true;

-- ============================================================
-- goshima テナント seed（五島さん本人の値）
-- ============================================================
-- 適用後、ユーザーが本番でこのブロックを必要に応じて手動実行する想定。
-- 値が間違っていれば update で上書きすればいい。
--
-- update ai_clone_tenants
-- set owner_birthday = '1984-03-29',
--     owner_gender = '男性',
--     morning_briefing_enabled = true
-- where slug = 'goshima';
