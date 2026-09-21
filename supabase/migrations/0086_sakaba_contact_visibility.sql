-- Each contact method can be shared with guild members or kept for an
-- accepted introduction. Previously saved email and LINE remain private.
alter table sakaba.profile_contacts
  add column email_visibility text not null default 'approved',
  add column line_visibility text not null default 'approved';

alter table sakaba.profile_contacts
  add constraint profile_contacts_email_visibility_check
    check (email_visibility in ('members', 'approved')),
  add constraint profile_contacts_line_visibility_check
    check (line_visibility in ('members', 'approved'));

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
    'email', case
      when pc.email_visibility = 'members'
        and pc.email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        then pc.email else '' end,
    'line_url', case
      when pc.line_visibility = 'members' and pc.line_url ~* '^https?://'
        then pc.line_url else '' end,
    'website_url', case
      when pc.website_visibility = 'members' and pc.website_url ~* '^https?://'
        then pc.website_url else '' end,
    'email_visibility', case
      when p.user_id = v_user_id then coalesce(pc.email_visibility, 'approved') else null end,
    'line_visibility', case
      when p.user_id = v_user_id then coalesce(pc.line_visibility, 'approved') else null end,
    'website_visibility', case
      when p.user_id = v_user_id then coalesce(pc.website_visibility, 'approved') else null end
  )), '[]'::jsonb) into v_result
  from sakaba.guild_members gm
  join sakaba.profiles p on p.user_id = gm.user_id
  left join sakaba.profile_contacts pc on pc.user_id = p.user_id
  where gm.guild_id = v_guild_id and gm.suspended_at is null;
  return v_result;
end;
$$;

create or replace function public.sakaba_update_contact_visibility(
  p_guild_slug text,
  p_kind text,
  p_visibility text,
  p_value text default null
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_value text := btrim(coalesce(p_value, ''));
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('email', 'line', 'website')
    or p_visibility is null or p_visibility not in ('members', 'approved') then
    raise exception 'invalid contact visibility' using errcode = '22023';
  end if;
  if p_value is not null then
    if p_kind = 'email' and v_value <> '' and v_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'invalid email address' using errcode = '22023';
    end if;
    if p_kind in ('line', 'website') and v_value <> '' and v_value !~* '^https?://' then
      raise exception 'invalid contact URL' using errcode = '22023';
    end if;
  end if;

  insert into sakaba.profile_contacts as pc
    (user_id, email, line_url, website_url, email_visibility, line_visibility, website_visibility)
  values (
    v_user_id,
    case when p_kind = 'email' then v_value else '' end,
    case when p_kind = 'line' then v_value else '' end,
    case when p_kind = 'website' then v_value else '' end,
    case when p_kind = 'email' then p_visibility else 'approved' end,
    case when p_kind = 'line' then p_visibility else 'approved' end,
    case when p_kind = 'website' then p_visibility else 'approved' end
  )
  on conflict (user_id) do update set
    email_visibility = case when p_kind = 'email' then p_visibility else pc.email_visibility end,
    line_visibility = case when p_kind = 'line' then p_visibility else pc.line_visibility end,
    website_visibility = case when p_kind = 'website' then p_visibility else pc.website_visibility end,
    email = case when p_kind = 'email' and p_value is not null then v_value else pc.email end,
    line_url = case when p_kind = 'line' and p_value is not null then v_value else pc.line_url end,
    website_url = case when p_kind = 'website' and p_value is not null then v_value else pc.website_url end;
end;
$$;

revoke all on function public.sakaba_update_contact_visibility(text, text, text, text) from public;
grant execute on function public.sakaba_update_contact_visibility(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
