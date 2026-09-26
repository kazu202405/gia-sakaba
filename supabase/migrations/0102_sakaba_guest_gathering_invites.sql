-- Unlisted invitations for free gatherings. A verified email identifies a
-- repeat guest, but a guest is not a guild member until they opt in separately.
-- URLs are capabilities: only deliberately shared, event-specific summaries
-- and opt-in introductions are returned to anonymous readers.

alter table sakaba.quests
  add column guest_invite_unlisted boolean not null default false;

-- New free gatherings are invitation-only from their first transaction.
-- Existing gatherings are not silently changed by this migration.

create table sakaba.quest_guest_links (
  quest_id uuid primary key references sakaba.quests(id) on delete cascade,
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  invite_id uuid not null references sakaba.invites(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function sakaba.set_free_gathering_unlisted()
returns trigger language plpgsql security definer
set search_path = pg_catalog, sakaba as $$
begin
  if tg_op = 'UPDATE' then
    if exists (
      select 1 from sakaba.quest_guest_links l where l.quest_id = old.id
    ) and (new.category <> 'gathering' or new.members_only) then
      raise exception 'invited gathering cannot change category or audience' using errcode = '22023';
    end if;
  end if;
  new.guest_invite_unlisted := new.category = 'gathering' and not new.members_only;
  return new;
end;
$$;
create trigger quests_free_gathering_unlisted
before insert or update on sakaba.quests
for each row execute function sakaba.set_free_gathering_unlisted();
revoke all on function sakaba.set_free_gathering_unlisted() from public, anon, authenticated;

create or replace function sakaba.revoke_guest_invite_on_link_delete()
returns trigger language plpgsql security definer
set search_path = pg_catalog, sakaba as $$
begin
  update sakaba.invites set revoked_at = now()
  where id = old.invite_id and revoked_at is null;
  return old;
end;
$$;
create trigger quest_guest_links_revoke_invite
after delete on sakaba.quest_guest_links
for each row execute function sakaba.revoke_guest_invite_on_link_delete();
revoke all on function sakaba.revoke_guest_invite_on_link_delete() from public, anon, authenticated;

create table sakaba.guest_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name varchar(30) not null check (btrim(display_name) <> ''),
  introduction varchar(240) not null default '',
  updated_at timestamptz not null default now()
);

create table sakaba.quest_guest_applications (
  quest_id uuid not null references sakaba.quest_guest_links(quest_id) on delete cascade,
  user_id uuid not null references sakaba.guest_profiles(user_id) on delete cascade,
  status text not null default 'applied' check (status in ('applied', 'withdrawn')),
  display_name varchar(30) not null check (btrim(display_name) <> ''),
  introduction varchar(240) not null default '',
  show_introduction boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (quest_id, user_id)
);
create index quest_guest_applications_user_idx on sakaba.quest_guest_applications(user_id, created_at desc);

-- Existing member applications and new guest applications share one capacity.
-- The old member RPC counts only quest_applications, so guard its write too.
create or replace function sakaba.check_guest_gathering_capacity()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.status <> 'applied' or not exists (
    select 1 from sakaba.quest_guest_links l where l.quest_id = new.quest_id
  ) then return new; end if;
  select q.member_limit into v_limit from sakaba.quests q where q.id = new.quest_id;
  if v_limit is null then return new; end if;
  select count(distinct user_id) into v_count from (
    select qa.user_id from sakaba.quest_applications qa
    where qa.quest_id = new.quest_id and qa.status = 'applied' and qa.user_id <> new.user_id
    union all
    select ga.user_id from sakaba.quest_guest_applications ga
    where ga.quest_id = new.quest_id and ga.status = 'applied' and ga.user_id <> new.user_id
  ) attendees;
  if v_count >= v_limit then
    raise exception 'quest member limit reached' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger quest_applications_guest_capacity
before insert or update of status on sakaba.quest_applications
for each row execute function sakaba.check_guest_gathering_capacity();
revoke all on function sakaba.check_guest_gathering_capacity() from public, anon, authenticated;

alter table sakaba.quest_guest_links enable row level security;
alter table sakaba.guest_profiles enable row level security;
alter table sakaba.quest_guest_applications enable row level security;

-- Only the quest's creator may publish or rotate its invitation. A new invite
-- for guild membership is tied to this gathering for referral attribution.
create or replace function public.sakaba_publish_guest_gathering(p_quest_id uuid, p_rotate boolean default false)
returns text language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_link sakaba.quest_guest_links%rowtype;
  v_invite_id uuid;
  v_token text;
begin
  select * into v_quest from sakaba.quests where id = p_quest_id for update;
  if not found or v_user_id is null or v_quest.creator_id <> v_user_id
     or not sakaba.is_active_member(v_quest.guild_id, v_user_id)
     or v_quest.category <> 'gathering' or v_quest.members_only or v_quest.status <> 'open' then
    raise exception 'free gathering not available' using errcode = '42501';
  end if;

  -- An older free gathering becomes unlisted if its host starts sharing this
  -- guest invitation; other existing gatherings remain untouched.
  update sakaba.quests set guest_invite_unlisted = true where id = p_quest_id;

  select * into v_link from sakaba.quest_guest_links where quest_id = p_quest_id for update;
  if found then
    if coalesce(p_rotate, false) then
      update sakaba.quest_guest_links
      set token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
          updated_at = now()
      where quest_id = p_quest_id returning * into v_link;
    end if;
    return v_link.token;
  end if;

  insert into sakaba.invites (guild_id, code, created_by, max_uses)
  values (v_quest.guild_id,
          replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
          v_user_id, 2147483647)
  returning id into v_invite_id;

  insert into sakaba.quest_guest_links (quest_id, invite_id)
  values (p_quest_id, v_invite_id)
  returning token into v_token;
  return v_token;
end;
$$;

-- Public response intentionally has no auth email, guild profile, contact URL,
-- or non-consenting attendee. Never make sakaba tables directly readable to anon.
create or replace function public.sakaba_get_guest_gathering(p_token text)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_result jsonb;
begin
  select q.* into v_quest
  from sakaba.quest_guest_links l join sakaba.quests q on q.id = l.quest_id
  where l.token = p_token and q.status <> 'withdrawn' and not q.members_only
    and sakaba.is_active_member(q.guild_id, q.creator_id);
  if not found then return null; end if;

  select jsonb_build_object(
    'quest_id', v_quest.id,
    'title', v_quest.title,
    'summary', v_quest.summary,
    'body', v_quest.body,
    'region', v_quest.region,
    'deadline', v_quest.deadline,
    'member_limit', v_quest.member_limit,
    'status', v_quest.status,
    'host_name', coalesce(host.display_name, '主催者'),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', ga.display_name, 'introduction', ga.introduction
      ) order by ga.created_at)
      from sakaba.quest_guest_applications ga
      where ga.quest_id = v_quest.id and ga.status = 'applied' and ga.show_introduction
    ), '[]'::jsonb),
    'my_profile', (
      select jsonb_build_object('name', gp.display_name, 'introduction', gp.introduction)
      from sakaba.guest_profiles gp where gp.user_id = v_user_id
    ),
    'my_application', (
      select jsonb_build_object('status', ga.status, 'show_introduction', ga.show_introduction)
      from sakaba.quest_guest_applications ga
      where ga.quest_id = v_quest.id and ga.user_id = v_user_id
    ),
    'is_member', sakaba.is_active_member(v_quest.guild_id, v_user_id)
  ) into v_result
  from sakaba.profiles host where host.user_id = v_quest.creator_id;
  return v_result;
