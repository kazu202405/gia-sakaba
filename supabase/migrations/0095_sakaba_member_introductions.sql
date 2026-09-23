-- Member-written introductions, inspired by the old mixi introduction area.
-- Existing profile prose is losslessly consolidated into three lighter fields.

update sakaba.profiles
set bio = concat_ws(E'\n\n',
      nullif(btrim(bio), ''),
      case when nullif(btrim(can_help_with), '') is not null then 'できること：' || btrim(can_help_with) end,
      case when nullif(btrim(strengths), '') is not null then 'あなたならではの強み：' || btrim(strengths) end
    ),
    can_help_with = '',
    strengths = '',
    values_text = concat_ws(E'\n\n',
      nullif(btrim(values_text), ''),
      case when nullif(btrim(vision), '') is not null then 'これからしようとしていること：' || btrim(vision) end,
      case when nullif(btrim(social_issue), '') is not null then '取り組んでいる社会課題：' || btrim(social_issue) end
    ),
    vision = '',
    social_issue = '',
    looking_for = concat_ws(E'\n\n',
      nullif(btrim(looking_for), ''),
      case when nullif(btrim(want_to_meet), '') is not null then '出会いたい人：' || btrim(want_to_meet) end
    ),
    want_to_meet = '';

create or replace function public.sakaba_update_my_profile_simple(
  p_guild_slug text,
  p_display_name text,
  p_photo_url text,
  p_headline text,
  p_job text,
  p_job_icon text,
  p_region text,
  p_bio text,
  p_values_text text,
  p_looking_for text,
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
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_tag_id uuid;
  v_keyword text;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if nullif(btrim(p_display_name), '') is null or char_length(btrim(p_display_name)) > 30 then
    raise exception 'display_name must be 1 to 30 characters' using errcode = '22023';
  end if;
  if nullif(btrim(p_company_name), '') is null or char_length(btrim(p_company_name)) > 60 then
    raise exception 'company_name must be 1 to 60 characters' using errcode = '22023';
  end if;
  if p_position not in ('ceo', 'officer', 'decider', 'other') then raise exception 'invalid position' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_want_to_solve, ''))) > 60 then raise exception 'want_to_solve must be at most 60 characters' using errcode = '22023'; end if;
  if p_job_icon not in ('web', 'tax', 'build', 'food', 'marketing', 'realestate', 'legal', 'design', 'teach', 'health', 'owner', 'retail', 'maker', 'beauty', 'finance', 'logistics', 'care', 'hr', 'farm', 'other') then
    raise exception 'invalid job_icon' using errcode = '22023';
  end if;
  if not coalesce(p_visible_groups, '{}') <@ array['work', 'values', 'connect']::text[] then raise exception 'invalid visible_groups' using errcode = '22023'; end if;

  update sakaba.profiles set
    display_name = btrim(p_display_name), photo_url = nullif(btrim(coalesce(p_photo_url, '')), ''),
    headline = btrim(coalesce(p_headline, '')), job = btrim(coalesce(p_job, '')), job_icon = p_job_icon,
    region = btrim(coalesce(p_region, '')), bio = btrim(coalesce(p_bio, '')),
    can_help_with = '', strengths = '', values_text = btrim(coalesce(p_values_text, '')),
    vision = '', social_issue = '', looking_for = btrim(coalesce(p_looking_for, '')), want_to_meet = ''
  where user_id = v_user_id;

  update sakaba.guild_members set
    visible_groups = coalesce(p_visible_groups, '{}'), accept_intro = p_accept_intro,
    company_name = btrim(p_company_name), position = p_position, show_company = p_show_company,
    want_to_solve = btrim(coalesce(p_want_to_solve, '')), show_achievements = p_show_achievements
  where guild_id = v_guild_id and user_id = v_user_id;

  insert into sakaba.profile_contacts (user_id, email, line_url, website_url)
  values (v_user_id, btrim(coalesce(p_email, '')), btrim(coalesce(p_line_url, '')), btrim(coalesce(p_website_url, '')))
  on conflict (user_id) do update set email = excluded.email, line_url = excluded.line_url, website_url = excluded.website_url;

  delete from sakaba.profile_tags pt where pt.user_id = v_user_id;
  if nullif(btrim(coalesce(p_industry, '')), '') is not null then
    insert into sakaba.tags (kind, name) values ('industry', btrim(p_industry))
    on conflict (kind, lower(name)) do update set is_active = true returning id into v_tag_id;
    insert into sakaba.profile_tags (user_id, tag_id) values (v_user_id, v_tag_id);
  end if;
  foreach v_keyword in array coalesce(p_keywords, '{}') loop
    if nullif(btrim(v_keyword), '') is not null then
      insert into sakaba.tags (kind, name) values ('keyword', btrim(v_keyword))
      on conflict (kind, lower(name)) do update set is_active = true returning id into v_tag_id;
      insert into sakaba.profile_tags (user_id, tag_id) values (v_user_id, v_tag_id) on conflict do nothing;
    end if;
  end loop;
