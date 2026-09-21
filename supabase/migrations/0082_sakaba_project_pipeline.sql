-- Live private project pipeline: steps, people, and planned/completed dates.
create or replace function public.sakaba_get_project_pipeline(p_project_id uuid)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select guild_id into v_guild_id from sakaba.projects where id = p_project_id;
  if v_user_id is null or v_guild_id is null
    or not sakaba.is_active_member(v_guild_id, v_user_id)
    or not sakaba.can_access_project(p_project_id, v_user_id) then
    raise exception 'project not found or access denied' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'project_id', s.project_id, 'name', s.name, 'sort_order', s.sort_order
      ) order by s.sort_order, s.created_at)
      from sakaba.project_steps s where s.project_id = p_project_id
    ), '[]'::jsonb),
    'contacts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'project_id', c.project_id, 'label', c.label,
        'memo', c.memo, 'sort_order', c.sort_order
      ) order by c.sort_order, c.created_at)
      from sakaba.project_contacts c where c.project_id = p_project_id
    ), '[]'::jsonb),
    'records', coalesce((
      select jsonb_agg(jsonb_build_object(
        'contact_id', r.contact_id, 'step_id', r.step_id,
        'planned_on', r.planned_on, 'done_on', r.done_on
      )) from sakaba.project_step_records r where r.project_id = p_project_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.sakaba_enable_project_steps(p_project_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid();
begin
  perform 1 from sakaba.projects p
  where p.id = p_project_id and p.owner_id = v_user_id and p.status = 'active'
    and sakaba.is_active_member(p.guild_id, v_user_id) for update;
  if not found then raise exception 'project not found or access denied' using errcode = '42501'; end if;
  if exists (select 1 from sakaba.project_steps where project_id = p_project_id) then return; end if;
  insert into sakaba.project_steps (project_id, name, sort_order)
  values (p_project_id, '初回アポ', 1), (p_project_id, '興味付け', 2),
    (p_project_id, '提案', 3), (p_project_id, '契約', 4);
end;
$$;

create or replace function public.sakaba_add_project_contact(p_project_id uuid, p_label text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if nullif(btrim(p_label), '') is null or char_length(btrim(p_label)) > 30 then
    raise exception 'invalid contact label' using errcode = '22023';
  end if;
  perform 1 from sakaba.projects p
  where p.id = p_project_id and p.owner_id = v_user_id and p.status = 'active'
    and sakaba.is_active_member(p.guild_id, v_user_id) for update;
  if not found then raise exception 'project not found or access denied' using errcode = '42501'; end if;
  if not exists (select 1 from sakaba.project_steps where project_id = p_project_id) then
    raise exception 'project steps not enabled' using errcode = '22023';
  end if;
  insert into sakaba.project_contacts (project_id, label, sort_order)
  values (p_project_id, btrim(p_label), coalesce((
    select max(sort_order) + 1 from sakaba.project_contacts where project_id = p_project_id
  ), 0)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.sakaba_update_project_contact(
  p_contact_id uuid, p_label text, p_memo text
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid();
begin
  if nullif(btrim(p_label), '') is null or char_length(btrim(p_label)) > 30
    or char_length(coalesce(p_memo, '')) > 100 then
    raise exception 'invalid contact fields' using errcode = '22023';
  end if;
  update sakaba.project_contacts c set label = btrim(p_label), memo = coalesce(p_memo, '')
  from sakaba.projects p
  where c.id = p_contact_id and c.project_id = p.id and p.owner_id = v_user_id
    and p.status = 'active' and sakaba.is_active_member(p.guild_id, v_user_id);
  if not found then raise exception 'contact not found or access denied' using errcode = '42501'; end if;
end;
$$;

create or replace function public.sakaba_add_project_step(p_project_id uuid, p_name text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if nullif(btrim(p_name), '') is null or char_length(btrim(p_name)) > 12 then
    raise exception 'invalid step name' using errcode = '22023';
  end if;
  perform 1 from sakaba.projects p
  where p.id = p_project_id and p.owner_id = v_user_id and p.status = 'active'
    and sakaba.is_active_member(p.guild_id, v_user_id) for update;
  if not found then raise exception 'project not found or access denied' using errcode = '42501'; end if;
  if (select count(*) from sakaba.project_steps where project_id = p_project_id) >= 12 then
    raise exception 'step limit reached' using errcode = '22023';
  end if;
  insert into sakaba.project_steps (project_id, name, sort_order)
  values (p_project_id, btrim(p_name), coalesce((
    select max(sort_order) + 1 from sakaba.project_steps where project_id = p_project_id
  ), 0)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.sakaba_rename_project_step(p_step_id uuid, p_name text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid();
begin
  if nullif(btrim(p_name), '') is null or char_length(btrim(p_name)) > 12 then
    raise exception 'invalid step name' using errcode = '22023';
  end if;
  update sakaba.project_steps s set name = btrim(p_name)
  from sakaba.projects p
  where s.id = p_step_id and s.project_id = p.id and p.owner_id = v_user_id
    and p.status = 'active' and sakaba.is_active_member(p.guild_id, v_user_id);
  if not found then raise exception 'step not found or access denied' using errcode = '42501'; end if;
end;
$$;

create or replace function public.sakaba_set_project_step_record(
  p_contact_id uuid, p_step_id uuid, p_planned_on date, p_done_on date
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid(); v_project_id uuid;
begin
  select p.id into v_project_id
  from sakaba.project_contacts c
  join sakaba.project_steps s on s.project_id = c.project_id and s.id = p_step_id
  join sakaba.projects p on p.id = c.project_id
  where c.id = p_contact_id and p.owner_id = v_user_id and p.status = 'active'
    and sakaba.is_active_member(p.guild_id, v_user_id);
  if v_project_id is null then
    raise exception 'record not found or access denied' using errcode = '42501';
  end if;
  if p_planned_on is null and p_done_on is null then
    delete from sakaba.project_step_records
    where contact_id = p_contact_id and step_id = p_step_id;
  else
    insert into sakaba.project_step_records (project_id, contact_id, step_id, planned_on, done_on)
    values (v_project_id, p_contact_id, p_step_id, p_planned_on, p_done_on)
    on conflict (contact_id, step_id) do update
      set planned_on = excluded.planned_on, done_on = excluded.done_on;
  end if;
end;
$$;

revoke all on function public.sakaba_get_project_pipeline(uuid) from public;
revoke all on function public.sakaba_enable_project_steps(uuid) from public;
revoke all on function public.sakaba_add_project_contact(uuid, text) from public;
revoke all on function public.sakaba_update_project_contact(uuid, text, text) from public;
revoke all on function public.sakaba_add_project_step(uuid, text) from public;
revoke all on function public.sakaba_rename_project_step(uuid, text) from public;
revoke all on function public.sakaba_set_project_step_record(uuid, uuid, date, date) from public;
grant execute on function public.sakaba_get_project_pipeline(uuid) to authenticated;
grant execute on function public.sakaba_enable_project_steps(uuid) to authenticated;
grant execute on function public.sakaba_add_project_contact(uuid, text) to authenticated;
grant execute on function public.sakaba_update_project_contact(uuid, text, text) to authenticated;
grant execute on function public.sakaba_add_project_step(uuid, text) to authenticated;
grant execute on function public.sakaba_rename_project_step(uuid, text) to authenticated;
grant execute on function public.sakaba_set_project_step_record(uuid, uuid, date, date) to authenticated;

notify pgrst, 'reload schema';
