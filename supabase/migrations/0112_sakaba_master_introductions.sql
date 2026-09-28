-- Private introductions arranged by a guild administrator.
-- This flow is deliberately separate from guild membership invitations and
-- member-to-member connection requests. At least one participant must be an
-- active guild member. Contact details are returned only after both people
-- explicitly accept.

create extension if not exists pgcrypto with schema extensions;

create table sakaba.master_introductions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  reason varchar(400) not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'connected', 'declined', 'cancelled')),
  outcome text check (outcome is null or outcome in ('met', 'working', 'no_fit')),
  expires_at timestamptz not null default now() + interval '14 days',
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_introductions_reason_not_blank check (btrim(reason) <> ''),
  constraint master_introductions_outcome_after_connection
    check (outcome is null or status = 'connected')
);

create table sakaba.master_introduction_participants (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references sakaba.master_introductions(id) on delete cascade,
  side text not null check (side in ('a', 'b')),
  member_user_id uuid references sakaba.profiles(user_id) on delete restrict,
  respondent_user_id uuid references auth.users(id) on delete restrict,
  draft_name varchar(30) not null,
  draft_company varchar(60) not null default '',
  anonymous_intro varchar(400) not null,
  response_status text not null default 'pending'
    check (response_status in ('pending', 'accepted', 'declined')),
  approved_name varchar(30) not null default '',
  approved_company varchar(60) not null default '',
  contact_kind text check (contact_kind is null or contact_kind in ('email', 'line', 'website', 'via_admin')),
  contact_value varchar(300) not null default '',
  consent_version text,
  viewed_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (introduction_id, side),
  constraint master_intro_participant_name_not_blank check (btrim(draft_name) <> ''),
  constraint master_intro_participant_preview_not_blank check (btrim(anonymous_intro) <> '')
);

create unique index master_intro_distinct_member_idx
  on sakaba.master_introduction_participants (introduction_id, member_user_id)
  where member_user_id is not null;
create index master_intro_participant_respondent_idx
  on sakaba.master_introduction_participants (respondent_user_id, updated_at desc)
  where respondent_user_id is not null;

create table sakaba.master_introduction_tokens (
  participant_id uuid primary key references sakaba.master_introduction_participants(id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table sakaba.master_introduction_events (
  id bigint generated always as identity primary key,
  introduction_id uuid not null references sakaba.master_introductions(id) on delete cascade,
  participant_id uuid references sakaba.master_introduction_participants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'created', 'viewed', 'accepted', 'declined', 'connected', 'cancelled', 'link_rotated', 'outcome_set'
  )),
  created_at timestamptz not null default now()
);
create index master_intro_events_intro_idx
  on sakaba.master_introduction_events (introduction_id, created_at);

alter table sakaba.master_introductions enable row level security;
alter table sakaba.master_introduction_participants enable row level security;
alter table sakaba.master_introduction_tokens enable row level security;
alter table sakaba.master_introduction_events enable row level security;
revoke all on table sakaba.master_introductions from public, anon, authenticated;
revoke all on table sakaba.master_introduction_participants from public, anon, authenticated;
revoke all on table sakaba.master_introduction_tokens from public, anon, authenticated;
revoke all on table sakaba.master_introduction_events from public, anon, authenticated;

