-- A project owner can permanently delete their own project.
-- Tasks, members, contacts, steps, and step records are removed by FK cascades.

create or replace function public.sakaba_delete_project(p_project_id uuid)
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

  delete from sakaba.projects p
  where p.id = p_project_id
    and p.owner_id = v_user_id
    and sakaba.is_active_member(p.guild_id, v_user_id);

  if not found then
    raise exception 'project not found or access denied' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.sakaba_delete_project(uuid) from public;
revoke all on function public.sakaba_delete_project(uuid) from anon;
grant execute on function public.sakaba_delete_project(uuid) to authenticated;

notify pgrst, 'reload schema';
