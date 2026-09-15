-- 0030_ai_clone_meeting_to_conversation_log.sql
--
-- 議事録テーブル (ai_clone_meeting + 3 リンクテーブル) を会話ログ
-- (ai_clone_conversation_log + 既存 3 リンクテーブル) に統合する。
--
-- 背景：
--   * 0020 で「議事録は1会議＝1レコードの粒度。会話ログとは分離」として
--     ai_clone_meeting を新設したが、運用してみると実データ（2026-05-17 時点で2件）は
--     どれも「○○さんと話した内容」型のメモで、会話ログ側の世界観そのものだった。
--   * 結果、人物詳細ページが ai_clone_conversation_log しか読まないため、
--     議事録は人物カードから一切見えない「穴」になっていた。
--   * 統合方針：機能重複している meeting を廃止し、conversation_log に一本化。
--     Slack/LINE 自然文からの記録もここに集約する（ai-clone Tool Calling の新ツール）。
--
-- 注意：
--   既存 meeting.id をそのまま conversation_log.id として継承することで、
--   meeting_persons / meeting_projects / meeting_services の外部キー値を
--   ai_clone_*_conversation_logs にそのまま流用できる。

begin;

-- ============================================================
-- 1. 既存 meeting → conversation_log（id を継承）
-- ============================================================
-- 元カラム対応:
--   occurred_on(date) → occurred_at(timestamptz) … JST 12:00 固定で補完
--   title             → summary 先頭（議題があれば下に「[議題]」として連結）
--   minutes           → content
--   next_actions      → next_action
--   rating            → importance（どちらも S/A/B/C 想定）
--   channel           → '対面'（後で手動で直せる）

insert into ai_clone_conversation_log (
  id, tenant_id, occurred_at, channel, content, summary, next_action, importance, created_at, updated_at
)
select
  m.id,
  m.tenant_id,
  (coalesce(m.occurred_on, current_date)::text || ' 12:00:00+09')::timestamptz,
  '対面',
  m.minutes,
  case
    when coalesce(nullif(trim(m.agenda), ''), '') = '' then m.title
    else m.title || E'\n\n[議題]\n' || m.agenda
  end,
  m.next_actions,
  m.rating,
  m.created_at,
  m.updated_at
from ai_clone_meeting m;

-- ============================================================
-- 2. リンクテーブル移行（id 継承の恩恵で値そのまま流用）
-- ============================================================

insert into ai_clone_person_conversation_logs (person_id, conversation_log_id)
select person_id, meeting_id from ai_clone_meeting_persons
on conflict do nothing;

insert into ai_clone_project_conversation_logs (project_id, conversation_log_id)
select project_id, meeting_id from ai_clone_meeting_projects
on conflict do nothing;

insert into ai_clone_service_conversation_logs (service_id, conversation_log_id)
select service_id, meeting_id from ai_clone_meeting_services
on conflict do nothing;

-- ============================================================
-- 3. meeting 系テーブル一式を廃止
-- ============================================================

drop table if exists ai_clone_meeting_services cascade;
drop table if exists ai_clone_meeting_projects cascade;
drop table if exists ai_clone_meeting_persons cascade;
drop table if exists ai_clone_meeting cascade;

commit;