end;
$$;

-- Supabase email OTP/magic link creates an Auth identity for a guest. That is
-- not guild membership; the latter requires a separate, explicit action.
create or replace function public.sakaba_apply_guest_gathering(
  p_token text, p_display_name text, p_introduction text, p_show_introduction boolean
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_count integer;
  v_already boolean;
begin
  if v_user_id is null or not exists (
    select 1 from auth.users u where u.id = v_user_id and u.email_confirmed_at is not null
  ) then
    raise exception 'verified email required' using errcode = '42501';
  end if;
  if nullif(btrim(p_display_name), '') is null or char_length(btrim(p_display_name)) > 30
     or char_length(btrim(coalesce(p_introduction, ''))) > 240 then
    raise exception 'invalid guest profile' using errcode = '22023';
  end if;

  select q.* into v_quest
  from sakaba.quest_guest_links l join sakaba.quests q on q.id = l.quest_id
  where l.token = p_token and q.category = 'gathering' and not q.members_only
  for update of q;
  if not found or v_quest.status <> 'open'
     or not sakaba.is_active_member(v_quest.guild_id, v_quest.creator_id)
     or (v_quest.deadline is not null and v_quest.deadline < (now() at time zone 'Asia/Tokyo')::date) then
    raise exception 'gathering is closed' using errcode = '22023';
  end if;

  select exists (
    select 1 from sakaba.quest_guest_applications ga
    where ga.quest_id = v_quest.id and ga.user_id = v_user_id and ga.status = 'applied'
  ) or exists (
    select 1 from sakaba.quest_applications qa
    where qa.quest_id = v_quest.id and qa.user_id = v_user_id and qa.status = 'applied'
  ) into v_already;

  if v_quest.member_limit is not null and not v_already then
    select count(distinct user_id) into v_count from (
      select ga.user_id from sakaba.quest_guest_applications ga
      where ga.quest_id = v_quest.id and ga.status = 'applied'
      union all
      select qa.user_id from sakaba.quest_applications qa
      where qa.quest_id = v_quest.id and qa.status = 'applied'
    ) attendees;
    if v_count >= v_quest.member_limit then
      raise exception 'gathering is full' using errcode = '22023';
    end if;
  end if;

  insert into sakaba.guest_profiles (user_id, display_name, introduction)
  values (v_user_id, btrim(p_display_name), btrim(coalesce(p_introduction, '')))
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        introduction = excluded.introduction,
        updated_at = now();

  insert into sakaba.quest_guest_applications (quest_id, user_id, status, display_name, introduction, show_introduction)
  values (v_quest.id, v_user_id, 'applied', btrim(p_display_name), btrim(coalesce(p_introduction, '')), coalesce(p_show_introduction, false))
  on conflict (quest_id, user_id) do update
    set status = 'applied', display_name = excluded.display_name, introduction = excluded.introduction,
        show_introduction = excluded.show_introduction, updated_at = now();
end;
$$;

create or replace function public.sakaba_withdraw_guest_gathering(p_token text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
begin
  update sakaba.quest_guest_applications ga set status = 'withdrawn', updated_at = now()
  from sakaba.quest_guest_links l
  where l.token = p_token and l.quest_id = ga.quest_id and ga.user_id = auth.uid();
  if not found then raise exception 'application not found' using errcode = '42501'; end if;
end;
$$;

create or replace function public.sakaba_get_guest_gathering_host(p_quest_id uuid)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_quest sakaba.quests%rowtype;
  v_result jsonb;
begin
  select * into v_quest from sakaba.quests where id = p_quest_id;
  if not found or v_quest.creator_id <> auth.uid()
     or not sakaba.is_active_member(v_quest.guild_id, auth.uid())
     or v_quest.category <> 'gathering' or v_quest.members_only then
    raise exception 'creator access required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'token', l.token,
    'guests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', ga.display_name, 'email', u.email,
        'introduction', ga.introduction, 'show_introduction', ga.show_introduction,
        'created_at', ga.created_at
      ) order by ga.created_at)
      from sakaba.quest_guest_applications ga
      join auth.users u on u.id = ga.user_id
      where ga.quest_id = p_quest_id and ga.status = 'applied'
    ), '[]'::jsonb)
  ) into v_result
  from sakaba.quest_guest_links l where l.quest_id = p_quest_id;
  return coalesce(v_result, jsonb_build_object('token', null, 'guests', '[]'::jsonb));
