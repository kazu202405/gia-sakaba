-- 共有URLの公開ページ（/p/[token]）を、URLの持ち主の店の見た目・言葉で出すため、
-- sakaba_get_shared_profile の返り値に店の slug（guild_slug）を足す。ほかは 0135 のまま。
-- 共有URLは店ごとに1本（0134）なので、token から店が1つに決まる。
-- 引数は変えない（create or replace のため、0131 の権限 anon, authenticated はそのまま残る）。

begin;

create or replace function public.sakaba_get_shared_profile(p_token text, p_guild_slug text default null)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_share sakaba.profile_shares;
  v_guild_id uuid;
  v_guild_slug text;
  v_member sakaba.guild_members;
  v_profile sakaba.guild_profiles;
  v_industry text;
  v_keywords jsonb;
  v_intros jsonb := '[]'::jsonb;
  v_card jsonb := null;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into v_share from sakaba.profile_shares where token = p_token and enabled;
  if not found then return null; end if;
  v_guild_id := v_share.guild_id;
  select g.slug into v_guild_slug from sakaba.guilds g where g.id = v_guild_id;
  if nullif(btrim(coalesce(p_guild_slug, '')), '') is not null and not exists (
    select 1 from sakaba.guilds g where g.id = v_guild_id and lower(g.slug) = lower(btrim(p_guild_slug))
  ) then
    return null;
  end if;
  select * into v_member from sakaba.guild_members gm
  where gm.guild_id = v_guild_id and gm.user_id = v_share.user_id and gm.suspended_at is null;
  if not found then return null; end if;
  select * into v_profile from sakaba.guild_profiles p where p.guild_id = v_guild_id and p.user_id = v_share.user_id;
  if not found then return null; end if;

  v_industry := sakaba.profile_industry(v_guild_id, v_share.user_id);

  if v_share.show_profile then
    v_keywords := sakaba.profile_keywords(v_guild_id, v_share.user_id);
  end if;

  if v_share.show_card and v_profile.business_card_agreed_at is not null
     and (v_profile.business_card_front is not null or v_profile.business_card_back is not null) then
    v_card := jsonb_build_object('front', v_profile.business_card_front, 'back', v_profile.business_card_back);
  end if;

  if v_share.show_intros then
    select coalesce(jsonb_agg(jsonb_build_object(
      'body', x.body,
      'created_at', x.created_at,
      'author_name', case when v_share.show_intro_authors then x.author_name else null end
    ) order by x.updated_at desc), '[]'::jsonb) into v_intros
    from (
      select mi.body, mi.created_at, mi.updated_at, ap.display_name as author_name
      from sakaba.member_introductions mi
      join sakaba.guild_profiles ap on ap.guild_id = mi.guild_id and ap.user_id = mi.author_id
      join sakaba.guild_members agm on agm.guild_id = mi.guild_id and agm.user_id = mi.author_id and agm.suspended_at is null
      where mi.guild_id = v_guild_id and mi.target_id = v_share.user_id
      order by mi.updated_at desc
      limit 20
    ) x;
  end if;

  return jsonb_build_object(
    'guild_slug', v_guild_slug,
    'display_name', v_profile.display_name,
    'photo_url', v_profile.photo_url,
    'headline', sakaba.if_field(v_guild_id, 'headline', v_profile.headline),
    'job', sakaba.if_field(v_guild_id, 'job', v_profile.job),
    'job_icon', v_profile.job_icon,
    'region', sakaba.if_field(v_guild_id, 'region', v_profile.region),
    'industry', v_industry,
    'work_areas', case when v_share.show_profile and sakaba.guild_has_field(v_guild_id, 'work_areas') then to_jsonb(v_profile.work_areas) else null end,
    'work_types', case when v_share.show_profile and sakaba.guild_has_field(v_guild_id, 'work_types') then to_jsonb(v_profile.work_types) else null end,
    'has_construction_license', case when v_share.show_profile and sakaba.guild_has_field(v_guild_id, 'licenses') then v_profile.has_construction_license else null end,
    'has_real_estate_license', case when v_share.show_profile and sakaba.guild_has_field(v_guild_id, 'licenses') then v_profile.has_real_estate_license else null end,
    'company_name', case when v_member.show_company then v_member.company_name else null end,
    'position', case when v_member.show_company then v_member.position else null end,
    'bio', case when v_share.show_profile then sakaba.if_field(v_guild_id, 'bio', v_profile.bio) else null end,
    'values_text', case when v_share.show_profile then sakaba.if_field(v_guild_id, 'values_text', v_profile.values_text) else null end,
    'looking_for', case when v_share.show_profile then sakaba.if_field(v_guild_id, 'looking_for', v_profile.looking_for) else null end,
    'keywords', case when v_share.show_profile then v_keywords else null end,
    'hobbies', case when v_share.show_personal then sakaba.if_field(v_guild_id, 'hobbies', v_profile.hobbies) else null end,
    'life_story', case when v_share.show_personal then sakaba.if_field(v_guild_id, 'life_story', v_profile.life_story) else null end,
    'business_card', v_card,
    'introductions', case when v_share.show_intros then v_intros else null end
  );
end;
$$;

commit;
