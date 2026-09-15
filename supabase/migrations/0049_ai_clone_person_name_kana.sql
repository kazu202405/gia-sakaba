-- 0049_ai_clone_person_name_kana.sql
--
-- 人物に「よみがな（読み仮名）」を追加。
-- 名刺メモにフリガナ（例「おかだ　ひろたか」）があっても保存先が無く拾えていなかった。

alter table ai_clone_person
  add column if not exists name_kana text;

comment on column ai_clone_person.name_kana is '氏名のよみがな（ひらがな/カタカナ）';