end;
$$;

-- One-tap conversion uses the already verified guest identity and saved name.
-- Required guild fields not collected at a social event are kept private and
-- can be completed later on the status page; no guest is auto-enrolled.
create or replace function public.sakaba_join_from_guest_gathering(p_token text, p_agreed boolean)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_link sakaba.quest_guest_links%rowtype;
  v_profile sakaba.guest_profiles%rowtype;
  v_invite sakaba.invites%rowtype;
begin
  if not coalesce(p_agreed, false) then
    raise exception 'guild promises must be accepted' using errcode = '22023';
  end if;
  if v_user_id is null or not exists (
    select 1 from auth.users u where u.id = v_user_id and u.email_confirmed_at is not null
  ) then
    raise exception 'verified email required' using errcode = '42501';
  end if;
  select l.* into v_link
  from sakaba.quest_guest_links l join sakaba.quests q on q.id = l.quest_id
  where l.token = p_token and q.status <> 'withdrawn'
    and sakaba.is_active_member(q.guild_id, q.creator_id);
  if not found or not exists (
    select 1 from sakaba.quest_guest_applications ga
    where ga.quest_id = v_link.quest_id and ga.user_id = v_user_id and ga.status = 'applied'
  ) then
    raise exception 'guest application required' using errcode = '42501';
  end if;
  select * into v_profile from sakaba.guest_profiles where user_id = v_user_id;
  select * into v_invite from sakaba.invites where id = v_link.invite_id;
  if v_invite.revoked_at is not null or v_invite.expires_at < now() then
    raise exception 'invite unavailable' using errcode = '42501';
  end if;
  return public.sakaba_join_guild(v_invite.code, v_profile.display_name, '未登録', 'other', false, '', true);
