-- Optional personal details shown only to active members of the same guild.
-- The birth year may be omitted while keeping the month and day.
alter table sakaba.profiles
  add column if not exists hometown varchar(80) not null default '',
  add column if not exists hobbies varchar(300) not null default '',
  add column if not exists life_story varchar(1200) not null default '',
  add column if not exists birth_month smallint,
  add column if not exists birth_day smallint,
  add column if not exists birth_year smallint;

alter table sakaba.profiles
  add constraint profiles_birthday_parts_check check (
    case
      when birth_month is null then birth_day is null and birth_year is null
      when birth_day is null then false
      when birth_month not between 1 and 12 then false
      when birth_day not between 1 and 31 then false
      when birth_year is not null and birth_year not between 1900 and 2100 then false
      else birth_day <= extract(day from (
        make_date(coalesce(birth_year, 2000), birth_month, 1) + interval '1 month - 1 day'
      ))
    end
  );

-- Keep the existing contact-visibility behavior while adding the new fields.
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
    'hometown', p.hometown,
    'hobbies', p.hobbies,
    'life_story', p.life_story,
    'birth_month', p.birth_month,
    'birth_day', p.birth_day,
    'birth_year', p.birth_year,
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

create or replace function public.sakaba_update_personal_profile(
  p_guild_slug text,
  p_hometown text,
  p_hobbies text,
  p_life_story text,
  p_birth_month smallint,
  p_birth_day smallint,
  p_birth_year smallint
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_hometown text := btrim(coalesce(p_hometown, ''));
  v_hobbies text := btrim(coalesce(p_hobbies, ''));
  v_life_story text := btrim(coalesce(p_life_story, ''));
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if char_length(v_hometown) > 80 or char_length(v_hobbies) > 300
    or char_length(v_life_story) > 1200 then
    raise exception 'personal profile text is too long' using errcode = '22001';
  end if;
  if (p_birth_month is null and (p_birth_day is not null or p_birth_year is not null))
    or (p_birth_month is not null and p_birth_day is null)
    or (p_birth_year is not null and (p_birth_year < 1900 or p_birth_year > extract(year from current_date)))
    or (p_birth_month is not null and (p_birth_month < 1 or p_birth_month > 12))
    or (p_birth_day is not null and (p_birth_day < 1 or p_birth_day > 31)) then
    raise exception 'invalid birthday' using errcode = '22023';
  end if;
  if p_birth_month is not null and p_birth_day > extract(day from (
    make_date(coalesce(p_birth_year, 2000), p_birth_month, 1) + interval '1 month - 1 day'
  )) then
    raise exception 'invalid birthday' using errcode = '22023';
  end if;

  update sakaba.profiles set
    hometown = v_hometown,
    hobbies = v_hobbies,
    life_story = v_life_story,
    birth_month = p_birth_month,
    birth_day = p_birth_day,
    birth_year = p_birth_year
  where user_id = v_user_id;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.sakaba_update_personal_profile(text, text, text, text, smallint, smallint, smallint) from public;
grant execute on function public.sakaba_update_personal_profile(text, text, text, text, smallint, smallint, smallint) to authenticated;

notify pgrst, 'reload schema';
