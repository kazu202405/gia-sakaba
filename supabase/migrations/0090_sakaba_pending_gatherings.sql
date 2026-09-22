-- Guild masters can review first-time applications to members-only gatherings.
-- This function exposes the applicant's role/company and private intake answer
-- only to active owner/master members of the same guild.
create or replace function public.sakaba_list_pending_gathering_applications(
  p_guild_slug text default 'gia'
)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id
  from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'quest_id', q.id,
    'quest_title', q.title,
    'user_id', qa.user_id,
    'display_name', p.display_name,
    'company_name', gm.company_name,
    'position', gm.position,
    'want_to_solve', gm.want_to_solve,
    'message', qa.message,
    'created_at', qa.created_at
  ) order by qa.created_at, qa.quest_id, qa.user_id), '[]'::jsonb)
  into v_result
  from sakaba.quest_applications qa
  join sakaba.quests q on q.id = qa.quest_id
  join sakaba.guild_members gm on gm.guild_id = q.guild_id and gm.user_id = qa.user_id
  join sakaba.profiles p on p.user_id = qa.user_id
  where q.guild_id = v_guild_id
    and q.members_only
    and qa.status = 'applied'
    and qa.approved_at is null
    and qa.declined_at is null
    and gm.suspended_at is null;
  return v_result;
end;
$$;

revoke all on function public.sakaba_list_pending_gathering_applications(text) from public;
grant execute on function public.sakaba_list_pending_gathering_applications(text) to authenticated;
notify pgrst, 'reload schema';
