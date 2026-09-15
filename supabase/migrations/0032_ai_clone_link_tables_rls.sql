-- 0032_ai_clone_link_tables_rls.sql
--
-- ai_clone_person_conversation_logs などのリンクテーブルに RLS ポリシーを追加。
--
-- 背景：
--   0013 では「リンクテーブルは結合元の権限に従う（join 経由でしか到達できない）」
--   として未設定にしていた。しかし実際は RLS が有効化されており、ポリシーが
--   存在しないため Web UI（cookie auth → user 権限）経由の INSERT/UPDATE/DELETE が
--   `new row violates row-level security policy for table ...` で全拒否されていた。
--   Slack/LINE 経路は service_role キーで RLS をバイパスしていたため気付かなかった。
--
-- 方針：
--   リンクテーブルは tenant_id 列を持たないので、結合元テーブル（person / project /
--   service）の tenant_id を経由してテナント member ガードする。
--
-- スコープ：
--   今回問題が顕在化した conversation_log 系3本だけ修正。他のリンクテーブル
--   （person_activity_logs / person_tasks 等）は将来 Web UI から触る時に同様の
--   パターンで追加する（今は service_role 経由でしか使われていないので未修正）。

begin;

-- ============================================================
-- person ⇄ conversation_log
-- ============================================================
alter table ai_clone_person_conversation_logs enable row level security;

create policy ai_clone_person_conversation_logs_all
  on ai_clone_person_conversation_logs
  for all
  using (
    exists (
      select 1 from ai_clone_person p
      where p.id = ai_clone_person_conversation_logs.person_id
        and ai_clone_is_tenant_member(p.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from ai_clone_person p
      where p.id = ai_clone_person_conversation_logs.person_id
        and ai_clone_is_tenant_member(p.tenant_id)
    )
  );

-- ============================================================
-- project ⇄ conversation_log
-- ============================================================
alter table ai_clone_project_conversation_logs enable row level security;

create policy ai_clone_project_conversation_logs_all
  on ai_clone_project_conversation_logs
  for all
  using (
    exists (
      select 1 from ai_clone_project pr
      where pr.id = ai_clone_project_conversation_logs.project_id
        and ai_clone_is_tenant_member(pr.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from ai_clone_project pr
      where pr.id = ai_clone_project_conversation_logs.project_id
        and ai_clone_is_tenant_member(pr.tenant_id)
    )
  );

-- ============================================================
-- service ⇄ conversation_log
-- ============================================================
alter table ai_clone_service_conversation_logs enable row level security;

create policy ai_clone_service_conversation_logs_all
  on ai_clone_service_conversation_logs
  for all
  using (
    exists (
      select 1 from ai_clone_service s
      where s.id = ai_clone_service_conversation_logs.service_id
        and ai_clone_is_tenant_member(s.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from ai_clone_service s
      where s.id = ai_clone_service_conversation_logs.service_id
        and ai_clone_is_tenant_member(s.tenant_id)
    )
  );

commit;
