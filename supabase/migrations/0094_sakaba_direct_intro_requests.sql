-- Introduction requests now go directly from one member to the other.
-- The guild master is not an approval or relay step.

create or replace function public.sakaba_list_intro_requests(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ir.id, 'requester_id', ir.requester_id, 'target_id', ir.target_id,
    'quest_id', ir.quest_id, 'purpose', ir.purpose,
    'message', ir.message,
    'status', ir.status, 'outcome', ir.outcome,
    'created_at', ir.created_at, 'updated_at', ir.updated_at,
    'other_contact', case
      when ir.status in ('accepted', 'introduced')
        and v_user_id in (ir.requester_id, ir.target_id)
        and sakaba.is_active_member(v_guild_id, ir.requester_id)
        and sakaba.is_active_member(v_guild_id, ir.target_id)
      then jsonb_build_object(
        'email', case when other_pc.email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then other_pc.email else '' end,
        'line_url', case when other_pc.line_url ~* '^https?://' then other_pc.line_url else '' end,
        'website_url', case when other_pc.website_url ~* '^https?://' then other_pc.website_url else '' end
      ) else null end
  ) order by ir.updated_at desc), '[]'::jsonb) into v_result
  from sakaba.intro_requests ir
  left join sakaba.profile_contacts other_pc on other_pc.user_id = case
    when v_user_id = ir.requester_id then ir.target_id
    when v_user_id = ir.target_id then ir.requester_id
    else null end
  where ir.guild_id = v_guild_id
    and v_user_id in (ir.requester_id, ir.target_id);
  return v_result;
end;
$$;

create or replace function public.sakaba_create_intro_request(
  p_guild_slug text, p_target_id uuid, p_purpose text, p_message text default ''
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_target_id is null or p_target_id = v_user_id or not exists (
    select 1 from sakaba.guild_members gm where gm.guild_id = v_guild_id
      and gm.user_id = p_target_id and gm.suspended_at is null and gm.accept_intro
  ) then raise exception 'target is not accepting introductions' using errcode = '22023'; end if;
  if p_purpose is null or p_purpose not in ('work', 'consult', 'collab', 'info') then
    raise exception 'invalid introduction purpose' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) > 400 then
    raise exception 'message is too long' using errcode = '22001';
  end if;

  insert into sakaba.intro_requests
    (guild_id, requester_id, target_id, purpose, message, status, proposed_at)
  values
    (v_guild_id, v_user_id, p_target_id, p_purpose, btrim(coalesce(p_message, '')), 'proposed', now())
  returning id into v_id;

  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
  values (v_guild_id, p_target_id, 'intro_progress', v_user_id, v_id, 'proposed');
  return v_id;
end;
$$;

create or replace function public.sakaba_act_on_intro_request(p_request_id uuid, p_action text)
returns text language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_request sakaba.intro_requests%rowtype;
  v_next_status text;
  v_notify_user uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_request from sakaba.intro_requests where id = p_request_id for update;
  if not found or not sakaba.is_active_member(v_request.guild_id, v_user_id) then
    raise exception 'introduction not found' using errcode = '42501';
  end if;
  if p_action = 'accept' and (
    not sakaba.is_active_member(v_request.guild_id, v_request.requester_id)
    or not sakaba.is_active_member(v_request.guild_id, v_request.target_id)
  ) then raise exception 'both members must be active' using errcode = '42501'; end if;

  if p_action = 'cancel' and v_request.requester_id = v_user_id and v_request.status = 'proposed' then
    v_next_status := 'cancelled'; v_notify_user := v_request.target_id;
  elsif p_action = 'accept' and v_request.target_id = v_user_id and v_request.status = 'proposed' then
    v_next_status := 'accepted'; v_notify_user := v_request.requester_id;
  elsif p_action = 'decline_target' and v_request.target_id = v_user_id and v_request.status = 'proposed' then
    v_next_status := 'declined_by_target'; v_notify_user := v_request.requester_id;
  else
    raise exception 'action not allowed in this state' using errcode = '42501';
  end if;

  update sakaba.intro_requests set status = v_next_status where id = p_request_id;
  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
  values (v_request.guild_id, v_notify_user, 'intro_progress', v_user_id, p_request_id, v_next_status);
  return v_next_status;
end;
$$;

create or replace function public.sakaba_request_quest_applicant_intro(
  p_quest_id uuid, p_applicant_id uuid
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_request_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
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
  ) then raise exception 'applicant is unavailable for introduction' using errcode = '22023'; end if;

  insert into sakaba.intro_requests
    (guild_id, requester_id, target_id, quest_id, purpose, message, status, proposed_at)
  values
    (v_quest.guild_id, v_user_id, p_applicant_id, p_quest_id, v_quest.category, '', 'proposed', now())
  returning id into v_request_id;
  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
  values (v_quest.guild_id, p_applicant_id, 'intro_progress', v_user_id, v_request_id, 'proposed');
  return v_request_id;
end;
$$;

-- Move requests waiting for a master directly to the target.
update sakaba.intro_requests
set status = 'proposed', proposed_at = coalesce(proposed_at, now())
where status in ('requested', 'reviewing');

insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
select ir.guild_id, ir.target_id, 'intro_progress', ir.requester_id, ir.id, 'proposed'
from sakaba.intro_requests ir
where ir.status = 'proposed'
  and not exists (
    select 1 from sakaba.notifications n
    where n.intro_request_id = ir.id and n.user_id = ir.target_id and n.intro_status = 'proposed'
  );

revoke all on function public.sakaba_list_intro_requests(text) from public;
revoke all on function public.sakaba_create_intro_request(text, uuid, text, text) from public;
revoke all on function public.sakaba_act_on_intro_request(uuid, text) from public;
revoke all on function public.sakaba_request_quest_applicant_intro(uuid, uuid) from public;
grant execute on function public.sakaba_list_intro_requests(text) to authenticated;
grant execute on function public.sakaba_create_intro_request(text, uuid, text, text) to authenticated;
grant execute on function public.sakaba_act_on_intro_request(uuid, text) to authenticated;
grant execute on function public.sakaba_request_quest_applicant_intro(uuid, uuid) to authenticated;
notify pgrst, 'reload schema';