end;
$$;

create table sakaba.member_introductions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  author_id uuid not null,
  target_id uuid not null,
  body varchar(400) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_introductions_author_fk foreign key (guild_id, author_id)
    references sakaba.guild_members(guild_id, user_id) on delete cascade,
  constraint member_introductions_target_fk foreign key (guild_id, target_id)
    references sakaba.guild_members(guild_id, user_id) on delete cascade,
  constraint member_introductions_not_self check (author_id <> target_id),
  constraint member_introductions_body_not_blank check (btrim(body) <> ''),
  constraint member_introductions_one_per_pair unique (guild_id, author_id, target_id)
);

create index member_introductions_target_idx
  on sakaba.member_introductions (guild_id, target_id, updated_at desc);
alter table sakaba.member_introductions enable row level security;
revoke all on table sakaba.member_introductions from anon, authenticated;

create or replace function public.sakaba_list_member_introductions(
  p_guild_slug text default 'gia', p_target_id uuid default null
)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_target_id uuid := coalesce(p_target_id, auth.uid());
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id)
    or not sakaba.is_active_member(v_guild_id, v_target_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', mi.id,
    'author_id', mi.author_id,
    'author_name', p.display_name,
    'body', mi.body,
    'created_at', mi.created_at,
    'updated_at', mi.updated_at,
    'can_edit', mi.author_id = v_user_id,
    'can_delete', v_user_id in (mi.author_id, mi.target_id)
  ) order by mi.updated_at desc), '[]'::jsonb)
  into v_result
  from sakaba.member_introductions mi
  join sakaba.profiles p on p.user_id = mi.author_id
  where mi.guild_id = v_guild_id and mi.target_id = v_target_id;
  return v_result;
end;
$$;

create or replace function public.sakaba_save_member_introduction(
  p_guild_slug text, p_target_id uuid, p_body text
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id)
    or not sakaba.is_active_member(v_guild_id, p_target_id) or p_target_id = v_user_id then
    raise exception 'active guild members required' using errcode = '42501';
  end if;
  if nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 400 then
    raise exception 'introduction must be 1 to 400 characters' using errcode = '22023';
  end if;

  insert into sakaba.member_introductions (guild_id, author_id, target_id, body)
  values (v_guild_id, v_user_id, p_target_id, btrim(p_body))
  on conflict (guild_id, author_id, target_id) do update
    set body = excluded.body, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.sakaba_delete_member_introduction(p_introduction_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_item sakaba.member_introductions%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_item from sakaba.member_introductions where id = p_introduction_id;
  if not found or not sakaba.is_active_member(v_item.guild_id, v_user_id)
    or v_user_id not in (v_item.author_id, v_item.target_id) then
    raise exception 'introduction not found' using errcode = '42501';
  end if;
  delete from sakaba.member_introductions where id = p_introduction_id;
end;
$$;

revoke all on function public.sakaba_list_member_introductions(text, uuid) from public;
revoke all on function public.sakaba_save_member_introduction(text, uuid, text) from public;
revoke all on function public.sakaba_delete_member_introduction(uuid) from public;
grant execute on function public.sakaba_list_member_introductions(text, uuid) to authenticated;
grant execute on function public.sakaba_save_member_introduction(text, uuid, text) to authenticated;
grant execute on function public.sakaba_delete_member_introduction(uuid) to authenticated;
revoke all on function public.sakaba_update_my_profile_simple(text, text, text, text, text, text, text, text, text, text, text[], boolean, text, text, boolean, text, boolean, text, text, text, text, text[]) from public;
grant execute on function public.sakaba_update_my_profile_simple(text, text, text, text, text, text, text, text, text, text, text[], boolean, text, text, boolean, text, boolean, text, text, text, text, text[]) to authenticated;
notify pgrst, 'reload schema';
