-- 0091: A quest creator (or guild master) can review applicants. Only the
-- creator can request an introduction linked to a normal quest.

create or replace function public.sakaba_list_quest_applicants(p_quest_id uuid)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select * into v_quest from sakaba.quests where id = p_quest_id;
  if not found or not sakaba.is_active_member(v_quest.guild_id, v_user_id)
    or (v_quest.creator_id <> v_user_id and not sakaba.is_guild_master(v_quest.guild_id, v_user_id)) then
    raise exception 'quest applicants not available' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', qa.user_id,
    'message', qa.message,
    'created_at', qa.created_at,
    'intro_request_id', ir.id,
    'intro_status', ir.status
  ) order by qa.created_at), '[]'::jsonb) into v_result
  from sakaba.quest_applications qa
  left join lateral (
    select request.id, request.status
    from sakaba.intro_requests request
    where request.quest_id = p_quest_id
      and request.requester_id = v_quest.creator_id
      and request.target_id = qa.user_id
    order by request.created_at desc
    limit 1
  ) ir on true
  where qa.quest_id = p_quest_id and qa.status = 'applied';

  return v_result;
end;
$$;

create or replace function public.sakaba_request_quest_applicant_intro(
  p_quest_id uuid,
  p_applicant_id uuid
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select * into v_quest from sakaba.quests where id = p_quest_id for update;
  if not found or v_quest.creator_id <> v_user_id
    or not sakaba.is_active_member(v_quest.guild_id, v_user_id) then
    raise exception 'only the creator can request an applicant introduction' using errcode = '42501';
  end if;
  if v_quest.members_only or v_quest.category not in ('work', 'consult', 'collab', 'info')
    or v_quest.status not in ('open', 'in_progress') then
    raise exception 'this quest cannot request an introduction' using errcode = '22023';
  end if;
  if not exists (
    select 1 from sakaba.quest_applications qa
    join sakaba.guild_members gm on gm.guild_id = v_quest.guild_id and gm.user_id = qa.user_id
    where qa.quest_id = p_quest_id and qa.user_id = p_applicant_id
      and qa.status = 'applied' and gm.suspended_at is null and gm.accept_intro
  ) then
    raise exception 'applicant is unavailable for introduction' using errcode = '22023';
  end if;

  insert into sakaba.intro_requests
    (guild_id, requester_id, target_id, quest_id, purpose, message)
  values
    (v_quest.guild_id, v_user_id, p_applicant_id, p_quest_id, v_quest.category, '')
  returning id into v_request_id;

  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
  select v_quest.guild_id, gm.user_id, 'intro_progress', v_user_id, v_request_id, 'requested'
  from sakaba.guild_members gm
  where gm.guild_id = v_quest.guild_id and gm.role in ('owner', 'master')
    and gm.suspended_at is null and gm.user_id <> v_user_id;

  return v_request_id;
end;
$$;

revoke all on function public.sakaba_list_quest_applicants(uuid) from public;
revoke all on function public.sakaba_request_quest_applicant_intro(uuid, uuid) from public;
grant execute on function public.sakaba_list_quest_applicants(uuid) to authenticated;
grant execute on function public.sakaba_request_quest_applicant_intro(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
