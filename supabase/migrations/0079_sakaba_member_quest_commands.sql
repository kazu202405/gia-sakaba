-- ============================================================================
-- 0079: GIAの酒場 member/profile/quest command RPCs
--
-- All writes go through SECURITY DEFINER functions. Direct table writes remain
-- denied. Each multi-row operation and its notifications share one transaction.
-- ============================================================================

-- Invite URLs carry only the code, so a code must identify one guild globally.
drop index if exists sakaba.invites_guild_code_lower_uidx;
create unique index invites_code_lower_uidx on sakaba.invites (lower(code));

-- --------------------------------------------------------------------------
-- Invite and membership
-- --------------------------------------------------------------------------

create or replace function public.sakaba_check_invite(p_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_invite sakaba.invites%rowtype;
  v_guild sakaba.guilds%rowtype;
  v_inviter_name text;
begin
  if nullif(btrim(p_code), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select i.* into v_invite
  from sakaba.invites i
  where lower(i.code) = lower(btrim(p_code));

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_invite.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'used_up');
  end if;

  select g.* into v_guild from sakaba.guilds g where g.id = v_invite.guild_id;
  select p.display_name into v_inviter_name
  from sakaba.profiles p
  where p.user_id = v_invite.created_by;

  return jsonb_build_object(
    'ok', true,
    'guild', jsonb_build_object('slug', v_guild.slug, 'name', v_guild.name),
    'inviter_name', coalesce(v_inviter_name, '')
  );
end;
$$;

create or replace function public.sakaba_join_guild(
  p_code text,
  p_display_name text,
  p_company_name text,
  p_position text,
  p_show_company boolean,
  p_want_to_solve text default '',
  p_agreed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite sakaba.invites%rowtype;
  v_existing sakaba.guild_members%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not p_agreed then
    raise exception 'guild promises must be accepted' using errcode = '22023';
  end if;
  if nullif(btrim(p_display_name), '') is null or char_length(btrim(p_display_name)) > 30 then
    raise exception 'display_name must be 1 to 30 characters' using errcode = '22023';
  end if;
  if nullif(btrim(p_company_name), '') is null or char_length(btrim(p_company_name)) > 60 then
    raise exception 'company_name must be 1 to 60 characters' using errcode = '22023';
  end if;
  if p_position not in ('ceo', 'officer', 'decider', 'other') then
    raise exception 'invalid position' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_want_to_solve, ''))) > 60 then
    raise exception 'want_to_solve must be at most 60 characters' using errcode = '22023';
  end if;

  select i.* into v_invite
  from sakaba.invites i
  where lower(i.code) = lower(btrim(p_code))
  for update;

  if not found or v_invite.revoked_at is not null then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'invite expired' using errcode = '22023';
  end if;
  if v_invite.used_count >= v_invite.max_uses then
    raise exception 'invite used up' using errcode = '22023';
  end if;

  select gm.* into v_existing
  from sakaba.guild_members gm
  where gm.guild_id = v_invite.guild_id and gm.user_id = v_user_id;

  if found then
    if v_existing.suspended_at is not null then
      raise exception 'membership suspended' using errcode = '42501';
    end if;
    return jsonb_build_object('joined', false, 'already_member', true, 'guild_id', v_invite.guild_id);
  end if;

  insert into sakaba.profiles (user_id, display_name)
  values (v_user_id, btrim(p_display_name))
  on conflict (user_id) do update
    set display_name = excluded.display_name;

  insert into sakaba.guild_members (
    guild_id,
    user_id,
    company_name,
    position,
    show_company,
    want_to_solve,
    invite_id,
    promises_agreed_at
  ) values (
    v_invite.guild_id,
    v_user_id,
    btrim(p_company_name),
    p_position,
    p_show_company,
    btrim(coalesce(p_want_to_solve, '')),
    v_invite.id,
    now()
  );

  update sakaba.invites
  set used_count = used_count + 1
  where id = v_invite.id;

  return jsonb_build_object('joined', true, 'already_member', false, 'guild_id', v_invite.guild_id);
end;
$$;

-- --------------------------------------------------------------------------
-- Profile and personal settings
-- --------------------------------------------------------------------------

