-- 0033_ai_clone_conversation_log_drop_speaker.sql
--
-- ai_clone_conversation_log.speaker カラムを廃止する。
--
-- 背景：
--   * speaker は 0013 から存在する自由テキスト列。Notion 時代の遺物で「誰の発言か」を
--     1行テキストで残すための欄。
--   * 後付けで ai_clone_person_conversation_logs（FK 多対多）が入り、人物関連は
--     完全にこちらに寄っている。
--   * 現状 speaker を入力できるのは Web UI のダイアログだけで、Slack/LINE 経路
--     （log_conversation）はそもそも speaker を一切セットしない。
--   * UI 一覧に列としては出ているが、検索・フィルタ・AI 文脈どこにも使われていない。
--   * 「発言者」と「関連人物」が意味上重複し、五島さん運用でも区別がつかなくなっていた。
--
-- 移行：
--   既存 speaker テキストが入っているレコードはデータ消失を避けるため content の
--   末尾に "発言者: ..." として concat してから drop する。
--   空欄の行はそのまま drop（content には影響しない）。

begin;

update ai_clone_conversation_log
set content = case
  when content is null or trim(content) = ''
    then '発言者: ' || speaker
  else content || E'\n\n発言者: ' || speaker
end
where speaker is not null and trim(speaker) <> '';

alter table ai_clone_conversation_log drop column speaker;

commit;
