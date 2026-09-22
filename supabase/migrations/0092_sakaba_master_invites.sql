-- Guild-master invite management. Links are single-use and expire in 30 days.
-- Only active owners/masters may list, issue, or revoke an invitation.

create or replace function public.sakaba_list_master_invites(p_guild_slug text default 'gia')
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
    'id', i.id,
    'code', i.code,
    'created_at', i.created_at,
    'expires_at', i.expires_at,
    'revoked_at', i.revoked_at,
    'used_count', i.used_count,
    'max_uses', i.max_uses,
    'created_by_name', coalesce(creator.display_name, ''),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', gm.user_id,
        'display_name', p.display_name,
        'joined_at', gm.joined_at,
        'suspended', gm.suspended_at is not null
      ) order by gm.joined_at)
      from sakaba.guild_members gm
      join sakaba.profiles p on p.user_id = gm.user_id
      where gm.invite_id = i.id and gm.guild_id = v_guild_id
    ), '[]'::jsonb)
  ) order by i.created_at desc), '[]'::jsonb)
  into v_result
  from sakaba.invites i
  left join sakaba.profiles creator on creator.user_id = i.created_by
  where i.guild_id = v_guild_id;
  return v_result;
end;
$$;

create or replace function public.sakaba_create_master_invite(p_guild_slug text default 'gia')
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

  insert into sakaba.invites (guild_id, code, created_by, max_uses, expires_at)
  values (v_guild_id, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), v_user_id, 1, now() + interval '30 days')
  returning * into v_invite;
  return jsonb_build_object('id', v_invite.id, 'code', v_invite.code);
end;
$$;

create or replace function public.sakaba_revoke_master_invite(p_invite_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select i.guild_id into v_guild_id from sakaba.invites i where i.id = p_invite_id;
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  update sakaba.invites set revoked_at = now()
  where id = p_invite_id and revoked_at is null and used_count < max_uses;
end;
$$;

revoke all on function public.sakaba_list_master_invites(text) from public;
revoke all on function public.sakaba_create_master_invite(text) from public;
revoke all on function public.sakaba_revoke_master_invite(uuid) from public;
grant execute on function public.sakaba_list_master_invites(text) to authenticated;
grant execute on function public.sakaba_create_master_invite(text) to authenticated;
grant execute on function public.sakaba_revoke_master_invite(uuid) to authenticated;
notify pgrst, 'reload schema';