create or replace function public.sakaba_create_master_introduction(
  p_guild_slug text,
  p_reason text,
  p_a_member_id uuid,
  p_a_name text,
  p_a_company text,
  p_a_preview text,
  p_b_member_id uuid,
  p_b_name text,
  p_b_company text,
  p_b_preview text
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba, extensions as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_intro_id uuid;
  v_a_id uuid;
  v_b_id uuid;
  v_a_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_b_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if p_a_member_id is null and p_b_member_id is null then
    raise exception 'at least one participant must be a member' using errcode = '22023';
  end if;
  if p_a_member_id is not null and p_a_member_id = p_b_member_id then
    raise exception 'participants must be different' using errcode = '22023';
  end if;
  if (p_a_member_id is not null and not sakaba.is_active_member(v_guild_id, p_a_member_id))
    or (p_b_member_id is not null and not sakaba.is_active_member(v_guild_id, p_b_member_id)) then
    raise exception 'active member required' using errcode = '22023';
  end if;
  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) > 400
    or nullif(btrim(p_a_name), '') is null or char_length(btrim(p_a_name)) > 30
    or nullif(btrim(p_b_name), '') is null or char_length(btrim(p_b_name)) > 30
    or char_length(btrim(coalesce(p_a_company, ''))) > 60
    or char_length(btrim(coalesce(p_b_company, ''))) > 60
    or nullif(btrim(p_a_preview), '') is null or char_length(btrim(p_a_preview)) > 400
    or nullif(btrim(p_b_preview), '') is null or char_length(btrim(p_b_preview)) > 400 then
    raise exception 'invalid introduction details' using errcode = '22023';
  end if;

  insert into sakaba.master_introductions (guild_id, created_by, reason)
  values (v_guild_id, v_user_id, btrim(p_reason)) returning id into v_intro_id;

  insert into sakaba.master_introduction_participants
    (introduction_id, side, member_user_id, respondent_user_id, draft_name, draft_company, anonymous_intro)
  values
    (v_intro_id, 'a', p_a_member_id, p_a_member_id, btrim(p_a_name), btrim(coalesce(p_a_company, '')), btrim(p_a_preview))
  returning id into v_a_id;
  insert into sakaba.master_introduction_participants
    (introduction_id, side, member_user_id, respondent_user_id, draft_name, draft_company, anonymous_intro)
  values
    (v_intro_id, 'b', p_b_member_id, p_b_member_id, btrim(p_b_name), btrim(coalesce(p_b_company, '')), btrim(p_b_preview))
  returning id into v_b_id;

  insert into sakaba.master_introduction_tokens (participant_id, token_hash)
  values
    (v_a_id, extensions.digest(v_a_token, 'sha256')),
    (v_b_id, extensions.digest(v_b_token, 'sha256'));
  insert into sakaba.master_introduction_events (introduction_id, actor_user_id, event_type)
  values (v_intro_id, v_user_id, 'created');

  return jsonb_build_object(
    'id', v_intro_id,
    'a', jsonb_build_object('participant_id', v_a_id, 'token', v_a_token),
    'b', jsonb_build_object('participant_id', v_b_id, 'token', v_b_token)
  );
end;
$$;

create or replace function public.sakaba_list_master_introductions(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'reason', i.reason,
    'status', case when i.status = 'waiting' and i.expires_at < now() then 'expired' else i.status end,
    'outcome', i.outcome,
    'expires_at', i.expires_at,
    'connected_at', i.connected_at,
    'created_at', i.created_at,
    'participants', (
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'side', p.side,
        'member_user_id', p.member_user_id,
        'name', p.draft_name,
        'company', p.draft_company,
        'response_status', p.response_status,
        'viewed_at', p.viewed_at,
        'responded_at', p.responded_at
      ) order by p.side)
      from sakaba.master_introduction_participants p where p.introduction_id = i.id
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type', e.event_type, 'participant_id', e.participant_id, 'created_at', e.created_at
      ) order by e.created_at), '[]'::jsonb)
      from sakaba.master_introduction_events e where e.introduction_id = i.id
    )
  ) order by i.created_at desc), '[]'::jsonb) into v_result
  from sakaba.master_introductions i where i.guild_id = v_guild_id;
  return v_result;
end;
$$;

create or replace function public.sakaba_rotate_master_introduction_link(p_participant_id uuid)
returns text language plpgsql security definer
set search_path = pg_catalog, public, sakaba, extensions as $$
declare
  v_user_id uuid := auth.uid();
  v_intro sakaba.master_introductions%rowtype;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select i.* into v_intro
  from sakaba.master_introduction_participants p
  join sakaba.master_introductions i on i.id = p.introduction_id
  where p.id = p_participant_id for update of i;
  if not found or v_user_id is null or not sakaba.is_guild_master(v_intro.guild_id, v_user_id) then
    raise exception 'introduction not found' using errcode = '42501';
  end if;
  if v_intro.status in ('declined', 'cancelled') then
    raise exception 'introduction is closed' using errcode = '22023';
  end if;
  update sakaba.master_introduction_tokens set revoked_at = now()
  where participant_id = p_participant_id and revoked_at is null;
  insert into sakaba.master_introduction_tokens (participant_id, token_hash, revoked_at)
  values (p_participant_id, extensions.digest(v_token, 'sha256'), null)
  on conflict (participant_id) do update
    set token_hash = excluded.token_hash, created_at = now(), revoked_at = null;
  insert into sakaba.master_introduction_events
    (introduction_id, participant_id, actor_user_id, event_type)
  values (v_intro.id, p_participant_id, v_user_id, 'link_rotated');
  return v_token;
end;
$$;

