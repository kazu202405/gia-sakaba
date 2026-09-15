-- ===================================================================
-- 0034: ai_clone_person に出生時刻の「分」カラムを追加
-- 作成: 2026-05-18
--
-- 目的:
--   * /admin/divination の鑑定フォームで時:分まで入力できるように
--     UI を拡張するのに合わせて、保存先カラムも分単位を持つ。
--   * 算命学の時柱境界は2時間刻みで現状ロジックは整時刻判定で十分
--     だが、入力した分が消えると鑑定の再現性が下がるため記録する。
--     将来「夜子時を翌日扱い」等の流派切替を入れる際にも分が必要。
--
-- 設計:
--   * birth_minute は 0-59 の smallint nullable。null=未指定。
--   * 既存レコードはすべて null のまま運用。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

alter table ai_clone_person
  add column if not exists birth_minute smallint check (birth_minute is null or (birth_minute between 0 and 59));

comment on column ai_clone_person.birth_minute is '出生時刻の分（0-59、null=未指定）';
