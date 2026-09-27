-- A guild master can prepare a one-person invitation without creating an
-- account or a public profile for the recipient. The recipient reviews every
-- prefilled field and explicitly opts in before the introduction is published.

create table sakaba.prepared_invites (
  invite_id uuid primary key references sakaba.invites(id) on delete cascade,
  display_name varchar(30) not null,
  company_name varchar(60) not null default '',
  position text not null default '',
  introduction varchar(400) not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prepared_invites_name_check check (btrim(display_name) <> ''),
  constraint prepared_invites_position_check check (position in ('', 'ceo', 'officer', 'decider', 'other'))
);

alter table sakaba.prepared_invites enable row level security;
revoke all on table sakaba.prepared_invites from public, anon, authenticated;

create or replace function public.sakaba_create_prepared_invite(
  p_guild_slug text,
  p_display_name text,
  p_company_name text default '',
  p_position text default '',
  p_introduction text default ''
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_invite sakaba.invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  if nullif(btrim(p_display_name), '') is null or char_length(btrim(p_display_name)) > 30
    or char_length(btrim(coalesce(p_company_name, ''))) > 60
    or coalesce(p_position, '') not in ('', 'ceo', 'officer', 'decider', 'other')
    or char_length(btrim(coalesce(p_introduction, ''))) > 400 then
    raise exception 'invalid prepared invite' using errcode = '22023';
  end if;

  insert into sakaba.invites (guild_id, code, created_by, kind, max_uses, expires_at)
  values (v_guild_id, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
    v_user_id, 'single', 1, now() + interval '30 days')
  returning * into v_invite;

  insert into sakaba.prepared_invites (invite_id, display_name, company_name, position, introduction)
  values (v_invite.id, btrim(p_display_name), btrim(coalesce(p_company_name, '')),
    coalesce(p_position, ''), btrim(coalesce(p_introduction, '')));

  return jsonb_build_object('id', v_invite.id, 'code', v_invite.code);
end;
$$;

create or replace function public.sakaba_update_prepared_invite(
  p_invite_id uuid,
  p_display_name text,
  p_company_name text default '',
  p_position text default '',
  p_introduction text default ''
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
  select i.guild_id into v_guild_id from sakaba.invites i
  where i.id = p_invite_id and i.revoked_at is null and i.used_count = 0
    and (i.expires_at is null or i.expires_at >= now())
  for update;
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'active prepared invite and guild master required' using errcode = '42501';
  end if;
  if nullif(btrim(p_display_name), '') is null or char_length(btrim(p_display_name)) > 30
    or char_length(btrim(coalesce(p_company_name, ''))) > 60
    or coalesce(p_position, '') not in ('', 'ceo', 'officer', 'decider', 'other')
    or char_length(btrim(coalesce(p_introduction, ''))) > 400 then
    raise exception 'invalid prepared invite' using errcode = '22023';
  end if;
  update sakaba.prepared_invites set display_name = btrim(p_display_name),
    company_name = btrim(coalesce(p_company_name, '')),
    position = coalesce(p_position, ''),
    introduction = btrim(coalesce(p_introduction, '')),
    updated_at = now()
  where invite_id = p_invite_id;
  if not found then raise exception 'prepared invite not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.sakaba_list_prepared_invites(p_guild_slug text default 'gia')
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
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'code', i.code, 'created_at', i.created_at,
    'expires_at', i.expires_at, 'revoked_at', i.revoked_at, 'used_count', i.used_count,
    'display_name', p.display_name, 'company_name', p.company_name,
    'position', p.position, 'introduction', p.introduction
  ) order by i.created_at desc), '[]'::jsonb)
  into v_result
  from sakaba.prepared_invites p
  join sakaba.invites i on i.id = p.invite_id
  where i.guild_id = v_guild_id;
  return v_result;
end;
$$;

-- The long, unguessable invitation code is the sole capability to read this
-- draft. It is not searchable or visible on the public member directory.
create or replace function public.sakaba_get_prepared_invite(p_code text)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_result jsonb;
begin
  if nullif(btrim(coalesce(p_code, '')), '') is null then return null; end if;
  select jsonb_build_object(
    'display_name', p.display_name, 'company_name', p.company_name,
    'position', p.position, 'introduction', p.introduction
  ) into v_result
  from sakaba.invites i
  join sakaba.prepared_invites p on p.invite_id = i.id
  join sakaba.guilds g on g.id = i.guild_id
  where lower(i.code) = lower(btrim(p_code)) and g.slug = 'gia'
    and i.revoked_at is null and (i.expires_at is null or i.expires_at >= now())
    and i.used_count < i.max_uses;
  return v_result;
end;
$$;

create or replace function public.sakaba_join_prepared_guild(
  p_code text,
  p_display_name text,
  p_company_name text,
  p_position text,
  p_show_company boolean,
  p_want_to_solve text,
  p_agreed boolean,
  p_accept_introduction boolean default false
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_invite_id uuid;
  v_guild_id uuid;
  v_author_id uuid;
  v_introduction text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select i.id, i.guild_id, i.created_by, p.introduction
  into v_invite_id, v_guild_id, v_author_id, v_introduction
  from sakaba.invites i
  join sakaba.prepared_invites p on p.invite_id = i.id
  where lower(i.code) = lower(btrim(p_code));
  if v_invite_id is null then
    raise exception 'prepared invite not found' using errcode = 'P0002';
  end if;

  -- The existing join function validates consent, membership and invite use
  -- under a row lock. This wrapper and the introduction share one transaction.
  v_result := public.sakaba_join_guild(p_code, p_display_name, p_company_name,
    p_position, p_show_company, p_want_to_solve, p_agreed);
  if coalesce(p_accept_introduction, false)
    and coalesce((v_result->>'joined')::boolean, false)
    and nullif(btrim(v_introduction), '') is not null
    and v_author_id <> auth.uid()
    and sakaba.is_active_member(v_guild_id, v_author_id) then
    insert into sakaba.member_introductions (guild_id, author_id, target_id, body)
    values (v_guild_id, v_author_id, auth.uid(), v_introduction);
  end if;
  return v_result;
end;
$$;

revoke all on function public.sakaba_create_prepared_invite(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.sakaba_update_prepared_invite(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.sakaba_list_prepared_invites(text) from public, anon, authenticated;
revoke all on function public.sakaba_get_prepared_invite(text) from public, anon, authenticated;
revoke all on function public.sakaba_join_prepared_guild(text, text, text, text, boolean, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.sakaba_create_prepared_invite(text, text, text, text, text) to authenticated;
grant execute on function public.sakaba_update_prepared_invite(uuid, text, text, text, text) to authenticated;
grant execute on function public.sakaba_list_prepared_invites(text) to authenticated;
grant execute on function public.sakaba_get_prepared_invite(text) to anon, authenticated;
grant execute on function public.sakaba_join_prepared_guild(text, text, text, text, boolean, text, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
