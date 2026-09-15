-- 0045_ai_clone_person_industry.sql
--
-- 人物に「業種」を追加。
-- 背景: 旧来は position（役職）に業種・職種・役職が混載していて、紹介マッチングで
--       串刺し検索できなかった。業種は紹介事業の軸（「介護の人」「補助金の人」を
--       つなぐ）なので専用カラムにする。position は「役職・仕事・肩書き」として継続。
--
-- 仕事内容は専用カラムを足さず position で吸収する方針（フィールド過多回避）。

alter table ai_clone_person
  add column if not exists industry text;

comment on column ai_clone_person.industry is
  '業種（介護 / 飲食 / 医療 / 不動産 等）。紹介マッチングの串刺し軸。position（役職・仕事）とは分離。';

-- 業種での絞り込み用
create index if not exists ai_clone_person_tenant_industry_idx
  on ai_clone_person(tenant_id, industry)
  where industry is not null;
