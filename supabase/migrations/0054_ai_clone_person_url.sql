-- 0054_ai_clone_person_url.sql
--
-- 人物に URL（本人のサイト・SNS・note 等）を1つ登録できるようにする。
-- 会社ごとの URL は会社マスタ（ai_clone_company.hp）側で持つ方針（複数会社対応は別途）。

alter table ai_clone_person
  add column if not exists url text;
