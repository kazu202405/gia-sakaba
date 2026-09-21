-- Delete one pipeline contact and its step dates, only by the active project owner.
create or replace function public.sakaba_delete_project_contact(p_contact_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid();
begin
  delete from sakaba.project_contacts c
  using sakaba.projects p
  where c.id = p_contact_id
    and c.project_id = p.id
    and p.owner_id = v_user_id
    and p.status = 'active'
    and sakaba.is_active_member(p.guild_id, v_user_id);
  if not found then
    raise exception 'contact not found or access denied' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.sakaba_delete_project_contact(uuid) from public;
grant execute on function public.sakaba_delete_project_contact(uuid) to authenticated;

notify pgrst, 'reload schema';
