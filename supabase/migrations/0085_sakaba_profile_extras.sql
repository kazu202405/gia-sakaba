-- Optional name reading and per-member website visibility.
-- Existing websites remain private until their owner explicitly opts in.
alter table sakaba.profiles
  add column if not exists name_kana varchar(60) not null default '';

alter table sakaba.profile_contacts
  add column if not exists website_visibility text not null default 'approved';

alter table sakaba.profile_contacts
  add constraint profile_contacts_website_visibility_check
  check (website_visibility in ('members', 'approved'));

create or replace function public.sakaba_get_profile_extras(p_guild_slug text default 'gia')
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.user_id,
    'name_kana', p.name_kana,
    'website_url', case
      when pc.website_visibility = 'members' and pc.website_url ~* '^https?://'
        then pc.website_url else '' end,
    'website_visibility', case
      when p.user_id = v_user_id then coalesce(pc.website_visibility, 'approved')
      else null end
  )), '[]'::jsonb) into v_result
  from sakaba.guild_members gm
  join sakaba.profiles p on p.user_id = gm.user_id
  left join sakaba.profile_contacts pc on pc.user_id = p.user_id
  where gm.guild_id = v_guild_id and gm.suspended_at is null;

  return v_result;
end;
$$;

create or replace function public.sakaba_update_profile_extras(
  p_guild_slug text,
  p_name_kana text default null,
  p_website_visibility text default null,
  p_website_url text default null
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_name_kana text := btrim(coalesce(p_name_kana, ''));
  v_website_url text := btrim(coalesce(p_website_url, ''));
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if char_length(v_name_kana) > 60 then
    raise exception 'name reading is too long' using errcode = '22001';
  end if;
  if p_website_visibility is not null and p_website_visibility not in ('members', 'approved') then
    raise exception 'invalid website visibility' using errcode = '22023';
  end if;
  if p_website_url is not null and v_website_url <> '' and v_website_url !~* '^https?://' then
    raise exception 'invalid website URL' using errcode = '22023';
  end if;

  if p_name_kana is not null then
    update sakaba.profiles set name_kana = v_name_kana where user_id = v_user_id;
  end if;
  if p_website_visibility is not null or p_website_url is not null then
    insert into sakaba.profile_contacts as pc (user_id, website_visibility, website_url)
    values (v_user_id, coalesce(p_website_visibility, 'approved'), v_website_url)
    on conflict (user_id) do update set
      website_visibility = coalesce(p_website_visibility, pc.website_visibility),
      website_url = coalesce(p_website_url, pc.website_url);
  end if;
end;
$$;

revoke all on function public.sakaba_get_profile_extras(text) from public;
revoke all on function public.sakaba_update_profile_extras(text, text, text, text) from public;
grant execute on function public.sakaba_get_profile_extras(text) to authenticated;
grant execute on function public.sakaba_update_profile_extras(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
