-- Live introduction flow. Contact data is returned only to the two people
-- after the target accepts; it is never included in the member directory.
create unique index intro_requests_one_active_pair_idx
on sakaba.intro_requests (guild_id, requester_id, target_id)
where status in ('requested', 'reviewing', 'proposed', 'accepted', 'introduced');

create or replace function public.sakaba_list_intro_requests(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_is_master boolean;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  v_is_master := sakaba.is_guild_master(v_guild_id, v_user_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ir.id, 'requester_id', ir.requester_id, 'target_id', ir.target_id,
    'quest_id', ir.quest_id, 'purpose', ir.purpose,
    'message', case when v_is_master or ir.requester_id = v_user_id then ir.message else '' end,
    'status', ir.status, 'outcome', ir.outcome,
    'created_at', ir.created_at, 'updated_at', ir.updated_at,
    'other_contact', case
      when ir.status in ('accepted', 'introduced')
        and v_user_id in (ir.requester_id, ir.target_id)
        and sakaba.is_active_member(v_guild_id, ir.requester_id)
        and sakaba.is_active_member(v_guild_id, ir.target_id)
      then jsonb_build_object(
        'email', case when other_pc.email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
          then other_pc.email else '' end,
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
    and (
      v_is_master or ir.requester_id = v_user_id
      or (ir.target_id = v_user_id and ir.status in ('proposed', 'accepted', 'introduced'))
    );
  return v_result;
end;
$$;

create or replace function public.sakaba_create_intro_request(
  p_guild_slug text,
  p_target_id uuid,
  p_purpose text,
  p_message text default ''
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_target_id is null or p_target_id = v_user_id
    or not exists (
      select 1 from sakaba.guild_members gm
      where gm.guild_id = v_guild_id and gm.user_id = p_target_id
        and gm.suspended_at is null and gm.accept_intro
    ) then
    raise exception 'target is not accepting introductions' using errcode = '22023';
  end if;
  if p_purpose is null or p_purpose not in ('work', 'consult', 'collab', 'info') then
    raise exception 'invalid introduction purpose' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) > 400 then
    raise exception 'message is too long' using errcode = '22001';
  end if;

  insert into sakaba.intro_requests
    (guild_id, requester_id, target_id, purpose, message)
  values
    (v_guild_id, v_user_id, p_target_id, p_purpose, btrim(coalesce(p_message, '')))
  returning id into v_id;

  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
  select v_guild_id, gm.user_id, 'intro_progress', v_user_id, v_id, 'requested'
  from sakaba.guild_members gm
  where gm.guild_id = v_guild_id and gm.role in ('owner', 'master')
    and gm.suspended_at is null and gm.user_id <> v_user_id;
  return v_id;
end;
$$;

create or replace function public.sakaba_act_on_intro_request(
  p_request_id uuid,
  p_action text
)
returns text language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_request sakaba.intro_requests%rowtype;
  v_next_status text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select * into v_request from sakaba.intro_requests
  where id = p_request_id for update;
  if not found or not sakaba.is_active_member(v_request.guild_id, v_user_id) then
    raise exception 'introduction not found' using errcode = '42501';
  end if;
  if p_action in ('propose', 'accept') and (
    not sakaba.is_active_member(v_request.guild_id, v_request.requester_id)
    or not sakaba.is_active_member(v_request.guild_id, v_request.target_id)
  ) then
    raise exception 'both members must be active' using errcode = '42501';
  end if;

  if p_action = 'cancel' and v_request.requester_id = v_user_id
    and v_request.status in ('requested', 'reviewing') then
    v_next_status := 'cancelled';
  elsif p_action = 'propose' and sakaba.is_guild_master(v_request.guild_id, v_user_id)
    and v_request.status in ('requested', 'reviewing') then
    if not exists (
      select 1 from sakaba.guild_members gm
      where gm.guild_id = v_request.guild_id and gm.user_id = v_request.target_id
        and gm.suspended_at is null and gm.accept_intro
    ) then
      raise exception 'target is not accepting introductions' using errcode = '22023';
    end if;
    v_next_status := 'proposed';
  elsif p_action = 'decline_master' and sakaba.is_guild_master(v_request.guild_id, v_user_id)
    and v_request.status in ('requested', 'reviewing') then
    v_next_status := 'declined_by_master';
  elsif p_action = 'accept' and v_request.target_id = v_user_id
    and v_request.status = 'proposed' then
    v_next_status := 'accepted';
  elsif p_action = 'decline_target' and v_request.target_id = v_user_id
    and v_request.status = 'proposed' then
    v_next_status := 'declined_by_target';
  elsif p_action = 'introduced' and sakaba.is_guild_master(v_request.guild_id, v_user_id)
    and v_request.status = 'accepted' then
    v_next_status := 'introduced';
  else
    raise exception 'action not allowed in this state' using errcode = '42501';
  end if;

  update sakaba.intro_requests
  set status = v_next_status,
      proposed_at = case when v_next_status = 'proposed' then now() else proposed_at end
  where id = p_request_id;

  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
  select v_request.guild_id, gm.user_id, 'intro_progress', v_user_id, p_request_id, v_next_status
  from sakaba.guild_members gm
  where gm.guild_id = v_request.guild_id and gm.suspended_at is null
    and gm.user_id <> v_user_id
    and (
      (v_next_status = 'proposed' and gm.user_id = v_request.target_id)
      or (v_next_status in ('accepted', 'declined_by_target')
        and (gm.user_id = v_request.requester_id or gm.role in ('owner', 'master')))
      or (v_next_status = 'declined_by_master' and gm.user_id = v_request.requester_id)
      or (v_next_status = 'cancelled' and gm.role in ('owner', 'master'))
      or (v_next_status = 'introduced' and gm.user_id in (v_request.requester_id, v_request.target_id))
    );
  return v_next_status;
end;
$$;

create or replace function public.sakaba_list_my_notifications(p_guild_slug text default 'gia')
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
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]'::jsonb) into v_result
  from (
    select id, user_id, kind, actor_id, quest_id, intro_request_id,
      intro_status, changed_fields, read_at, created_at
    from sakaba.notifications
    where guild_id = v_guild_id and user_id = v_user_id
    order by created_at desc limit 100
  ) n;
  return v_result;
end;
$$;

create or replace function public.sakaba_mark_notifications_read(
  p_guild_slug text,
  p_notification_id uuid default null
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  update sakaba.notifications set read_at = now()
  where guild_id = v_guild_id and user_id = v_user_id and read_at is null
    and (p_notification_id is null or id = p_notification_id);
end;
$$;

revoke all on function public.sakaba_list_intro_requests(text) from public;
revoke all on function public.sakaba_create_intro_request(text, uuid, text, text) from public;
revoke all on function public.sakaba_act_on_intro_request(uuid, text) from public;
revoke all on function public.sakaba_list_my_notifications(text) from public;
revoke all on function public.sakaba_mark_notifications_read(text, uuid) from public;
grant execute on function public.sakaba_list_intro_requests(text) to authenticated;
grant execute on function public.sakaba_create_intro_request(text, uuid, text, text) to authenticated;
grant execute on function public.sakaba_act_on_intro_request(uuid, text) to authenticated;
grant execute on function public.sakaba_list_my_notifications(text) to authenticated;
grant execute on function public.sakaba_mark_notifications_read(text, uuid) to authenticated;

-- Row-level security cannot hide the requester's note from the target by
-- column. All client reads now go through the redacting RPC above.
revoke select on sakaba.intro_requests from authenticated;
revoke select on sakaba.intro_request_notes from authenticated;

notify pgrst, 'reload schema';