create or replace function public.sakaba_cancel_master_introduction(p_introduction_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_intro sakaba.master_introductions%rowtype;
begin
  select * into v_intro from sakaba.master_introductions
  where id = p_introduction_id for update;
  if not found or v_user_id is null or not sakaba.is_guild_master(v_intro.guild_id, v_user_id) then
    raise exception 'introduction not found' using errcode = '42501';
  end if;
  if v_intro.status <> 'waiting' then
    raise exception 'only a waiting introduction can be cancelled' using errcode = '22023';
  end if;
  update sakaba.master_introductions set status = 'cancelled', updated_at = now()
  where id = p_introduction_id;
  insert into sakaba.master_introduction_events (introduction_id, actor_user_id, event_type)
  values (p_introduction_id, v_user_id, 'cancelled');
end;
$$;

create or replace function public.sakaba_set_master_introduction_outcome(
  p_introduction_id uuid,
  p_outcome text
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_intro sakaba.master_introductions%rowtype;
begin
  if p_outcome not in ('met', 'working', 'no_fit') then
    raise exception 'invalid outcome' using errcode = '22023';
  end if;
  select * into v_intro from sakaba.master_introductions
  where id = p_introduction_id for update;
  if not found or v_user_id is null or not sakaba.is_guild_master(v_intro.guild_id, v_user_id) then
    raise exception 'introduction not found' using errcode = '42501';
  end if;
  if v_intro.status <> 'connected' then
    raise exception 'introduction is not connected' using errcode = '22023';
  end if;
  update sakaba.master_introductions set outcome = p_outcome, updated_at = now()
  where id = p_introduction_id;
  insert into sakaba.master_introduction_events (introduction_id, actor_user_id, event_type)
  values (p_introduction_id, v_user_id, 'outcome_set');
end;
$$;

create or replace function public.sakaba_get_master_introduction(p_token text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba, extensions as $$
declare
  v_user_id uuid := auth.uid();
  v_participant sakaba.master_introduction_participants%rowtype;
  v_other sakaba.master_introduction_participants%rowtype;
  v_intro sakaba.master_introductions%rowtype;
  v_admin_name text;
  v_identity_ok boolean;
  v_status text;
begin
  if p_token is null or p_token !~ '^[0-9a-fA-F]{64}$' then return null; end if;
  select p.* into v_participant
  from sakaba.master_introduction_tokens t
  join sakaba.master_introduction_participants p on p.id = t.participant_id
  where t.token_hash = extensions.digest(lower(p_token), 'sha256') and t.revoked_at is null;
  if not found then return null; end if;
  select * into v_intro from sakaba.master_introductions
  where id = v_participant.introduction_id;

  select * into v_other from sakaba.master_introduction_participants
  where introduction_id = v_intro.id and id <> v_participant.id;
  select coalesce(p.display_name, '管理者') into v_admin_name
  from sakaba.profiles p where p.user_id = v_intro.created_by;
  v_identity_ok := v_user_id is not null and (
    (v_participant.member_user_id is not null and v_participant.member_user_id = v_user_id)
    or (v_participant.member_user_id is null and (v_participant.respondent_user_id is null or v_participant.respondent_user_id = v_user_id))
  );
  v_status := case
    when v_intro.status in ('waiting', 'connected') and v_intro.expires_at < now() then 'expired'
    else v_intro.status
  end;

  if v_participant.viewed_at is null then
    update sakaba.master_introduction_participants set viewed_at = now(), updated_at = now()
    where id = v_participant.id;
    insert into sakaba.master_introduction_events
      (introduction_id, participant_id, actor_user_id, event_type)
    values (v_intro.id, v_participant.id, v_user_id, 'viewed');
  end if;

  return jsonb_build_object(
    'status', v_status,
    'administrator_name', v_admin_name,
    'reason', v_intro.reason,
    'expires_at', v_intro.expires_at,
    'recipient_name', v_participant.draft_name,
    'recipient_company', v_participant.draft_company,
    'counterpart_preview', v_other.anonymous_intro,
    'requires_member_account', v_participant.member_user_id is not null,
    'identity_ok', v_identity_ok,
    'response_status', v_participant.response_status,
    'approved_name', case when v_identity_ok then v_participant.approved_name else '' end,
    'approved_company', case when v_identity_ok then v_participant.approved_company else '' end,
    'contact_kind', case when v_identity_ok then v_participant.contact_kind else null end,
    'contact_value', case when v_identity_ok then v_participant.contact_value else '' end,
    'counterpart', case when v_status = 'connected' and v_identity_ok then jsonb_build_object(
      'name', v_other.approved_name,
      'company', v_other.approved_company,
      'contact_kind', v_other.contact_kind,
      'contact_value', v_other.contact_value
    ) else null end
  );
end;
$$;

create or replace function public.sakaba_respond_master_introduction(
  p_token text,
  p_accept boolean,
  p_name text default '',
  p_company text default '',
  p_contact_kind text default null,
  p_contact_value text default '',
  p_agreed boolean default false
)
returns text language plpgsql security definer
set search_path = pg_catalog, public, sakaba, extensions as $$
declare
  v_user_id uuid := auth.uid();
  v_participant sakaba.master_introduction_participants%rowtype;
  v_intro sakaba.master_introductions%rowtype;
  v_contact text := btrim(coalesce(p_contact_value, ''));
  v_both boolean;
begin
  if v_user_id is null or not exists (
    select 1 from auth.users u where u.id = v_user_id and u.email_confirmed_at is not null
  ) then raise exception 'verified email required' using errcode = '42501'; end if;
  if p_token is null or p_token !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'introduction not found' using errcode = '42501';
  end if;
  select p.* into v_participant
  from sakaba.master_introduction_tokens t
  join sakaba.master_introduction_participants p on p.id = t.participant_id
  where t.token_hash = extensions.digest(lower(p_token), 'sha256') and t.revoked_at is null
  for update of p;
  if not found then
    raise exception 'introduction is closed' using errcode = '42501';
  end if;
  select * into v_intro from sakaba.master_introductions
  where id = v_participant.introduction_id
  for update;
  if not found or v_intro.status <> 'waiting' or v_intro.expires_at < now()
    or v_participant.response_status <> 'pending' then
    raise exception 'introduction is closed' using errcode = '42501';
  end if;
  if (v_participant.member_user_id is not null and v_participant.member_user_id <> v_user_id)
    or (v_participant.respondent_user_id is not null and v_participant.respondent_user_id <> v_user_id) then
    raise exception 'different account required' using errcode = '42501';
  end if;

  if not coalesce(p_accept, false) then
    update sakaba.master_introduction_participants
    set respondent_user_id = coalesce(respondent_user_id, v_user_id), response_status = 'declined',
        responded_at = now(), updated_at = now()
    where id = v_participant.id;
    update sakaba.master_introductions set status = 'declined', updated_at = now()
    where id = v_intro.id;
    insert into sakaba.master_introduction_events
      (introduction_id, participant_id, actor_user_id, event_type)
    values (v_intro.id, v_participant.id, v_user_id, 'declined');
    return 'declined';
  end if;

  if not coalesce(p_agreed, false)
    or nullif(btrim(p_name), '') is null or char_length(btrim(p_name)) > 30
    or char_length(btrim(coalesce(p_company, ''))) > 60
    or p_contact_kind is null or p_contact_kind not in ('email', 'line', 'website', 'via_admin') then
    raise exception 'invalid consent details' using errcode = '22023';
  end if;
  if p_contact_kind = 'email' and v_contact !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid email address' using errcode = '22023';
  end if;
  if p_contact_kind in ('line', 'website') and v_contact !~* '^https?://' then
    raise exception 'invalid contact URL' using errcode = '22023';
  end if;
  if p_contact_kind = 'via_admin' then v_contact := ''; end if;

  update sakaba.master_introduction_participants
  set respondent_user_id = coalesce(respondent_user_id, v_user_id),
      response_status = 'accepted', approved_name = btrim(p_name),
      approved_company = btrim(coalesce(p_company, '')),
      contact_kind = p_contact_kind, contact_value = v_contact,
      consent_version = '2026-09-28-v1', responded_at = now(), updated_at = now()
  where id = v_participant.id;
  insert into sakaba.master_introduction_events
    (introduction_id, participant_id, actor_user_id, event_type)
  values (v_intro.id, v_participant.id, v_user_id, 'accepted');

  select count(*) = 2 into v_both
  from sakaba.master_introduction_participants p
  where p.introduction_id = v_intro.id and p.response_status = 'accepted';
  if v_both then
    update sakaba.master_introductions
    set status = 'connected', connected_at = now(), expires_at = now() + interval '90 days', updated_at = now()
    where id = v_intro.id;
    insert into sakaba.master_introduction_events
      (introduction_id, actor_user_id, event_type)
    values (v_intro.id, v_user_id, 'connected');
    return 'connected';
  end if;
  return 'waiting';
end;
$$;

revoke all on function public.sakaba_create_master_introduction(text, text, uuid, text, text, text, uuid, text, text, text) from public;
revoke all on function public.sakaba_list_master_introductions(text) from public;
revoke all on function public.sakaba_rotate_master_introduction_link(uuid) from public;
revoke all on function public.sakaba_cancel_master_introduction(uuid) from public;
revoke all on function public.sakaba_set_master_introduction_outcome(uuid, text) from public;
revoke all on function public.sakaba_get_master_introduction(text) from public;
revoke all on function public.sakaba_respond_master_introduction(text, boolean, text, text, text, text, boolean) from public;

grant execute on function public.sakaba_create_master_introduction(text, text, uuid, text, text, text, uuid, text, text, text) to authenticated;
grant execute on function public.sakaba_list_master_introductions(text) to authenticated;
grant execute on function public.sakaba_rotate_master_introduction_link(uuid) to authenticated;
grant execute on function public.sakaba_cancel_master_introduction(uuid) to authenticated;
grant execute on function public.sakaba_set_master_introduction_outcome(uuid, text) to authenticated;
grant execute on function public.sakaba_get_master_introduction(text) to anon, authenticated;
grant execute on function public.sakaba_respond_master_introduction(text, boolean, text, text, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';
