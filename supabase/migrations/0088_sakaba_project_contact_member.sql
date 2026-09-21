-- A project row may optionally point to an active member of the same guild.
-- Free-text rows keep member_user_id null.
alter table sakaba.project_contacts
  add column member_user_id uuid references sakaba.profiles(user_id) on delete set null;

create unique index project_contacts_member_once_idx
  on sakaba.project_contacts (project_id, member_user_id)
  where member_user_id is not null;

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
        'member_user_id', c.member_user_id,
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

create or replace function public.sakaba_add_project_contact_v2(
  p_project_id uuid,
  p_label text,
  p_member_user_id uuid default null
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_id uuid;
begin
  if nullif(btrim(p_label), '') is null or char_length(btrim(p_label)) > 30 then
    raise exception 'invalid contact label' using errcode = '22023';
  end if;
  select p.guild_id into v_guild_id from sakaba.projects p
  where p.id = p_project_id and p.owner_id = v_user_id and p.status = 'active'
    and sakaba.is_active_member(p.guild_id, v_user_id) for update;
  if v_guild_id is null then
    raise exception 'project not found or access denied' using errcode = '42501';
  end if;
  if not exists (select 1 from sakaba.project_steps where project_id = p_project_id) then
    raise exception 'project steps not enabled' using errcode = '22023';
  end if;
  if p_member_user_id is not null and not exists (
    select 1 from sakaba.guild_members gm
    where gm.guild_id = v_guild_id and gm.user_id = p_member_user_id
      and gm.suspended_at is null
  ) then
    raise exception 'member is not in this guild' using errcode = '22023';
  end if;
  insert into sakaba.project_contacts (project_id, label, member_user_id, sort_order)
  values (p_project_id, btrim(p_label), p_member_user_id, coalesce((
    select max(sort_order) + 1 from sakaba.project_contacts where project_id = p_project_id
  ), 0)) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.sakaba_add_project_contact_v2(uuid, text, uuid) from public;
grant execute on function public.sakaba_add_project_contact_v2(uuid, text, uuid) to authenticated;

notify pgrst, 'reload schema';
