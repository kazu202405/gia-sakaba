-- 0039_ai_clone_person_name_normalized.sql
--
-- 人物名のマッチングを「スペース無視（全角/半角/スペースなしを同一視）」に
-- するための正規化カラム。
--
-- 背景:
--   Slack で「山崎　誠」（全角スペース）と送ったのに、議事録抽出の LLM が
--   「山崎 誠」（半角スペース）に正規化して出力 → 既存の全角レコードと
--   ilike '%山崎 誠%' が一致せず重複作成された。
--
-- 対策:
--   name_normalized = lower(全角・半角スペースを全部除去した name)
--   を保持し、searchPeopleByName はこの列に対して部分一致検索する。
--   表示用の name はユーザーが入れたまま（スペース込み）保持する。
--
-- 注意:
--   全角スペース U+3000 は Postgres の [[:space:]] に含まれないことがあるため、
--   文字クラスに「　」を明示的に入れる。

begin;

alter table ai_clone_person
  add column if not exists name_normalized text;

-- 正規化ロジック（トリガー・バックフィル共通）
create or replace function ai_clone_person_set_name_normalized()
returns trigger
language plpgsql
as $$
begin
  new.name_normalized :=
    lower(regexp_replace(coalesce(new.name, ''), '[[:space:]　]', '', 'g'));
  return new;
end;
$$;

-- insert / name 更新時に name_normalized を自動同期
drop trigger if exists ai_clone_person_set_name_normalized_trg on ai_clone_person;
create trigger ai_clone_person_set_name_normalized_trg
  before insert or update of name on ai_clone_person
  for each row execute function ai_clone_person_set_name_normalized();

-- 既存データのバックフィル
update ai_clone_person
set name_normalized =
  lower(regexp_replace(coalesce(name, ''), '[[:space:]　]', '', 'g'));

-- 名寄せ検索用インデックス
create index if not exists ai_clone_person_name_normalized_idx
  on ai_clone_person(tenant_id, name_normalized);

commit;
