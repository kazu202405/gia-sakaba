-- Record what happened after a guild master marked an introduction complete.
-- Only an active owner/master of the introduction's guild may update it.
create or replace function public.sakaba_set_intro_outcome(
  p_request_id uuid,
  p_outcome text
)
returns text language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_request sakaba.intro_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_outcome is null or p_outcome not in ('met', 'working', 'no_fit') then
    raise exception 'invalid introduction outcome' using errcode = '22023';
  end if;

  select * into v_request
  from sakaba.intro_requests
  where id = p_request_id
  for update;
  if not found or not sakaba.is_guild_master(v_request.guild_id, v_user_id) then
    raise exception 'introduction not found or access denied' using errcode = '42501';
  end if;
  if v_request.status <> 'introduced' then
    raise exception 'introduction is not complete' using errcode = '22023';
  end if;

  update sakaba.intro_requests
  set outcome = p_outcome
  where id = p_request_id;
  return p_outcome;
end;
$$;

revoke all on function public.sakaba_set_intro_outcome(uuid, text) from public;
grant execute on function public.sakaba_set_intro_outcome(uuid, text) to authenticated;
notify pgrst, 'reload schema';
