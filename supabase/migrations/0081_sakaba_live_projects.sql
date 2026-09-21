-- Private live projects. All reads and writes are scoped to an active guild member.
create or replace function public.sakaba_list_my_projects(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  select id into v_guild_id from sakaba.guilds where lower(slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(project_json order by created_at desc), '[]'::jsonb) into v_result
  from (
    select p.created_at,
      jsonb_build_object(
        'id', p.id, 'owner_id', p.owner_id, 'title', p.title,
        'goal', p.goal, 'memo', p.memo, 'source_quest_id', p.source_quest_id,
        'status', p.status, 'start_date', p.start_date, 'due_date', p.due_date,
        'created_at', p.created_at, 'done_at', p.done_at,
        'member_ids', coalesce((
          select jsonb_agg(pm.user_id order by pm.joined_at)
          from sakaba.project_members pm where pm.project_id = p.id
        ), '[]'::jsonb),
        'tasks', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', t.id, 'project_id', t.project_id, 'title', t.title,
            'status', t.status, 'assignee_id', t.assignee_id,
            'start_date', t.start_date, 'due_date', t.due_date,
            'sort_order', t.sort_order, 'done_at', t.done_at
          ) order by t.sort_order, t.created_at)
          from sakaba.project_tasks t where t.project_id = p.id
        ), '[]'::jsonb)
      ) as project_json
    from sakaba.projects p
    where p.guild_id = v_guild_id
      and (p.owner_id = v_user_id or exists (
        select 1 from sakaba.project_members pm
        where pm.project_id = p.id and pm.user_id = v_user_id
      ))
  ) visible_projects;
  return v_result;
end;
$$;

create or replace function public.sakaba_create_project(
  p_guild_slug text, p_title text, p_goal text, p_memo text,
  p_start_date date, p_due_date date
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_project_id uuid;
begin
  select id into v_guild_id from sakaba.guilds where lower(slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 40
    or char_length(coalesce(p_goal, '')) > 200 or char_length(coalesce(p_memo, '')) > 500
    or (p_due_date is not null and p_due_date < coalesce(p_start_date, current_date)) then
    raise exception 'invalid project fields' using errcode = '22023';
  end if;
  -- Serialize free-tier creates so concurrent requests cannot exceed the limit.
  perform 1 from sakaba.guild_members
  where guild_id = v_guild_id and user_id = v_user_id for update;
  if not sakaba.is_paid_member(v_user_id) and
    (select count(*) from sakaba.projects where guild_id = v_guild_id and owner_id = v_user_id) >= 2 then
    raise exception 'free project limit reached' using errcode = '22023';
  end if;
  insert into sakaba.projects (guild_id, owner_id, title, goal, memo, start_date, due_date)
  values (v_guild_id, v_user_id, btrim(p_title), coalesce(p_goal, ''), coalesce(p_memo, ''),
    coalesce(p_start_date, current_date), p_due_date)
  returning id into v_project_id;
  return v_project_id;
end;
$$;

create or replace function public.sakaba_update_project(
  p_project_id uuid, p_title text, p_goal text, p_memo text,
  p_start_date date, p_due_date date
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid();
begin
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 40
    or char_length(coalesce(p_goal, '')) > 200 or char_length(coalesce(p_memo, '')) > 500
    or p_start_date is null or (p_due_date is not null and p_due_date < p_start_date) then
    raise exception 'invalid project fields' using errcode = '22023';
  end if;
  update sakaba.projects p set title = btrim(p_title), goal = coalesce(p_goal, ''),
    memo = coalesce(p_memo, ''), start_date = p_start_date, due_date = p_due_date,
    updated_at = now()
  where p.id = p_project_id and p.owner_id = v_user_id
    and sakaba.is_active_member(p.guild_id, v_user_id);
  if not found then raise exception 'project not found or access denied' using errcode = '42501'; end if;
end;
$$;

create or replace function public.sakaba_set_project_status(p_project_id uuid, p_status text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid();
begin
  if p_status not in ('active', 'done') then
    raise exception 'invalid project status' using errcode = '22023';
  end if;
  update sakaba.projects p set status = p_status,
    done_at = case when p_status = 'done' then coalesce(p.done_at, now()) else null end,
    updated_at = now()
  where p.id = p_project_id and p.owner_id = v_user_id
    and sakaba.is_active_member(p.guild_id, v_user_id);
  if not found then raise exception 'project not found or access denied' using errcode = '42501'; end if;
end;
$$;

create or replace function public.sakaba_add_project_task(
  p_project_id uuid, p_title text, p_start_date date default null, p_due_date date default null
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_task_id uuid;
begin
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 100
    or (p_start_date is not null and p_due_date is not null and p_due_date < p_start_date) then
    raise exception 'invalid task fields' using errcode = '22023';
  end if;
  insert into sakaba.project_tasks (project_id, title, start_date, due_date, sort_order)
  select p.id, btrim(p_title), p_start_date, p_due_date,
    coalesce((select max(t.sort_order) + 1 from sakaba.project_tasks t where t.project_id = p.id), 0)
  from sakaba.projects p
  where p.id = p_project_id and p.owner_id = v_user_id and p.status = 'active'
    and sakaba.is_active_member(p.guild_id, v_user_id)
  returning id into v_task_id;
  if v_task_id is null then raise exception 'project not found or access denied' using errcode = '42501'; end if;
  return v_task_id;
end;
$$;

create or replace function public.sakaba_set_project_task_status(p_task_id uuid, p_status text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid();
begin
  if p_status not in ('todo', 'done') then
    raise exception 'invalid task status' using errcode = '22023';
  end if;
  update sakaba.project_tasks t set status = p_status,
    done_at = case when p_status = 'done' then coalesce(t.done_at, now()) else null end,
    updated_at = now()
  from sakaba.projects p
  where t.id = p_task_id and t.project_id = p.id and p.owner_id = v_user_id
    and p.status = 'active' and sakaba.is_active_member(p.guild_id, v_user_id);
  if not found then raise exception 'task not found or access denied' using errcode = '42501'; end if;
end;
$$;

revoke all on function public.sakaba_list_my_projects(text) from public;
revoke all on function public.sakaba_create_project(text, text, text, text, date, date) from public;
revoke all on function public.sakaba_update_project(uuid, text, text, text, date, date) from public;
revoke all on function public.sakaba_set_project_status(uuid, text) from public;
revoke all on function public.sakaba_add_project_task(uuid, text, date, date) from public;
revoke all on function public.sakaba_set_project_task_status(uuid, text) from public;
grant execute on function public.sakaba_list_my_projects(text) to authenticated;
grant execute on function public.sakaba_create_project(text, text, text, text, date, date) to authenticated;
grant execute on function public.sakaba_update_project(uuid, text, text, text, date, date) to authenticated;
grant execute on function public.sakaba_set_project_status(uuid, text) to authenticated;
grant execute on function public.sakaba_add_project_task(uuid, text, date, date) to authenticated;
grant execute on function public.sakaba_set_project_task_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
