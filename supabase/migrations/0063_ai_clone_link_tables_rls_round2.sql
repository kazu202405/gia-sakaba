-- 0063_ai_clone_link_tables_rls_round2.sql
--
-- 0032 の続き。リンクテーブルは RLS が有効化されているのにポリシーが無いと、
-- Web UI（cookie auth = user 権限）からの SELECT/INSERT/UPDATE/DELETE が全拒否される。
-- Slack/LINE（service_role）はバイパスするため気付きにくい。
--
-- 症状：案件詳細・人物詳細の「関連人物／関連案件」等が、チャットでは見えるのに
--   Web では空。原因＝下記リンクテーブルにポリシー未設定（0032 は会話ログ系3本のみ）。
--
-- 方針：0032 と同じく、tenant_id を持たないリンクテーブルは結合元（person /
--   project / service）の tenant_id を経由してテナント member ガードする。
--   再適用できるよう drop policy if exists 付き。

begin;

-- person ⇄ project（今回の症状の本体）
alter table ai_clone_person_projects enable row level security;
drop policy if exists ai_clone_person_projects_all on ai_clone_person_projects;
create policy ai_clone_person_projects_all on ai_clone_person_projects for all
  using (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_projects.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  )
  with check (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_projects.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  );

-- service ⇄ project（案件詳細の「関連サービス」）
alter table ai_clone_service_projects enable row level security;
drop policy if exists ai_clone_service_projects_all on ai_clone_service_projects;
create policy ai_clone_service_projects_all on ai_clone_service_projects for all
  using (
    exists (select 1 from ai_clone_project pr
      where pr.id = ai_clone_service_projects.project_id
        and ai_clone_is_tenant_member(pr.tenant_id))
  )
  with check (
    exists (select 1 from ai_clone_project pr
      where pr.id = ai_clone_service_projects.project_id
        and ai_clone_is_tenant_member(pr.tenant_id))
  );

-- person ⇄ task（人物詳細の「関連タスク」）
alter table ai_clone_person_tasks enable row level security;
drop policy if exists ai_clone_person_tasks_all on ai_clone_person_tasks;
create policy ai_clone_person_tasks_all on ai_clone_person_tasks for all
  using (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_tasks.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  )
  with check (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_tasks.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  );

-- person ⇄ expense（人物詳細の「関連経費」）
alter table ai_clone_person_expenses enable row level security;
drop policy if exists ai_clone_person_expenses_all on ai_clone_person_expenses;
create policy ai_clone_person_expenses_all on ai_clone_person_expenses for all
  using (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_expenses.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  )
  with check (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_expenses.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  );

-- person ⇄ activity_log（人物詳細の「関連活動ログ」※非表示中だが整合のため）
alter table ai_clone_person_activity_logs enable row level security;
drop policy if exists ai_clone_person_activity_logs_all on ai_clone_person_activity_logs;
create policy ai_clone_person_activity_logs_all on ai_clone_person_activity_logs for all
  using (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_activity_logs.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  )
  with check (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_activity_logs.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  );

-- person ⇄ decision_log（人物詳細の「関連判断事例」）
alter table ai_clone_person_decision_logs enable row level security;
drop policy if exists ai_clone_person_decision_logs_all on ai_clone_person_decision_logs;
create policy ai_clone_person_decision_logs_all on ai_clone_person_decision_logs for all
  using (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_decision_logs.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  )
  with check (
    exists (select 1 from ai_clone_person p
      where p.id = ai_clone_person_decision_logs.person_id
        and ai_clone_is_tenant_member(p.tenant_id))
  );

commit;