create or replace function public.sakaba_update_my_profile(
  p_guild_slug text,
  p_display_name text,
  p_photo_url text,
  p_headline text,
  p_job text,
  p_job_icon text,
  p_region text,
  p_bio text,
  p_can_help_with text,
  p_strengths text,
  p_values_text text,
  p_vision text,
  p_social_issue text,
  p_looking_for text,
  p_want_to_meet text,
  p_visible_groups text[],
  p_accept_intro boolean,
  p_company_name text,
  p_position text,
  p_show_company boolean,
  p_want_to_solve text,
  p_show_achievements boolean,
  p_email text default '',
  p_line_url text default '',
  p_website_url text default '',
  p_industry text default '',
  p_keywords text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_tag_id uuid;
  v_keyword text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select g.id into v_guild_id
  from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));

  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;

  if nullif(btrim(p_display_name), '') is null or char_length(btrim(p_display_name)) > 30 then
    raise exception 'display_name must be 1 to 30 characters' using errcode = '22023';
  end if;
  if nullif(btrim(p_company_name), '') is null or char_length(btrim(p_company_name)) > 60 then
    raise exception 'company_name must be 1 to 60 characters' using errcode = '22023';
  end if;
  if p_position not in ('ceo', 'officer', 'decider', 'other') then
    raise exception 'invalid position' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_want_to_solve, ''))) > 60 then
    raise exception 'want_to_solve must be at most 60 characters' using errcode = '22023';
  end if;
  if p_job_icon not in (
    'web', 'tax', 'build', 'food', 'marketing', 'realestate', 'legal',
    'design', 'teach', 'health', 'owner', 'retail', 'maker', 'beauty',
    'finance', 'logistics', 'care', 'hr', 'farm', 'other'
  ) then
    raise exception 'invalid job_icon' using errcode = '22023';
  end if;
  if not coalesce(p_visible_groups, '{}') <@ array['work', 'values', 'connect']::text[] then
    raise exception 'invalid visible_groups' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_strengths, ''))) > 200 then
    raise exception 'strengths must be at most 200 characters' using errcode = '22023';
  end if;
  if sakaba.is_paid_member(v_user_id)
     and char_length(btrim(coalesce(p_strengths, ''))) < 20 then
    raise exception 'paid members must provide strengths of at least 20 characters' using errcode = '22023';
  end if;

  update sakaba.profiles
  set display_name = btrim(p_display_name),
      photo_url = nullif(btrim(coalesce(p_photo_url, '')), ''),
      headline = btrim(coalesce(p_headline, '')),
      job = btrim(coalesce(p_job, '')),
      job_icon = p_job_icon,
      region = btrim(coalesce(p_region, '')),
      bio = btrim(coalesce(p_bio, '')),
      can_help_with = btrim(coalesce(p_can_help_with, '')),
      strengths = btrim(coalesce(p_strengths, '')),
      values_text = btrim(coalesce(p_values_text, '')),
      vision = btrim(coalesce(p_vision, '')),
      social_issue = btrim(coalesce(p_social_issue, '')),
      looking_for = btrim(coalesce(p_looking_for, '')),
      want_to_meet = btrim(coalesce(p_want_to_meet, ''))
  where user_id = v_user_id;

  update sakaba.guild_members
  set visible_groups = coalesce(p_visible_groups, '{}'),
      accept_intro = p_accept_intro,
      company_name = btrim(p_company_name),
      position = p_position,
      show_company = p_show_company,
      want_to_solve = btrim(coalesce(p_want_to_solve, '')),
      show_achievements = p_show_achievements
  where guild_id = v_guild_id and user_id = v_user_id;

  insert into sakaba.profile_contacts (user_id, email, line_url, website_url)
  values (
    v_user_id,
    btrim(coalesce(p_email, '')),
    btrim(coalesce(p_line_url, '')),
    btrim(coalesce(p_website_url, ''))
  )
  on conflict (user_id) do update
    set email = excluded.email,
        line_url = excluded.line_url,
        website_url = excluded.website_url;

  delete from sakaba.profile_tags pt where pt.user_id = v_user_id;

  if nullif(btrim(coalesce(p_industry, '')), '') is not null then
    insert into sakaba.tags (kind, name)
    values ('industry', btrim(p_industry))
    on conflict (kind, lower(name)) do update set is_active = true
    returning id into v_tag_id;

    insert into sakaba.profile_tags (user_id, tag_id) values (v_user_id, v_tag_id);
  end if;

  foreach v_keyword in array coalesce(p_keywords, '{}') loop
    if nullif(btrim(v_keyword), '') is not null then
      insert into sakaba.tags (kind, name)
      values ('keyword', btrim(v_keyword))
      on conflict (kind, lower(name)) do update set is_active = true
      returning id into v_tag_id;

      insert into sakaba.profile_tags (user_id, tag_id)
      values (v_user_id, v_tag_id)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

