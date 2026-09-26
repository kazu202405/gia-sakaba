-- プロジェクトの持ち主が、自分のタスクの名前をなおす・タスクを消す。
-- 条件は sakaba_add_project_task / sakaba_set_project_task_status と同じ：
-- ログインしている本人が持ち主で、プロジェクトが進行中（active）で、ギルドの会員であるときだけ。

create or replace function public.sakaba_update_project_task(p_task_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 100 then
    raise exception 'invalid task fields' using errcode = '22023';
  end if;

  update sakaba.project_tasks t set title = btrim(p_title), updated_at = now()
  from sakaba.projects p
  where t.id = p_task_id and t.project_id = p.id and p.owner_id = v_user_id
    and p.status = 'active' and sakaba.is_active_member(p.guild_id, v_user_id);

  if not found then
    raise exception 'task not found or access denied' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.sakaba_delete_project_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  delete from sakaba.project_tasks t
  using sakaba.projects p
  where t.id = p_task_id and t.project_id = p.id and p.owner_id = v_user_id
    and p.status = 'active' and sakaba.is_active_member(p.guild_id, v_user_id);

  if not found then
    raise exception 'task not found or access denied' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.sakaba_update_project_task(uuid, text) from public;
revoke all on function public.sakaba_update_project_task(uuid, text) from anon;
grant execute on function public.sakaba_update_project_task(uuid, text) to authenticated;

revoke all on function public.sakaba_delete_project_task(uuid) from public;
revoke all on function public.sakaba_delete_project_task(uuid) from anon;
grant execute on function public.sakaba_delete_project_task(uuid) to authenticated;

notify pgrst, 'reload schema';
