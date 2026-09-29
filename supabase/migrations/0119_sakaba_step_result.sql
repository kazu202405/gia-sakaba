-- 進捗のます目に「結果（OK / NG）」を持たせる。手順の名前は自由なので、どのます目にも付けられる。
-- 日付なしで結果だけ（例：日付は決まっていないがNG）も許す。
alter table sakaba.project_step_records
  add column result text check (result in ('ok', 'ng'));

alter table sakaba.project_step_records
  drop constraint project_step_records_not_empty;
alter table sakaba.project_step_records
  add constraint project_step_records_not_empty
  check (planned_on is not null or done_on is not null or result is not null);

-- 読み取り：records に result を足す（0088 の定義から result の1項目だけ追加）
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
        'planned_on', r.planned_on, 'done_on', r.done_on, 'result', r.result
      )) from sakaba.project_step_records r where r.project_id = p_project_id
    ), '[]'::jsonb)
  );
end;
$$;

-- 保存：引数を1つ増やす。古い4引数の版は消す（残すと同名で曖昧になる）
drop function public.sakaba_set_project_step_record(uuid, uuid, date, date);

create or replace function public.sakaba_set_project_step_record(
  p_contact_id uuid, p_step_id uuid, p_planned_on date, p_done_on date, p_result text default null
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
  if p_result is not null and p_result not in ('ok', 'ng') then
    raise exception 'invalid result' using errcode = '22023';
  end if;
  if p_planned_on is null and p_done_on is null and p_result is null then
    delete from sakaba.project_step_records
    where contact_id = p_contact_id and step_id = p_step_id;
  else
    insert into sakaba.project_step_records (project_id, contact_id, step_id, planned_on, done_on, result)
    values (v_project_id, p_contact_id, p_step_id, p_planned_on, p_done_on, p_result)
    on conflict (contact_id, step_id) do update
      set planned_on = excluded.planned_on, done_on = excluded.done_on, result = excluded.result;
  end if;
end;
$$;

revoke all on function public.sakaba_set_project_step_record(uuid, uuid, date, date, text) from public, anon;
grant execute on function public.sakaba_set_project_step_record(uuid, uuid, date, date, text) to authenticated;

notify pgrst, 'reload schema';