create or replace function public.sakaba_mark_seen(
  p_guild_slug text,
  p_list text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_list not in ('members', 'quests') then
    raise exception 'invalid list' using errcode = '22023';
  end if;

  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));

  if p_list = 'members' then
    update sakaba.guild_members
    set members_seen_at = now()
    where guild_id = v_guild_id and user_id = v_user_id and suspended_at is null;
  else
    update sakaba.guild_members
    set quests_seen_at = now()
    where guild_id = v_guild_id and user_id = v_user_id and suspended_at is null;
  end if;

  if not found then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
end;
$$;

-- --------------------------------------------------------------------------
-- Quest commands
-- --------------------------------------------------------------------------

create or replace function public.sakaba_create_quest(
  p_guild_slug text,
  p_title text,
  p_category text,
  p_summary text,
  p_body text,
  p_region text,
  p_deadline date,
  p_member_limit integer,
  p_is_urgent boolean default false,
  p_members_only boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null then
    raise exception 'title is required' using errcode = '22023';
  end if;
  if p_category not in ('work', 'consult', 'collab', 'info', 'gathering') then
    raise exception 'invalid category' using errcode = '22023';
  end if;
  if p_member_limit is not null and p_member_limit <= 0 then
    raise exception 'member_limit must be positive' using errcode = '22023';
  end if;
  if p_members_only and (p_category <> 'gathering' or not sakaba.is_guild_master(v_guild_id, v_user_id)) then
    raise exception 'only guild masters can create members-only gatherings' using errcode = '42501';
  end if;

  insert into sakaba.quests (
    guild_id, creator_id, title, category, summary, body, region,
    deadline, member_limit, is_urgent, members_only
  ) values (
    v_guild_id, v_user_id, btrim(p_title), p_category,
    btrim(coalesce(p_summary, '')), btrim(coalesce(p_body, '')),
    btrim(coalesce(p_region, '')), p_deadline, p_member_limit,
    p_is_urgent, p_members_only
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.sakaba_update_quest(
  p_quest_id uuid,
  p_title text,
  p_category text,
  p_summary text,
  p_body text,
  p_region text,
  p_deadline date,
  p_member_limit integer,
  p_is_urgent boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_before sakaba.quests%rowtype;
  v_changed text[] := '{}';
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select q.* into v_before from sakaba.quests q where q.id = p_quest_id for update;
  if not found then
    raise exception 'quest not found' using errcode = 'P0002';
  end if;
  if v_before.creator_id <> v_user_id then
    raise exception 'only the creator can update this quest' using errcode = '42501';
  end if;
  if v_before.status not in ('open', 'in_progress') then
    raise exception 'quest cannot be updated in its current status' using errcode = '22023';
  end if;
  if nullif(btrim(p_title), '') is null then
    raise exception 'title is required' using errcode = '22023';
  end if;
  if p_category not in ('work', 'consult', 'collab', 'info', 'gathering') then
    raise exception 'invalid category' using errcode = '22023';
  end if;
  if p_member_limit is not null and p_member_limit <= 0 then
    raise exception 'member_limit must be positive' using errcode = '22023';
  end if;
  if v_before.members_only and p_category <> 'gathering' then
    raise exception 'members-only quests must remain gatherings' using errcode = '22023';
  end if;

  if v_before.category is distinct from p_category then v_changed := array_append(v_changed, 'category'); end if;
  if v_before.title is distinct from btrim(p_title) then v_changed := array_append(v_changed, 'title'); end if;
  if v_before.summary is distinct from btrim(coalesce(p_summary, '')) then v_changed := array_append(v_changed, 'summary'); end if;
  if v_before.body is distinct from btrim(coalesce(p_body, '')) then v_changed := array_append(v_changed, 'body'); end if;
  if v_before.region is distinct from btrim(coalesce(p_region, '')) then v_changed := array_append(v_changed, 'region'); end if;
  if v_before.deadline is distinct from p_deadline then v_changed := array_append(v_changed, 'deadline'); end if;
  if v_before.member_limit is distinct from p_member_limit then v_changed := array_append(v_changed, 'member_limit'); end if;
  if v_before.is_urgent is distinct from p_is_urgent then v_changed := array_append(v_changed, 'is_urgent'); end if;

  update sakaba.quests
  set title = btrim(p_title),
      category = p_category,
      summary = btrim(coalesce(p_summary, '')),
      body = btrim(coalesce(p_body, '')),
      region = btrim(coalesce(p_region, '')),
      deadline = p_deadline,
      member_limit = p_member_limit,
      is_urgent = p_is_urgent
  where id = p_quest_id;

  if cardinality(v_changed) > 0 then
    insert into sakaba.notifications (
      guild_id, user_id, kind, actor_id, quest_id, changed_fields
    )
    select distinct
      v_before.guild_id, qa.user_id, 'quest_updated', v_user_id, p_quest_id, v_changed
    from sakaba.quest_applications qa
    where qa.quest_id = p_quest_id
      and qa.status = 'applied'
      and qa.user_id <> v_user_id;
  end if;
end;
$$;

create or replace function public.sakaba_withdraw_quest(p_quest_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select q.* into v_quest from sakaba.quests q where q.id = p_quest_id for update;
  if not found then raise exception 'quest not found' using errcode = 'P0002'; end if;
  if v_quest.creator_id <> v_user_id then
    raise exception 'only the creator can withdraw this quest' using errcode = '42501';
  end if;
  if v_quest.status = 'withdrawn' then return; end if;
  if v_quest.status = 'completed' then
    raise exception 'completed quest cannot be withdrawn' using errcode = '22023';
  end if;

  update sakaba.quests set status = 'withdrawn' where id = p_quest_id;

  update sakaba.intro_requests
  set status = 'cancelled'
  where quest_id = p_quest_id
    and status in ('requested', 'reviewing', 'proposed');

  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, quest_id)
  select distinct v_quest.guild_id, qa.user_id, 'quest_withdrawn', v_user_id, p_quest_id
  from sakaba.quest_applications qa
  where qa.quest_id = p_quest_id
    and qa.status = 'applied'
    and qa.user_id <> v_user_id;
end;
$$;

create or replace function public.sakaba_apply_to_quest(
  p_quest_id uuid,
  p_message text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_member sakaba.guild_members%rowtype;
  v_existing sakaba.quest_applications%rowtype;
  v_approved_at timestamptz;
  v_active_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) > 200 then
    raise exception 'message must be at most 200 characters' using errcode = '22023';
  end if;

  select q.* into v_quest from sakaba.quests q where q.id = p_quest_id for update;
  if not found then raise exception 'quest not found' using errcode = 'P0002'; end if;
  if v_quest.status <> 'open' then
    raise exception 'quest is not open' using errcode = '22023';
  end if;
  if v_quest.creator_id = v_user_id then
    raise exception 'creator cannot apply to own quest' using errcode = '22023';
  end if;

  select gm.* into v_member
  from sakaba.guild_members gm
  where gm.guild_id = v_quest.guild_id
    and gm.user_id = v_user_id
    and gm.suspended_at is null;
  if not found then raise exception 'guild membership required' using errcode = '42501'; end if;

  if v_quest.members_only and not sakaba.is_paid_member(v_user_id) then
    raise exception 'paid membership required' using errcode = '42501';
  end if;

  select qa.* into v_existing
  from sakaba.quest_applications qa
  where qa.quest_id = p_quest_id and qa.user_id = v_user_id;

  if found and v_existing.status = 'applied' then
    return jsonb_build_object(
      'status', case
        when v_quest.members_only and v_existing.approved_at is null then 'pending'
        else 'joined'
      end,
      'approved_at', v_existing.approved_at,
      'already_applied', true
    );
  end if;

  if v_quest.member_limit is not null then
    select count(*) into v_active_count
    from sakaba.quest_applications qa
    where qa.quest_id = p_quest_id and qa.status = 'applied';
    if v_active_count >= v_quest.member_limit then
      raise exception 'quest member limit reached' using errcode = '22023';
    end if;
  end if;

  if v_quest.members_only and v_member.gathering_approved_at is not null then
    v_approved_at := now();
  else
    v_approved_at := null;
  end if;

  insert into sakaba.quest_applications (
    quest_id, user_id, message, status, approved_at, approved_by, declined_at, declined_by
  ) values (
    p_quest_id, v_user_id, btrim(coalesce(p_message, '')), 'applied',
    v_approved_at, null, null, null
  )
  on conflict (quest_id, user_id) do update
    set message = excluded.message,
        status = 'applied',
        approved_at = excluded.approved_at,
        approved_by = null,
        declined_at = null,
        declined_by = null;

  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, quest_id)
  values (v_quest.guild_id, v_quest.creator_id, 'quest_applied', v_user_id, p_quest_id);

  return jsonb_build_object(
    'status', case when v_quest.members_only and v_approved_at is null then 'pending' else 'joined' end,
    'approved_at', v_approved_at,
    'already_applied', false
  );
end;
$$;

create or replace function public.sakaba_withdraw_application(p_quest_id uuid)
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
  update sakaba.quest_applications
  set status = 'withdrawn', approved_at = null, approved_by = null
  where quest_id = p_quest_id and user_id = v_user_id and status = 'applied';
  if not found then raise exception 'active application not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.sakaba_decide_gathering_application(
  p_quest_id uuid,
  p_user_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_actor_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_application sakaba.quest_applications%rowtype;
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_approve is null then
    raise exception 'approve decision is required' using errcode = '22023';
  end if;
  select q.* into v_quest from sakaba.quests q where q.id = p_quest_id;
  if not found or not v_quest.members_only then
    raise exception 'members-only gathering not found' using errcode = 'P0002';
  end if;
  if not sakaba.is_guild_master(v_quest.guild_id, v_actor_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;

  select qa.* into v_application
  from sakaba.quest_applications qa
  where qa.quest_id = p_quest_id
    and qa.user_id = p_user_id
    and qa.status = 'applied'
    and qa.approved_at is null
    and qa.declined_at is null
  for update;
  if not found then raise exception 'pending application not found' using errcode = 'P0002'; end if;

  if p_approve then
    update sakaba.quest_applications
    set approved_at = now(), approved_by = v_actor_id
    where quest_id = p_quest_id and user_id = p_user_id;

    update sakaba.guild_members
    set gathering_approved_at = coalesce(gathering_approved_at, now())
    where guild_id = v_quest.guild_id and user_id = p_user_id;
  else
    update sakaba.quest_applications
    set status = 'withdrawn', declined_at = now(), declined_by = v_actor_id
    where quest_id = p_quest_id and user_id = p_user_id;
  end if;

  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, quest_id)
  values (
    v_quest.guild_id,
    p_user_id,
    case when p_approve then 'gathering_approved' else 'gathering_declined' end,
    v_actor_id,
    p_quest_id
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Notification state
-- --------------------------------------------------------------------------

create or replace function public.sakaba_mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update sakaba.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = v_user_id;
  if not found then raise exception 'notification not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.sakaba_mark_all_notifications_read(p_guild_slug text default 'gia')
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_count integer;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  update sakaba.notifications
  set read_at = now()
  where guild_id = v_guild_id and user_id = v_user_id and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- --------------------------------------------------------------------------
-- Grants
-- --------------------------------------------------------------------------

revoke all on function public.sakaba_check_invite(text) from public;
revoke all on function public.sakaba_join_guild(text, text, text, text, boolean, text, boolean) from public;
revoke all on function public.sakaba_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text[], boolean, text, text, boolean, text, boolean, text, text, text, text, text[]) from public;
revoke all on function public.sakaba_mark_seen(text, text) from public;
revoke all on function public.sakaba_create_quest(text, text, text, text, text, text, date, integer, boolean, boolean) from public;
revoke all on function public.sakaba_update_quest(uuid, text, text, text, text, text, date, integer, boolean) from public;
revoke all on function public.sakaba_withdraw_quest(uuid) from public;
revoke all on function public.sakaba_apply_to_quest(uuid, text) from public;
revoke all on function public.sakaba_withdraw_application(uuid) from public;
revoke all on function public.sakaba_decide_gathering_application(uuid, uuid, boolean) from public;
revoke all on function public.sakaba_mark_notification_read(uuid) from public;
revoke all on function public.sakaba_mark_all_notifications_read(text) from public;

grant execute on function public.sakaba_check_invite(text) to anon, authenticated;
grant execute on function public.sakaba_join_guild(text, text, text, text, boolean, text, boolean) to authenticated;
grant execute on function public.sakaba_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text[], boolean, text, text, boolean, text, boolean, text, text, text, text, text[]) to authenticated;
grant execute on function public.sakaba_mark_seen(text, text) to authenticated;
grant execute on function public.sakaba_create_quest(text, text, text, text, text, text, date, integer, boolean, boolean) to authenticated;
grant execute on function public.sakaba_update_quest(uuid, text, text, text, text, text, date, integer, boolean) to authenticated;
grant execute on function public.sakaba_withdraw_quest(uuid) to authenticated;
grant execute on function public.sakaba_apply_to_quest(uuid, text) to authenticated;
grant execute on function public.sakaba_withdraw_application(uuid) to authenticated;
grant execute on function public.sakaba_decide_gathering_application(uuid, uuid, boolean) to authenticated;
grant execute on function public.sakaba_mark_notification_read(uuid) to authenticated;
grant execute on function public.sakaba_mark_all_notifications_read(text) to authenticated;

notify pgrst, 'reload schema';