end;
$$;

-- The normal quest board must never reveal free invitation-only gatherings to
-- non-host members. Hosts still see their own quest to manage the link.
create or replace function public.sakaba_list_quests(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_is_paid boolean;
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
  v_is_paid := sakaba.is_paid_member(v_user_id);
  v_is_master := sakaba.is_guild_master(v_guild_id, v_user_id);

  select coalesce(jsonb_agg(quest_json order by is_urgent desc, created_at desc), '[]'::jsonb)
  into v_result
  from (
    select q.is_urgent, q.created_at,
      jsonb_build_object(
        'id', q.id,
        'creator_id', q.creator_id,
        'title', q.title,
        'category', q.category,
        'summary', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.summary else '' end,
        'body', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.body else '' end,
        'region', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.region else '' end,
        'deadline', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.deadline else null end,
        'member_limit', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.member_limit else null end,
        'is_urgent', q.is_urgent,
        'members_only', q.members_only,
        'status', q.status,
        'created_at', q.created_at,
        'applicant_count', (
          select count(distinct user_id) from (
            select qa.user_id from sakaba.quest_applications qa
            where qa.quest_id = q.id and qa.status = 'applied'
            union all
            select ga.user_id from sakaba.quest_guest_applications ga
            where ga.quest_id = q.id and ga.status = 'applied'
          ) applicants
        ),
        'my_application', (
          select jsonb_build_object(
            'quest_id', qa.quest_id,
            'user_id', qa.user_id,
            'message', qa.message,
            'status', qa.status,
            'approved_at', qa.approved_at,
            'created_at', qa.created_at
          )
          from sakaba.quest_applications qa
          where qa.quest_id = q.id and qa.user_id = v_user_id
        )
      ) as quest_json
    from sakaba.quests q
    where q.guild_id = v_guild_id
      and (not q.guest_invite_unlisted or q.creator_id = v_user_id)
      and (q.status <> 'withdrawn' or q.creator_id = v_user_id or v_is_master)
  ) quests;
  return v_result;
end;
$$;

revoke all on function public.sakaba_publish_guest_gathering(uuid, boolean) from public, anon;
revoke all on function public.sakaba_get_guest_gathering(text) from public;
revoke all on function public.sakaba_apply_guest_gathering(text, text, text, boolean) from public, anon;
revoke all on function public.sakaba_withdraw_guest_gathering(text) from public, anon;
revoke all on function public.sakaba_get_guest_gathering_host(uuid) from public, anon;
revoke all on function public.sakaba_join_from_guest_gathering(text, boolean) from public, anon;
grant execute on function public.sakaba_publish_guest_gathering(uuid, boolean) to authenticated;
grant execute on function public.sakaba_get_guest_gathering(text) to anon, authenticated;
grant execute on function public.sakaba_apply_guest_gathering(text, text, text, boolean) to authenticated;
grant execute on function public.sakaba_withdraw_guest_gathering(text) to authenticated;
grant execute on function public.sakaba_get_guest_gathering_host(uuid) to authenticated;
grant execute on function public.sakaba_join_from_guest_gathering(text, boolean) to authenticated;

notify pgrst, 'reload schema';
