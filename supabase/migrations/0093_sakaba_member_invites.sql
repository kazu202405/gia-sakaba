-- A member may keep one reusable personal invitation link. The invite ID on
-- each membership preserves the chain even when that link is rotated.

alter table sakaba.invites
  add column kind text not null default 'single'
  constraint invites_kind_check check (kind in ('single', 'member'));

create unique index invites_active_member_link_uidx
  on sakaba.invites (guild_id, created_by)
  where kind = 'member' and revoked_at is null;

create or replace function public.sakaba_get_my_member_invite(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_link jsonb;
  v_people jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'active guild membership required' using errcode = '42501';
  end if;

  select jsonb_build_object('id', i.id, 'code', i.code, 'created_at', i.created_at)
  into v_link from sakaba.invites i
  where i.guild_id = v_guild_id and i.created_by = v_user_id
    and i.kind = 'member' and i.revoked_at is null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', gm.user_id,
    'display_name', p.display_name,
    'joined_at', gm.joined_at,
    'suspended', gm.suspended_at is not null
  ) order by gm.joined_at desc), '[]'::jsonb)
  into v_people
  from sakaba.guild_members gm
  join sakaba.invites i on i.id = gm.invite_id
  join sakaba.profiles p on p.user_id = gm.user_id
  where gm.guild_id = v_guild_id and i.created_by = v_user_id and i.kind = 'member';

  return jsonb_build_object('link', v_link, 'people', v_people);
end;
$$;

create or replace function public.sakaba_create_my_member_invite(
  p_guild_slug text default 'gia',
  p_rotate boolean default false
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_link sakaba.invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null then
    raise exception 'active guild membership required' using errcode = '42501';
  end if;

  -- Serialize concurrent clicks by locking this member's row.
  perform 1 from sakaba.guild_members gm
  where gm.guild_id = v_guild_id and gm.user_id = v_user_id and gm.suspended_at is null
  for update;
  if not found then
    raise exception 'active guild membership required' using errcode = '42501';
  end if;

  select i.* into v_link from sakaba.invites i
  where i.guild_id = v_guild_id and i.created_by = v_user_id
    and i.kind = 'member' and i.revoked_at is null;
  if found and not coalesce(p_rotate, false) then
    return jsonb_build_object('id', v_link.id, 'code', v_link.code);
  end if;
  if v_link.id is not null then
    update sakaba.invites set revoked_at = now() where id = v_link.id;
  end if;

  insert into sakaba.invites (guild_id, code, created_by, kind, max_uses)
  values (v_guild_id, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), v_user_id, 'member', 2147483647)
  returning * into v_link;
  return jsonb_build_object('id', v_link.id, 'code', v_link.code);
end;
$$;

-- The master can see the full invitation lineage, not just one link at a time.
create or replace function public.sakaba_list_invite_network(p_guild_slug text default 'gia')
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
    'user_id', gm.user_id,
    'display_name', p.display_name,
    'joined_at', gm.joined_at,
    'role', gm.role,
    'suspended', gm.suspended_at is not null,
    'invited_by_user_id', i.created_by,
    'invited_by_name', inviter.display_name
  ) order by gm.joined_at, gm.user_id), '[]'::jsonb)
  into v_result
  from sakaba.guild_members gm
  join sakaba.profiles p on p.user_id = gm.user_id
  left join sakaba.invites i on i.id = gm.invite_id
  left join sakaba.profiles inviter on inviter.user_id = i.created_by
  where gm.guild_id = v_guild_id;
  return v_result;
end;
$$;

-- A suspended or removed member must not keep inviting others.
create or replace function sakaba.revoke_member_invites_on_exit()
returns trigger language plpgsql security definer
set search_path = pg_catalog, sakaba as $$
begin
  if tg_op = 'DELETE' then
    update sakaba.invites set revoked_at = now()
    where guild_id = old.guild_id and created_by = old.user_id
      and kind = 'member' and revoked_at is null;
    return old;
  end if;
  if new.suspended_at is not null and old.suspended_at is null then
    update sakaba.invites set revoked_at = now()
    where guild_id = new.guild_id and created_by = new.user_id
      and kind = 'member' and revoked_at is null;
  end if;
  return new;
end;
$$;

create trigger revoke_member_invites_on_exit
after update of suspended_at or delete on sakaba.guild_members
for each row execute function sakaba.revoke_member_invites_on_exit();

revoke all on function public.sakaba_get_my_member_invite(text) from public;
revoke all on function public.sakaba_create_my_member_invite(text, boolean) from public;
revoke all on function public.sakaba_list_invite_network(text) from public;
revoke all on function sakaba.revoke_member_invites_on_exit() from public;
grant execute on function public.sakaba_get_my_member_invite(text) to authenticated;
grant execute on function public.sakaba_create_my_member_invite(text, boolean) to authenticated;
grant execute on function public.sakaba_list_invite_network(text) to authenticated;
notify pgrst, 'reload schema';
