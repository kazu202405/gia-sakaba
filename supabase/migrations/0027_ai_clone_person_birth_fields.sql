-- ===================================================================
-- 0027: ai_clone_person に生年月日・性別・出生時刻・出生地を追加
-- 作成: 2026-05-17
--
-- 目的:
--   * /admin/divination（社内鑑定ツール）で入力した生年月日と
--     名前を、テナント内の人物レコードに保存できるようにする。
--   * これらの情報は鑑定（算命学・タロット・数秘・カラー）の再現に
--     必須であり、今後 AI Clone 側のコンテキスト（性格傾向の参考値）
--     にも使う可能性がある。
--
-- 設計:
--   * 4カラムとも nullable。既存レコードは null のまま運用。
--   * birthday は date 型（時刻は別カラム）。
--   * birth_hour は 0-23 の int。null=未指定。
--   * gender は text のまま。enum 化しない（"未指定" のラベル運用を
--     アプリ側で吸収するため、DB は素の文字列で保つ）。
--   * birthplace は参考表示用。座標等の正規化はしない。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

alter table ai_clone_person
  add column if not exists birthday date,
  add column if not exists gender text,
  add column if not exists birth_hour smallint check (birth_hour is null or (birth_hour between 0 and 23)),
  add column if not exists birthplace text;

comment on column ai_clone_person.birthday   is '生年月日（鑑定再現に使用）';
comment on column ai_clone_person.gender     is '性別（"男性"/"女性"/"未指定" などの自由文字列）';
comment on column ai_clone_person.birth_hour is '出生時刻（0-23、null=未指定）';
comment on column ai_clone_person.birthplace is '出生地（参考表示・計算には未使用）';
