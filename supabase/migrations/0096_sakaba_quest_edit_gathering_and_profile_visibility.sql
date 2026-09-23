-- Let guild masters turn an existing quest into a members-only gathering.
-- The profile-wide visibility panel was created unintentionally; normalize the
-- legacy flags so profile sections and introduction requests remain available.

update sakaba.guild_members
set visible_groups = array['work', 'values', 'connect']::text[],
    accept_intro = true,
    show_achievements = true
where visible_groups is distinct from array['work', 'values', 'connect']::text[]
   or accept_intro is distinct from true
   or show_achievements is distinct from true;

create or replace function public.sakaba_update_quest_v2(
  p_quest_id uuid,
  p_title text,
  p_category text,
  p_summary text,
  p_body text,
  p_region text,
  p_deadline date,
  p_member_limit integer,
  p_is_urgent boolean,
  p_members_only boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_before sakaba.quests%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select q.* into v_before
  from sakaba.quests q
  where q.id = p_quest_id
  for update;

  if not found then
    raise exception 'quest not found' using errcode = 'P0002';
  end if;
  if v_before.creator_id <> v_user_id then
    raise exception 'only the creator can update this quest' using errcode = '42501';
  end if;
  if p_members_only and p_category <> 'gathering' then
    raise exception 'members-only quests must be gatherings' using errcode = '22023';
  end if;
  if v_before.members_only and not p_members_only then
    raise exception 'members-only gatherings cannot be changed back to regular quests' using errcode = '22023';
  end if;
  if p_members_only and not sakaba.is_guild_master(v_before.guild_id, v_user_id) then
    raise exception 'only guild masters can create members-only gatherings' using errcode = '42501';
  end if;

  perform public.sakaba_update_quest(
    p_quest_id,
    p_title,
    p_category,
    p_summary,
    p_body,
    p_region,
    p_deadline,
    p_member_limit,
    p_is_urgent
  );

  update sakaba.quests
  set members_only = p_members_only
  where id = p_quest_id;
end;
$$;

revoke all on function public.sakaba_update_quest_v2(uuid, text, text, text, text, text, date, integer, boolean, boolean) from public;
grant execute on function public.sakaba_update_quest_v2(uuid, text, text, text, text, text, date, integer, boolean, boolean) to authenticated;
