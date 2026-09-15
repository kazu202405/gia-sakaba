-- ===================================================================
-- 0028: ai_clone_person のフィールド整理
-- 作成: 2026-05-17
--
-- 目的:
--   * 「課題」と「注意点」のカラム境界が曖昧なので、注意点(caveats)に
--     寄せて1本化。表示ラベルは「備考」になる。
--   * 抽象的だった「関係性(relationship)」を、出会った場所/コミュニティを
--     書く「met_context」に置き換え。AI Clone が後で参照する時に
--     「○○セミナーで会った」「△△サロンの常連」など具体的な
--     アンカーが残るほうが価値が高い。
--
-- 変更:
--   1. met_context (text) を追加
--   2. relationship → met_context へ既存値をコピー（met_context が空のときだけ）
--   3. challenges → caveats へ既存値を改行2つで連結
--   4. relationship カラムを drop
--   5. challenges カラムを drop
--
-- 安全策:
--   * UI から既に外しているので drop 前に念のため backup を取りたい場合は
--     先に "create table ai_clone_person_bk_0028 as select id, relationship,
--     challenges, caveats from ai_clone_person" を手動で実行する。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

-- 1. 新カラム
alter table ai_clone_person
  add column if not exists met_context text;

comment on column ai_clone_person.met_context
  is '出会った場所・コミュニティ（"○○セミナー" "△△サロン" など）';

-- 2. relationship → met_context（met_context が空のときだけコピー）
update ai_clone_person
set met_context = relationship
where met_context is null
  and relationship is not null
  and trim(relationship) <> '';

-- 3. challenges → caveats（caveats 末尾に改行2つで追記。空欄なら challenges そのまま）
update ai_clone_person
set caveats = nullif(
  trim(concat_ws(E'\n\n', nullif(trim(caveats), ''), nullif(trim(challenges), ''))),
  ''
)
where challenges is not null
  and trim(challenges) <> '';

-- 4. relationship / challenges カラム削除
alter table ai_clone_person
  drop column if exists relationship,
  drop column if exists challenges;

comment on column ai_clone_person.caveats
  is '備考（旧: 注意点+課題 を統合）';
