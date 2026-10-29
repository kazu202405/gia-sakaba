-- プロフィールを店ごとに分ける（2/2：関数の切り替え）（2026-10-29）。
-- 仕様：contexts/projects/gia/sakaba_store_profile_spec.md。0134（表と移し替え）の直後に当てる。
--
-- ・sakaba.profiles の中身の列を読む・書く関数を、sakaba.guild_profiles（店×人）から読む・書くように直す
-- ・名前・写真を引く入口は sakaba.member_display(店, 人) の1つ。店にいない人の名前は出さない
-- ・どの店で何を返すか・書けるかは guilds.profile_fields（sakaba.guild_has_field / sakaba.if_field）の1か所で決める。
--   出さない項目は、関数が空で返す（画面で隠すだけにしない）
-- ・連絡先・タグ・共有URL・名刺は店ごと。名刺は「その名刺が載っている店の行」があり、見る人がその店の在籍中の会員のときだけ読める
-- ・引数が増える関数（名刺・連絡先）は、古い版を消す（残すと同じ名前が2つになり呼び出しが曖昧になる）。
--   増えた引数 p_guild_slug は既定 'gia'（古い画面から呼ぶと、建設店の人はGIAの会員ではないので失敗する側に倒れる）
-- ・この migration では profiles の中身の列にもう書かない。唯一の例外は _join_guild が profiles の行を作る
--   insert（display_name は NOT NULL のため）。既にある行は触らない（on conflict do nothing）
-- ・各関数の本文は 0134 を当てた直後の最新の定義を写し、変えたのは上の点だけ

-- ================= 道具 =================
create function sakaba.if_field(p_guild_id uuid, p_field text, p_value text)
returns text language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select case when sakaba.guild_has_field(p_guild_id, p_field) then p_value else '' end;
$$;
revoke all on function sakaba.if_field(uuid, text, text) from public, anon;
grant execute on function sakaba.if_field(uuid, text, text) to authenticated;

-- 店の中の人の名前・写真を引く唯一の入口。その店の行が無ければ何も返さない
create function sakaba.member_display(p_guild_id uuid, p_user_id uuid)
returns table (display_name text, photo_url text) language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select gp.display_name::text, gp.photo_url from sakaba.guild_profiles gp
  where gp.guild_id = p_guild_id and gp.user_id = p_user_id;
$$;
revoke all on function sakaba.member_display(uuid, uuid) from public, anon;
grant execute on function sakaba.member_display(uuid, uuid) to authenticated;

-- この店の中で、2人が紹介でつながったか（0131 の is_connected は店をまたいで数える。連絡先は店ごとに分けたので店で数える）
create function sakaba.is_connected_in_guild(p_guild_id uuid, p_viewer uuid, p_owner uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select p_viewer is not null and p_owner is not null and exists (
    select 1 from sakaba.intro_requests ir
    where ir.guild_id = p_guild_id and ir.status in ('accepted', 'introduced')
      and ((ir.requester_id = p_viewer and ir.target_id = p_owner) or (ir.requester_id = p_owner and ir.target_id = p_viewer))
      and sakaba.is_active_member(p_guild_id, p_viewer)
      and sakaba.is_active_member(p_guild_id, p_owner)
  );
$$;
revoke all on function sakaba.is_connected_in_guild(uuid, uuid, uuid) from public, anon;
grant execute on function sakaba.is_connected_in_guild(uuid, uuid, uuid) to authenticated;

-- ================= 名刺の置き場所 =================
-- 新しい置き場所は「<本人のid>/<店のid>/<front|back>-<時刻>.<拡張子>」。移す前の「<本人のid>/<front|back>-…」も持ち主は取り出せる
create or replace function sakaba.business_card_owner(p_name text)
returns uuid language sql immutable
set search_path = pg_catalog as $$
  select case when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?(front|back)-[0-9]+\.(jpg|png|webp)$'
    then split_part(p_name, '/', 1)::uuid else null end;
$$;
create function sakaba.business_card_guild(p_name text)
returns uuid language sql immutable
set search_path = pg_catalog as $$
  select case when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(front|back)-[0-9]+\.(jpg|png|webp)$'
    then split_part(p_name, '/', 2)::uuid else null end;
$$;
revoke all on function sakaba.business_card_guild(text) from public, anon;
grant execute on function sakaba.business_card_guild(text) to authenticated;

-- 読めるか：本人か、その名刺が載っている店の行があり、見る人も持ち主もその店の在籍中の会員か
create or replace function sakaba.can_read_business_card(p_name text)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select sakaba.business_card_owner(p_name) = auth.uid()
    or exists (
      select 1 from sakaba.guild_profiles gp
      where gp.business_card_agreed_at is not null
        and p_name in (gp.business_card_front, gp.business_card_back)
        and sakaba.is_active_member(gp.guild_id, auth.uid())
        and sakaba.is_active_member(gp.guild_id, gp.user_id)
    );
$$;

drop policy if exists sakaba_business_cards_insert on storage.objects;
create policy sakaba_business_cards_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sakaba-business-cards'
    and sakaba.business_card_owner(name) = auth.uid()
    and sakaba.business_card_guild(name) is not null
    and sakaba.is_active_member(sakaba.business_card_guild(name), auth.uid())
  );

drop function public.sakaba_set_business_card(text, text, boolean);
drop function public.sakaba_get_business_card(uuid);
drop function public.sakaba_get_contact_items(uuid[]);
drop function public.sakaba_save_my_contact_items(jsonb);

create function public.sakaba_set_business_card(p_front text, p_back text, p_agreed boolean, p_guild_slug text default 'gia')
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba, storage as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_path text;
  v_current sakaba.guild_profiles%rowtype;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if (p_front is not null or p_back is not null) and not coalesce(p_agreed, false) then
    raise exception 'consent required' using errcode = '22023';
  end if;
  select gp.* into v_current from sakaba.guild_profiles gp where gp.guild_id = v_guild_id and gp.user_id = v_user_id for update;
  foreach v_path in array array_remove(array[p_front, p_back], null) loop
    -- この店の置き場所の画像か、この店の行にもう載っている画像（移す前の置き場所）だけ
    if sakaba.business_card_owner(v_path) is distinct from v_user_id
       or (sakaba.business_card_guild(v_path) is distinct from v_guild_id and v_path not in (coalesce(v_current.business_card_front, ''), coalesce(v_current.business_card_back, '')))
       or not exists (select 1 from storage.objects o where o.bucket_id = 'sakaba-business-cards' and o.name = v_path) then
      raise exception 'invalid business card image' using errcode = '22023';
    end if;
  end loop;
  if p_front is not null and p_front !~ '/front-' or p_back is not null and p_back !~ '/back-' then
    raise exception 'invalid business card image' using errcode = '22023';
  end if;

  update sakaba.guild_profiles
  set business_card_front = p_front,
      business_card_back = p_back,
      business_card_agreed_at = case when p_front is null and p_back is null then null
        else coalesce(business_card_agreed_at, now()) end,
      updated_at = now()
  where guild_id = v_guild_id and user_id = v_user_id;
end;
$$;

create function public.sakaba_get_business_card(p_user_id uuid, p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if auth.uid() is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, auth.uid())
     or not (p_user_id = auth.uid() or sakaba.is_active_member(v_guild_id, p_user_id)) then
    return null;
  end if;
  return (
    select jsonb_build_object('front', p.business_card_front, 'back', p.business_card_back, 'agreed_at', p.business_card_agreed_at)
    from sakaba.guild_profiles p
    where p.guild_id = v_guild_id and p.user_id = p_user_id and (p.user_id = auth.uid() or p.business_card_agreed_at is not null)
  );
end;
$$;

-- ================= 連絡先 =================
create function public.sakaba_get_contact_items(p_user_ids uuid[], p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_viewer uuid := auth.uid();
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_viewer is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_viewer) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_user_ids is null or cardinality(p_user_ids) > 200 then
    raise exception 'invalid request' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_object_agg(owner_id::text, items)
    from (
      select o.owner_id, coalesce((
        select jsonb_agg(jsonb_build_object(
          'kind', i.kind,
          'label', i.label,
          'value', case
            when o.owner_id = v_viewer or i.visibility = 'members' then i.value
            when i.visibility = 'approved' and sakaba.is_connected_in_guild(v_guild_id, v_viewer, o.owner_id) then i.value
            else null end,
          'visibility', case when o.owner_id = v_viewer then i.visibility else null end,
          'locked', o.owner_id <> v_viewer and i.visibility = 'approved' and not sakaba.is_connected_in_guild(v_guild_id, v_viewer, o.owner_id)
        ) order by i.sort_order)
        from sakaba.profile_contact_items i
        where i.guild_id = v_guild_id and i.user_id = o.owner_id and (o.owner_id = v_viewer or i.visibility <> 'private')
      ), '[]'::jsonb) as items
      from (select distinct unnest(p_user_ids) as owner_id) o
      where o.owner_id = v_viewer or sakaba.is_active_member(v_guild_id, o.owner_id)
    ) per_owner
  ), '{}'::jsonb);
end;
$$;

create function public.sakaba_save_my_contact_items(p_items jsonb, p_guild_slug text default 'gia')
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_item jsonb;
  v_kind text;
  v_label text;
  v_value text;
  v_visibility text;
  v_index integer := 0;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 10 then
    raise exception 'invalid contact items' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_kind := v_item->>'kind';
    v_label := btrim(coalesce(v_item->>'label', ''));
    v_value := btrim(coalesce(v_item->>'value', ''));
    v_visibility := coalesce(v_item->>'visibility', 'approved');
    if v_kind is null or v_kind not in ('email', 'line', 'instagram', 'x', 'facebook', 'threads', 'note', 'website', 'other')
       or v_visibility not in ('members', 'approved', 'private')
       or v_value = '' or char_length(v_value) > 300 or char_length(v_label) > 40
       or (v_kind = 'other' and v_label = '')
       or (v_kind = 'email' and v_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
       or (v_kind <> 'email' and v_value !~* '^https?://[^[:space:]]+$') then
      raise exception 'invalid contact items' using errcode = '22023';
    end if;
  end loop;

  delete from sakaba.profile_contact_items where guild_id = v_guild_id and user_id = v_user_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into sakaba.profile_contact_items (guild_id, user_id, kind, label, value, visibility, sort_order)
    values (v_guild_id, v_user_id, v_item->>'kind', case when v_item->>'kind' = 'other' then btrim(coalesce(v_item->>'label', '')) else '' end,
            btrim(v_item->>'value'), coalesce(v_item->>'visibility', 'approved'), v_index);
    v_index := v_index + 1;
  end loop;

  -- 古い読み手のために、古い保存場所を新しい内容から作り直す。
  -- 非公開のものは空にする（古い経路で非公開の値が渡らないように）。種類ごとに最初の1件だけ
  insert into sakaba.profile_contacts (guild_id, user_id, email, line_url, website_url, email_visibility, line_visibility, website_visibility)
  select v_guild_id, v_user_id,
    coalesce((select i.value from sakaba.profile_contact_items i where i.guild_id = v_guild_id and i.user_id = v_user_id and i.kind = 'email' and i.visibility <> 'private' order by i.sort_order limit 1), ''),
    coalesce((select i.value from sakaba.profile_contact_items i where i.guild_id = v_guild_id and i.user_id = v_user_id and i.kind = 'line' and i.visibility <> 'private' order by i.sort_order limit 1), ''),
    coalesce((select i.value from sakaba.profile_contact_items i where i.guild_id = v_guild_id and i.user_id = v_user_id and i.kind = 'website' and i.visibility <> 'private' order by i.sort_order limit 1), ''),
    coalesce((select i.visibility from sakaba.profile_contact_items i where i.guild_id = v_guild_id and i.user_id = v_user_id and i.kind = 'email' and i.visibility <> 'private' order by i.sort_order limit 1), 'approved'),
    coalesce((select i.visibility from sakaba.profile_contact_items i where i.guild_id = v_guild_id and i.user_id = v_user_id and i.kind = 'line' and i.visibility <> 'private' order by i.sort_order limit 1), 'approved'),
    coalesce((select i.visibility from sakaba.profile_contact_items i where i.guild_id = v_guild_id and i.user_id = v_user_id and i.kind = 'website' and i.visibility <> 'private' order by i.sort_order limit 1), 'approved')
  on conflict (guild_id, user_id) do update set
    email = excluded.email, line_url = excluded.line_url, website_url = excluded.website_url,
    email_visibility = excluded.email_visibility, line_visibility = excluded.line_visibility,
    website_visibility = excluded.website_visibility, updated_at = now();
end;
$$;

revoke all on function public.sakaba_set_business_card(text, text, boolean, text) from public, anon;
revoke all on function public.sakaba_get_business_card(uuid, text) from public, anon;
revoke all on function public.sakaba_get_contact_items(uuid[], text) from public, anon;
revoke all on function public.sakaba_save_my_contact_items(jsonb, text) from public, anon;
grant execute on function public.sakaba_set_business_card(text, text, boolean, text) to authenticated;
grant execute on function public.sakaba_get_business_card(uuid, text) to authenticated;
grant execute on function public.sakaba_get_contact_items(uuid[], text) to authenticated;
grant execute on function public.sakaba_save_my_contact_items(jsonb, text) to authenticated;

-- ================= 業種・キーワード・写真（店ごと） =================
-- 業種：業種を「自由に書く」店（industry）は、店ごとのタグの名前。「選ぶ」店（industry_choice）は、店ごとの行の industry（選択肢のキー）
create function sakaba.profile_industry(p_guild_id uuid, p_user_id uuid)
returns text language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select case
    when sakaba.guild_has_field(p_guild_id, 'industry') then coalesce((
      select t.name from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
      where pt.guild_id = p_guild_id and pt.user_id = p_user_id and t.kind = 'industry' and t.is_active
      order by t.sort_order, t.name limit 1), '')
    when sakaba.guild_has_field(p_guild_id, 'industry_choice') then coalesce((
      select gp.industry from sakaba.guild_profiles gp where gp.guild_id = p_guild_id and gp.user_id = p_user_id), '')
    else '' end;
$$;
create function sakaba.profile_keywords(p_guild_id uuid, p_user_id uuid)
returns jsonb language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select case when sakaba.guild_has_field(p_guild_id, 'industry') then coalesce((
    select jsonb_agg(t.name order by t.sort_order, t.name)
    from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
    where pt.guild_id = p_guild_id and pt.user_id = p_user_id and t.kind = 'keyword' and t.is_active), '[]'::jsonb)
  else '[]'::jsonb end;
$$;
-- 伝えたいことの写真（保存場所の名前の一覧。出さない店では空）
create function sakaba.profile_work_photos(p_guild_id uuid, p_user_id uuid)
returns jsonb language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select case when sakaba.guild_has_field(p_guild_id, 'work_photos') then coalesce((
    select jsonb_agg(ph.storage_path order by ph.sort_order, ph.created_at)
    from sakaba.guild_profile_photos ph where ph.guild_id = p_guild_id and ph.user_id = p_user_id), '[]'::jsonb)
  else '[]'::jsonb end;
$$;
revoke all on function sakaba.profile_industry(uuid, uuid) from public, anon;
revoke all on function sakaba.profile_keywords(uuid, uuid) from public, anon;
revoke all on function sakaba.profile_work_photos(uuid, uuid) from public, anon;
grant execute on function sakaba.profile_industry(uuid, uuid) to authenticated;
grant execute on function sakaba.profile_keywords(uuid, uuid) to authenticated;
grant execute on function sakaba.profile_work_photos(uuid, uuid) to authenticated;

-- ================= 自分のプロフィール・名簿 =================
create or replace function public.sakaba_get_my_profile(p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'id', p.user_id, 'display_name', p.display_name,
    'photo_url', p.photo_url, 'headline', sakaba.if_field(g.id, 'headline', p.headline),
    'industry', sakaba.profile_industry(g.id, p.user_id),
    'job', sakaba.if_field(g.id, 'job', p.job), 'job_icon', p.job_icon, 'region', sakaba.if_field(g.id, 'region', p.region),
    'work_areas', case when sakaba.guild_has_field(g.id, 'work_areas') then to_jsonb(p.work_areas) else '[]'::jsonb end,
    'work_types', case when sakaba.guild_has_field(g.id, 'work_types') then to_jsonb(p.work_types) else '[]'::jsonb end,
    'has_construction_license', sakaba.guild_has_field(g.id, 'licenses') and p.has_construction_license,
    'has_real_estate_license', sakaba.guild_has_field(g.id, 'licenses') and p.has_real_estate_license,
    'work_photos', sakaba.profile_work_photos(g.id, p.user_id),
    'bio', sakaba.if_field(g.id, 'bio', p.bio), 'can_help_with', sakaba.if_field(g.id, 'can_help_with', p.can_help_with),
    'keywords', sakaba.profile_keywords(g.id, p.user_id),
    'strengths', sakaba.if_field(g.id, 'strengths', p.strengths), 'values_text', sakaba.if_field(g.id, 'values_text', p.values_text),
    'vision', sakaba.if_field(g.id, 'vision', p.vision), 'social_issue', sakaba.if_field(g.id, 'social_issue', p.social_issue),
    'looking_for', sakaba.if_field(g.id, 'looking_for', p.looking_for), 'want_to_meet', sakaba.if_field(g.id, 'want_to_meet', p.want_to_meet),
    'role', gm.role, 'visible_groups', gm.visible_groups,
    'accept_intro', gm.accept_intro, 'company_name', gm.company_name,
    'position', gm.position, 'show_company', gm.show_company,
    'gathering_approved_at', gm.gathering_approved_at,
    'want_to_solve', sakaba.if_field(g.id, 'want_to_solve', gm.want_to_solve), 'joined_at', gm.joined_at,
    'show_achievements', gm.show_achievements,
    'contact', jsonb_build_object(
      'email', coalesce(pc.email, ''),
      'line_url', coalesce(pc.line_url, ''),
      'website_url', coalesce(pc.website_url, '')
    )
  ) into v_result
  from sakaba.guilds g
  join sakaba.guild_members gm on gm.guild_id = g.id
  join sakaba.guild_profiles p on p.guild_id = gm.guild_id and p.user_id = gm.user_id
  left join sakaba.profile_contacts pc on pc.guild_id = p.guild_id and pc.user_id = p.user_id
  where lower(g.slug) = lower(btrim(p_guild_slug))
    and gm.user_id = v_user_id and gm.suspended_at is null;
  if v_result is null then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  return v_result;
end;
$$;

create or replace function public.sakaba_list_members(p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select g.id into v_guild_id
  from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));

  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(member_json order by joined_at, display_name), '[]'::jsonb)
  into v_result
  from (
    select
      gm.joined_at,
      p.display_name,
      jsonb_build_object(
        'id', p.user_id,
        'display_name', p.display_name,
        'photo_url', p.photo_url,
        'headline', sakaba.if_field(v_guild_id, 'headline', p.headline),
        'industry', sakaba.profile_industry(v_guild_id, p.user_id),
        'job', sakaba.if_field(v_guild_id, 'job', p.job),
        'job_icon', p.job_icon,
        'region', sakaba.if_field(v_guild_id, 'region', p.region),
        'work_areas', case when sakaba.guild_has_field(v_guild_id, 'work_areas') then to_jsonb(p.work_areas) else '[]'::jsonb end,
        'work_types', case when sakaba.guild_has_field(v_guild_id, 'work_types') then to_jsonb(p.work_types) else '[]'::jsonb end,
        'has_construction_license', sakaba.guild_has_field(v_guild_id, 'licenses') and p.has_construction_license,
        'has_real_estate_license', sakaba.guild_has_field(v_guild_id, 'licenses') and p.has_real_estate_license,
        'work_photos', case when 'work' = any(gm.visible_groups) then sakaba.profile_work_photos(v_guild_id, p.user_id) else '[]'::jsonb end,
        'bio', case when 'work' = any(gm.visible_groups) then sakaba.if_field(v_guild_id, 'bio', p.bio) else '' end,
        'can_help_with', case when 'work' = any(gm.visible_groups) then sakaba.if_field(v_guild_id, 'can_help_with', p.can_help_with) else '' end,
        'keywords', case when 'work' = any(gm.visible_groups) then sakaba.profile_keywords(v_guild_id, p.user_id) else '[]'::jsonb end,
        'strengths', sakaba.if_field(v_guild_id, 'strengths', p.strengths),
        'values_text', case when 'values' = any(gm.visible_groups) then sakaba.if_field(v_guild_id, 'values_text', p.values_text) else '' end,
        'vision', case when 'values' = any(gm.visible_groups) then sakaba.if_field(v_guild_id, 'vision', p.vision) else '' end,
        'social_issue', case when 'values' = any(gm.visible_groups) then sakaba.if_field(v_guild_id, 'social_issue', p.social_issue) else '' end,
        'looking_for', case when 'connect' = any(gm.visible_groups) then sakaba.if_field(v_guild_id, 'looking_for', p.looking_for) else '' end,
        'want_to_meet', case when 'connect' = any(gm.visible_groups) then sakaba.if_field(v_guild_id, 'want_to_meet', p.want_to_meet) else '' end,
        'role', gm.role,
        'visible_groups', gm.visible_groups,
        'accept_intro', gm.accept_intro,
        'company_name', case when gm.show_company or p.user_id = v_user_id then gm.company_name else '' end,
        'position', case when gm.show_company or p.user_id = v_user_id then gm.position else 'other' end,
        'show_company', gm.show_company,
        'gathering_approved_at', case
          when p.user_id = v_user_id or sakaba.is_guild_master(v_guild_id, v_user_id)
            then gm.gathering_approved_at
          else null
        end,
        'want_to_solve', sakaba.if_field(v_guild_id, 'want_to_solve', gm.want_to_solve),
        'joined_at', gm.joined_at
      ) as member_json
    from sakaba.guild_members gm
    join sakaba.guild_profiles p on p.guild_id = gm.guild_id and p.user_id = gm.user_id
    where gm.guild_id = v_guild_id
      and gm.suspended_at is null
  ) members;

  return v_result;
end;
$$;

create or replace function public.sakaba_get_profile_extras(p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
  v_birthday boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  v_birthday := sakaba.guild_has_field(v_guild_id, 'birthday');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.user_id,
    'name_kana', p.name_kana,
    'hometown', sakaba.if_field(v_guild_id, 'hometown', p.hometown),
    'hobbies', sakaba.if_field(v_guild_id, 'hobbies', p.hobbies),
    'life_story', sakaba.if_field(v_guild_id, 'life_story', p.life_story),
    'birth_month', case when v_birthday then p.birth_month end,
    'birth_day', case when v_birthday then p.birth_day end,
    'birth_year', case when v_birthday then p.birth_year end,
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
  join sakaba.guild_profiles p on p.guild_id = gm.guild_id and p.user_id = gm.user_id
  left join sakaba.profile_contacts pc on pc.guild_id = p.guild_id and pc.user_id = p.user_id
  where gm.guild_id = v_guild_id and gm.suspended_at is null;
  return v_result;
end;
$$;

-- ================= 共有URL（店ごとに1本） =================
-- URLの token がどの店の行かを決める。p_guild_slug を渡されたときは、その店のURLでなければ見せない
create or replace function public.sakaba_get_shared_profile(p_token text, p_guild_slug text default null)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_share sakaba.profile_shares;
  v_guild_id uuid;
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

-- ================= 書き込み（店の行だけ） =================
create or replace function public.sakaba_update_my_profile_simple(p_guild_slug text, p_display_name text, p_photo_url text, p_headline text, p_job text, p_job_icon text, p_region text, p_bio text, p_values_text text, p_looking_for text, p_visible_groups text[], p_accept_intro boolean, p_company_name text, p_position text, p_show_company boolean, p_want_to_solve text, p_show_achievements boolean, p_email text default ''::text, p_line_url text default ''::text, p_website_url text default ''::text, p_industry text default ''::text, p_keywords text[] default '{}'::text[])
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

  -- この店で出さない項目は、渡されても書かない（空のまま）
  update sakaba.guild_profiles set
    display_name = btrim(p_display_name), photo_url = nullif(btrim(coalesce(p_photo_url, '')), ''),
    headline = sakaba.if_field(v_guild_id, 'headline', btrim(coalesce(p_headline, ''))),
    job = sakaba.if_field(v_guild_id, 'job', btrim(coalesce(p_job, ''))), job_icon = p_job_icon,
    region = sakaba.if_field(v_guild_id, 'region', btrim(coalesce(p_region, ''))),
    bio = sakaba.if_field(v_guild_id, 'bio', btrim(coalesce(p_bio, ''))),
    can_help_with = '', strengths = '',
    values_text = sakaba.if_field(v_guild_id, 'values_text', btrim(coalesce(p_values_text, ''))),
    vision = '', social_issue = '',
    looking_for = sakaba.if_field(v_guild_id, 'looking_for', btrim(coalesce(p_looking_for, ''))), want_to_meet = ''
  where guild_id = v_guild_id and user_id = v_user_id;

  update sakaba.guild_members set
    visible_groups = coalesce(p_visible_groups, '{}'), accept_intro = p_accept_intro,
    company_name = btrim(p_company_name), position = p_position, show_company = p_show_company,
    want_to_solve = sakaba.if_field(v_guild_id, 'want_to_solve', btrim(coalesce(p_want_to_solve, ''))),
    show_achievements = p_show_achievements
  where guild_id = v_guild_id and user_id = v_user_id;

  -- 連絡先はここでは書かない（0113 から sakaba_save_my_contact_items だけが書く。
  -- p_email・p_line_url・p_website_url は古い画面との互換のため引数に残すが、使わない）

  -- 業種・キーワードのタグは、タグで業種を書く店だけ（この店の分だけ入れ直す）
  if sakaba.guild_has_field(v_guild_id, 'industry') then
    delete from sakaba.profile_tags pt where pt.guild_id = v_guild_id and pt.user_id = v_user_id;
    if nullif(btrim(coalesce(p_industry, '')), '') is not null then
      insert into sakaba.tags (kind, name) values ('industry', btrim(p_industry))
      on conflict (kind, lower(name)) do update set is_active = true returning id into v_tag_id;
      insert into sakaba.profile_tags (guild_id, user_id, tag_id) values (v_guild_id, v_user_id, v_tag_id);
    end if;
    foreach v_keyword in array coalesce(p_keywords, '{}') loop
      if nullif(btrim(v_keyword), '') is not null then
        insert into sakaba.tags (kind, name) values ('keyword', btrim(v_keyword))
        on conflict (kind, lower(name)) do update set is_active = true returning id into v_tag_id;
        insert into sakaba.profile_tags (guild_id, user_id, tag_id) values (v_guild_id, v_user_id, v_tag_id) on conflict do nothing;
      end if;
    end loop;
  end if;
end;
$$;

create or replace function public.sakaba_update_personal_profile(p_guild_slug text, p_hometown text, p_hobbies text, p_life_story text, p_birth_month smallint, p_birth_day smallint, p_birth_year smallint)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_hometown text := btrim(coalesce(p_hometown, ''));
  v_hobbies text := btrim(coalesce(p_hobbies, ''));
  v_life_story text := btrim(coalesce(p_life_story, ''));
  v_birthday boolean;
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
  v_birthday := sakaba.guild_has_field(v_guild_id, 'birthday');

  update sakaba.guild_profiles set
    hometown = sakaba.if_field(v_guild_id, 'hometown', v_hometown),
    hobbies = sakaba.if_field(v_guild_id, 'hobbies', v_hobbies),
    life_story = sakaba.if_field(v_guild_id, 'life_story', v_life_story),
    birth_month = case when v_birthday then p_birth_month end,
    birth_day = case when v_birthday then p_birth_day end,
    birth_year = case when v_birthday then p_birth_year end
  where guild_id = v_guild_id and user_id = v_user_id;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.sakaba_update_profile_extras(p_guild_slug text, p_name_kana text default null::text, p_website_visibility text default null::text, p_website_url text default null::text)
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
    update sakaba.guild_profiles set name_kana = v_name_kana where guild_id = v_guild_id and user_id = v_user_id;
  end if;
  if p_website_visibility is not null or p_website_url is not null then
    insert into sakaba.profile_contacts as pc (guild_id, user_id, website_visibility, website_url)
    values (v_guild_id, v_user_id, coalesce(p_website_visibility, 'approved'), v_website_url)
    on conflict (guild_id, user_id) do update set
      website_visibility = coalesce(p_website_visibility, pc.website_visibility),
      website_url = coalesce(p_website_url, pc.website_url);
  end if;
end;
$$;

-- 店だけの項目（建設・不動産の店：業種を選ぶ・対応エリア・得意な工事・許可/免許の印）。出さない店では書けない
create function public.sakaba_update_store_profile_extras(p_guild_slug text, p_industry text default null, p_work_areas text[] default null, p_work_types text[] default null, p_has_construction_license boolean default null, p_has_real_estate_license boolean default null)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_industry text := btrim(coalesce(p_industry, ''));
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if (p_industry is not null and not sakaba.guild_has_field(v_guild_id, 'industry_choice'))
     or (p_work_areas is not null and not sakaba.guild_has_field(v_guild_id, 'work_areas'))
     or (p_work_types is not null and not sakaba.guild_has_field(v_guild_id, 'work_types'))
     or ((p_has_construction_license is not null or p_has_real_estate_license is not null) and not sakaba.guild_has_field(v_guild_id, 'licenses')) then
    raise exception 'field not available in this store' using errcode = '22023';
  end if;
  if char_length(v_industry) > 40 or coalesce(cardinality(p_work_areas), 0) > 47 or coalesce(cardinality(p_work_types), 0) > 30
     or exists (select 1 from unnest(coalesce(p_work_areas, '{}') || coalesce(p_work_types, '{}')) x where char_length(x) > 20 or btrim(x) = '') then
    raise exception 'invalid store profile' using errcode = '22023';
  end if;
  update sakaba.guild_profiles set
    industry = case when p_industry is not null then v_industry else industry end,
    work_areas = coalesce(p_work_areas, work_areas),
    work_types = coalesce(p_work_types, work_types),
    has_construction_license = coalesce(p_has_construction_license, has_construction_license),
    has_real_estate_license = coalesce(p_has_real_estate_license, has_real_estate_license)
  where guild_id = v_guild_id and user_id = v_user_id;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$$;

-- 伝えたいことに添える写真（任意・3枚まで）。p_paths は保存場所（sakaba-work-photos）の名前の並び順どおり
create function public.sakaba_set_work_photos(p_guild_slug text, p_paths text[])
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba, storage as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_path text;
  v_index integer := 0;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if not sakaba.guild_has_field(v_guild_id, 'work_photos') then
    raise exception 'field not available in this store' using errcode = '22023';
  end if;
  if p_paths is null or cardinality(p_paths) > 3 or cardinality(p_paths) <> (select count(distinct x) from unnest(p_paths) x) then
    raise exception 'invalid photos' using errcode = '22023';
  end if;
  foreach v_path in array p_paths loop
    if sakaba.work_photo_owner(v_path) is distinct from v_user_id or sakaba.work_photo_guild(v_path) is distinct from v_guild_id
       or not exists (select 1 from storage.objects o where o.bucket_id = 'sakaba-work-photos' and o.name = v_path) then
      raise exception 'invalid photos' using errcode = '22023';
    end if;
  end loop;
  delete from sakaba.guild_profile_photos where guild_id = v_guild_id and user_id = v_user_id and storage_path <> all (p_paths);
  foreach v_path in array p_paths loop
    insert into sakaba.guild_profile_photos (guild_id, user_id, storage_path, sort_order)
    values (v_guild_id, v_user_id, v_path, v_index)
    on conflict (storage_path) do update set sort_order = excluded.sort_order;
    v_index := v_index + 1;
  end loop;
end;
$$;
revoke all on function public.sakaba_update_store_profile_extras(text, text, text[], text[], boolean, boolean) from public, anon;
revoke all on function public.sakaba_set_work_photos(text, text[]) from public, anon;
grant execute on function public.sakaba_update_store_profile_extras(text, text, text[], text[], boolean, boolean) to authenticated;
grant execute on function public.sakaba_set_work_photos(text, text[]) to authenticated;

-- ================= 名前・写真・連絡先・共有URLを店の行から引くように直した関数 =================

create or replace function public.sakaba_ack_my_share(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  insert into sakaba.profile_shares (guild_id, user_id, token) values (v_guild_id, v_user_id, sakaba.new_share_token())
  on conflict (guild_id, user_id) do nothing;
  update sakaba.profile_shares set acknowledged_at = coalesce(acknowledged_at, now()) where guild_id = v_guild_id and user_id = v_user_id;
end;
$function$
;

create or replace function public.sakaba_decline_my_share_nudge(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  insert into sakaba.profile_shares (guild_id, user_id, token) values (v_guild_id, v_user_id, sakaba.new_share_token())
  on conflict (guild_id, user_id) do nothing;
  update sakaba.profile_shares set nudge_declined_at = coalesce(nudge_declined_at, now()) where guild_id = v_guild_id and user_id = v_user_id;
end;
$function$
;

create or replace function public.sakaba_get_my_share(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_row sakaba.profile_shares;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  insert into sakaba.profile_shares (guild_id, user_id, token) values (v_guild_id, v_user_id, sakaba.new_share_token())
  on conflict (guild_id, user_id) do nothing;
  select * into v_row from sakaba.profile_shares where guild_id = v_guild_id and user_id = v_user_id;
  return jsonb_build_object(
    'token', v_row.token, 'enabled', v_row.enabled,
    'show_profile', v_row.show_profile, 'show_personal', v_row.show_personal,
    'show_card', v_row.show_card, 'show_intros', v_row.show_intros,
    'show_intro_authors', v_row.show_intro_authors
  );
end;
$function$
;

create or replace function public.sakaba_get_my_share_nudge_done(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  return coalesce((select ps.acknowledged_at is not null or ps.nudge_declined_at is not null from sakaba.profile_shares ps where ps.guild_id = v_guild_id and ps.user_id = v_user_id), false);
end;
$function$
;

create or replace function public.sakaba_rotate_my_share(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_token text := sakaba.new_share_token();
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  insert into sakaba.profile_shares (guild_id, user_id, token, rotated_at) values (v_guild_id, v_user_id, v_token, now())
  on conflict (guild_id, user_id) do update set token = excluded.token, rotated_at = now(), updated_at = now();
  return v_token;
end;
$function$
;

create or replace function public.sakaba_update_my_share(p_guild_slug text, p_enabled boolean, p_show_profile boolean, p_show_personal boolean, p_show_card boolean, p_show_intros boolean, p_show_intro_authors boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  insert into sakaba.profile_shares (guild_id, user_id, token) values (v_guild_id, v_user_id, sakaba.new_share_token())
  on conflict (guild_id, user_id) do nothing;
  update sakaba.profile_shares set
    enabled = coalesce(p_enabled, enabled),
    show_profile = coalesce(p_show_profile, show_profile),
    show_personal = coalesce(p_show_personal, show_personal),
    show_card = coalesce(p_show_card, show_card),
    show_intros = coalesce(p_show_intros, show_intros),
    show_intro_authors = coalesce(p_show_intros, show_intros) and coalesce(p_show_intro_authors, show_intro_authors),
    updated_at = now()
  where guild_id = v_guild_id and user_id = v_user_id;
end;
$function$
;

create or replace function public.sakaba_get_member_link_info(p_target_id uuid, p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_token text;
  v_connected boolean := false;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_target_id is null or not sakaba.is_active_member(v_guild_id, p_target_id) then
    return jsonb_build_object('share_token', null, 'invite_connected', false);
  end if;
  select ps.token into v_token from sakaba.profile_shares ps where ps.guild_id = v_guild_id and ps.user_id = p_target_id and ps.enabled;
  if p_target_id <> v_user_id
     and sakaba.is_direct_invite_pair(v_guild_id, v_user_id, p_target_id)
     and not exists (select 1 from sakaba.guild_members gm where gm.guild_id = v_guild_id and gm.user_id = p_target_id and gm.hide_invite_path) then
    v_connected := true;
  end if;
  return jsonb_build_object('share_token', v_token, 'invite_connected', v_connected);
end;
$function$
;

create or replace function public.sakaba_check_invite(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_invite sakaba.invites%rowtype;
  v_guild sakaba.guilds%rowtype;
  v_inviter_name text;
begin
  if nullif(btrim(p_code), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  select i.* into v_invite
  from sakaba.invites i
  where lower(i.code) = lower(btrim(p_code));
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_invite.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if v_invite.used_count >= v_invite.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'used_up');
  end if;
  select g.* into v_guild from sakaba.guilds g where g.id = v_invite.guild_id;
  select md.display_name into v_inviter_name
  from sakaba.member_display(v_invite.guild_id, v_invite.created_by) md;
  return jsonb_build_object(
    'ok', true,
    'guild', jsonb_build_object('slug', v_guild.slug, 'name', v_guild.name),
    'inviter_name', coalesce(v_inviter_name, '')
  );
end;
$function$
;

create or replace function public.sakaba_get_invite_path(p_target_id uuid, p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_mine uuid[];
  v_theirs uuid[];
  v_path uuid[];
  v_meet integer;
  v_their_meet integer;
  v_nodes jsonb := '[]'::jsonb;
  v_id uuid;
  v_member sakaba.guild_members%rowtype;
  v_name text;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if not exists (select 1 from sakaba.guild_members gm where gm.guild_id = v_guild_id and gm.user_id = p_target_id) then
    return jsonb_build_object('status', 'none', 'nodes', '[]'::jsonb);
  end if;
  -- 相手が名前を出さない設定なら、相手のページではつながりを出さない（自分の画面は別）
  if p_target_id <> v_user_id and exists (
    select 1 from sakaba.guild_members gm
    where gm.guild_id = v_guild_id and gm.user_id = p_target_id and gm.hide_invite_path
  ) then
    return jsonb_build_object('status', 'hidden', 'nodes', '[]'::jsonb);
  end if;
  v_mine := sakaba.invite_ancestors(v_guild_id, v_user_id);
  if p_target_id = v_user_id then
    -- 根っこ → … → 自分
    select array_agg(x order by ord desc) into v_path from unnest(v_mine) with ordinality as t(x, ord);
  else
    v_theirs := sakaba.invite_ancestors(v_guild_id, p_target_id);
    -- 自分の列のうち、相手の列にも出てくる最初の人（合流点）
    select min(ord) into v_meet from unnest(v_mine) with ordinality as t(x, ord) where x = any(v_theirs);
    if v_meet is null then
      return jsonb_build_object('status', 'none', 'nodes', '[]'::jsonb);
    end if;
    select array_position(v_theirs, v_mine[v_meet]) into v_their_meet;
    -- 自分 … 合流点 → （相手の列を逆向きに）… 相手
    v_path := v_mine[1:v_meet];
    if v_their_meet > 1 then
      select v_path || array_agg(x order by ord desc) into v_path
      from unnest(v_theirs[1:v_their_meet - 1]) with ordinality as t(x, ord);
    end if;
  end if;
  foreach v_id in array v_path loop
    select * into v_member from sakaba.guild_members gm where gm.guild_id = v_guild_id and gm.user_id = v_id;
    select md.display_name into v_name from sakaba.member_display(v_guild_id, v_id) md;
    v_nodes := v_nodes || jsonb_build_array(case
      when v_id = v_user_id then jsonb_build_object('kind', 'me', 'id', v_id, 'name', coalesce(v_name, ''))
      when v_member.user_id is null or v_member.suspended_at is not null then jsonb_build_object('kind', 'former', 'id', null, 'name', '')
      when v_id <> p_target_id and v_member.hide_invite_path then jsonb_build_object('kind', 'anonymous', 'id', null, 'name', '')
      else jsonb_build_object('kind', 'member', 'id', v_id, 'name', coalesce(v_name, ''))
    end);
  end loop;
  return jsonb_build_object(
    'status', 'ok',
    'nodes', v_nodes,
    'my_hide', (select gm.hide_invite_path from sakaba.guild_members gm where gm.guild_id = v_guild_id and gm.user_id = v_user_id)
  );
end;
$function$
;

create or replace function public.sakaba_get_master_introduction(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba', 'extensions'
AS $function$
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
  select coalesce((select md.display_name from sakaba.member_display(v_intro.guild_id, v_intro.created_by) md), '管理者') into v_admin_name;
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
$function$
;

create or replace function public.sakaba_get_my_member_invite(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
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
  join sakaba.guild_profiles p on p.guild_id = gm.guild_id and p.user_id = gm.user_id
  where gm.guild_id = v_guild_id and i.created_by = v_user_id and i.kind = 'member'
    and gm.approval_state is null;
  return jsonb_build_object('link', v_link, 'people', v_people);
end;
$function$
;

create or replace function public.sakaba_list_consult_requests(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'user_id', c.user_id, 'display_name', p.display_name,
      'topics', to_jsonb(c.topics), 'message', c.message, 'status', c.status, 'created_at', c.created_at
    ) order by c.created_at desc)
    from (select * from sakaba.consult_requests where guild_id = v_guild_id order by created_at desc limit 200) c
    join sakaba.guild_profiles p on p.guild_id = v_guild_id and p.user_id = c.user_id
  ), '[]'::jsonb);
end;
$function$
;

create or replace function public.sakaba_list_feedback_reports(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', f.id, 'user_id', f.user_id, 'display_name', p.display_name,
      'kind', f.kind, 'message', f.message, 'page_path', f.page_path, 'user_agent', f.user_agent,
      'status', f.status, 'created_at', f.created_at
    ) order by f.created_at desc)
    from (select * from sakaba.feedback_reports where guild_id = v_guild_id order by created_at desc limit 200) f
    join sakaba.guild_profiles p on p.guild_id = v_guild_id and p.user_id = f.user_id
  ), '[]'::jsonb);
end;
$function$
;

create or replace function public.sakaba_list_invite_network(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
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
  join sakaba.guild_profiles p on p.guild_id = gm.guild_id and p.user_id = gm.user_id
  left join sakaba.invites i on i.id = gm.invite_id
  left join sakaba.guild_profiles inviter on inviter.guild_id = gm.guild_id and inviter.user_id = i.created_by
  where gm.guild_id = v_guild_id and gm.approval_state is null;
  return v_result;
end;
$function$
;

create or replace function public.sakaba_list_master_invites(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
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
      join sakaba.guild_profiles p on p.guild_id = gm.guild_id and p.user_id = gm.user_id
      where gm.invite_id = i.id and gm.guild_id = v_guild_id and gm.approval_state is null
    ), '[]'::jsonb)
  ) order by i.created_at desc), '[]'::jsonb)
  into v_result
  from sakaba.invites i
  left join sakaba.guild_profiles creator on creator.guild_id = i.guild_id and creator.user_id = i.created_by
  where i.guild_id = v_guild_id;
  return v_result;
end;
$function$
;

create or replace function public.sakaba_list_member_introductions(p_guild_slug text DEFAULT 'gia'::text, p_target_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
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
  join sakaba.guild_profiles p on p.guild_id = mi.guild_id and p.user_id = mi.author_id
  where mi.guild_id = v_guild_id and mi.target_id = v_target_id;
  return v_result;
end;
$function$
;

create or replace function public.sakaba_list_pending_gathering_applications(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id
  from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'quest_id', q.id,
    'quest_title', q.title,
    'user_id', qa.user_id,
    'display_name', p.display_name,
    'company_name', gm.company_name,
    'position', gm.position,
    'want_to_solve', gm.want_to_solve,
    'message', qa.message,
    'created_at', qa.created_at
  ) order by qa.created_at, qa.quest_id, qa.user_id), '[]'::jsonb)
  into v_result
  from sakaba.quest_applications qa
  join sakaba.quests q on q.id = qa.quest_id
  join sakaba.guild_members gm on gm.guild_id = q.guild_id and gm.user_id = qa.user_id
  join sakaba.guild_profiles p on p.guild_id = q.guild_id and p.user_id = qa.user_id
  where q.guild_id = v_guild_id
    and q.members_only
    and qa.status = 'applied'
    and qa.approved_at is null
    and qa.declined_at is null
    and gm.suspended_at is null;
  return v_result;
end;
$function$
;

create or replace function public.sakaba_list_pending_members(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not exists (
    select 1 from sakaba.guild_members o
    where o.guild_id = v_guild_id and o.user_id = v_user_id and o.role = 'owner' and o.suspended_at is null
  ) then
    raise exception 'guild owner required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', gm.user_id,
      'display_name', p.display_name,
      'company_name', gm.company_name,
      'other_position_title', gm.other_position_title,
      'other_work_summary', gm.other_work_summary,
      'invited_by_name', coalesce(inviter.display_name, ''),
      'applied_at', gm.joined_at
    ) order by gm.joined_at, gm.user_id)
    from sakaba.guild_members gm
    join sakaba.guild_profiles p on p.guild_id = gm.guild_id and p.user_id = gm.user_id
    left join sakaba.invites i on i.id = gm.invite_id
    left join sakaba.guild_profiles inviter on inviter.guild_id = gm.guild_id and inviter.user_id = i.created_by
    where gm.guild_id = v_guild_id and sakaba.member_gate_state(gm.guild_id, gm.user_id) = 'pending'
  ), '[]'::jsonb);
end;
$function$
;

create or replace function public.sakaba_push_candidates()
 RETURNS TABLE(event_key text, user_id uuid, category text, body text, href text, occurred_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
  with tomorrow as (
    select ((now() at time zone 'Asia/Tokyo')::date + 1) as day
  ), candidates as (
    select 'notice:' || n.id::text as event_key, n.guild_id, n.user_id, 'actions'::text as category,
      case n.kind
        when 'quest_applied' then case when q.members_only and qa.approved_at is null
          then '限定の集まりに承認待ちの申込が届きました' else 'クエストに参加希望が届きました' end
        when 'quest_updated' then '参加中のクエストが更新されました'
        when 'quest_withdrawn' then '参加中のクエストが取り下げられました'
        when 'gathering_approved' then '限定の集まりへの参加が承認されました'
        when 'gathering_declined' then '限定の集まりへの申込結果が届きました'
        when 'schedule_decided' then '集まりの日にちが決まりました'
        when 'consult_request' then 'エンタープライズの相談が届きました'
        when 'feedback_report' then 'ご意見・不具合の報告が届きました'
        when 'member_joined' then coalesce(ap.display_name, '新しいメンバー') || 'さんが入会しました'
        when 'member_pending' then coalesce(ap.display_name, '新しい方') || 'さんから参加の申請が届きました'
        when 'profile_draft_waiting' then 'ステータスの下書きが届きました。内容を見て選んでください'
        when 'profile_draft_applied' then coalesce(ap.display_name, 'メンバー') || 'さんが、下書きをステータスに載せました'
        when 'profile_draft_declined' then coalesce(ap.display_name, 'メンバー') || 'さんは、今回は下書きを載せませんでした'
        else 'しょうかいについておしらせがあります'
      end as body,
      case when n.intro_request_id is not null then '/guild/requests'
        when n.kind = 'quest_applied' and q.members_only and qa.approved_at is null then '/guild/master'
        when n.kind = 'quest_applied' then '/guild/quests/' || n.quest_id::text || '/applicants'
        when n.kind = 'consult_request' then '/guild/master#master-consults-title'
        when n.kind = 'feedback_report' then '/guild/master#master-feedback-title'
        when n.kind = 'member_joined' then '/guild/members/' || n.actor_id::text
        when n.kind = 'member_pending' then '/guild/master#master-pending-members-title'
        when n.kind = 'profile_draft_waiting' then '/guild/me/status/draft'
        when n.kind in ('profile_draft_applied', 'profile_draft_declined') then '/guild/members/' || n.actor_id::text
        when n.quest_id is not null then '/guild/quests/' || n.quest_id::text
        else '/guild/notifications' end as href,
      n.created_at as occurred_at
    from sakaba.notifications n
    left join sakaba.quests q on q.id = n.quest_id
    left join sakaba.guild_profiles ap on ap.guild_id = n.guild_id and ap.user_id = n.actor_id
    left join sakaba.quest_applications qa on qa.quest_id = n.quest_id and qa.user_id = n.actor_id
    where n.created_at >= now() - interval '2 days'
      and (n.kind <> 'quest_applied' or qa.status = 'applied')
    union all
    select 'task:' || t.id::text || ':' || d.day::text, p.guild_id, coalesce(t.assignee_id, p.owner_id), 'deadlines',
      '担当タスクの期限が明日です', '/guild/projects/' || t.project_id::text, now()
    from sakaba.project_tasks t
    join sakaba.projects p on p.id = t.project_id
    cross join tomorrow d
    where t.status = 'todo' and p.status = 'active' and t.due_date = d.day
      and (t.assignee_id is null or t.assignee_id = p.owner_id or exists (
        select 1 from sakaba.project_members pm where pm.project_id = p.id and pm.user_id = t.assignee_id
      ))
      and extract(hour from now() at time zone 'Asia/Tokyo') >= 9
    union all
    select 'project:' || p.id::text || ':' || d.day::text, p.guild_id, m.user_id, 'deadlines',
      '参加中のプロジェクトの期限が明日です', '/guild/projects/' || p.id::text, now()
    from sakaba.projects p
    cross join tomorrow d
    cross join lateral (
      select p.owner_id as user_id union select pm.user_id from sakaba.project_members pm where pm.project_id = p.id
    ) m
    where p.status = 'active' and p.due_date = d.day
      and extract(hour from now() at time zone 'Asia/Tokyo') >= 9
    union all
    select 'quest:' || q.id::text || ':' || d.day::text, q.guild_id, m.user_id, 'deadlines',
      '関係するクエストの申込締切が明日です', '/guild/quests/' || q.id::text, now()
    from sakaba.quests q
    cross join tomorrow d
    cross join lateral (
      select q.creator_id as user_id union select a.user_id from sakaba.quest_applications a
      where a.quest_id = q.id and a.status = 'applied'
    ) m
    where q.status = 'open' and q.deadline = d.day
      and extract(hour from now() at time zone 'Asia/Tokyo') >= 9
  )
  -- 行き先は、その知らせ・期限のある店の道にする（/guild/requests → /guild/<店>/requests）
  select c.event_key, c.user_id, c.category, c.body,
    '/guild/' || g.slug || substr(c.href, length('/guild/')) as href,
    c.occurred_at
  from candidates c
  join sakaba.guilds g on g.id = c.guild_id
  join sakaba.guild_members gm on gm.guild_id = c.guild_id and gm.user_id = c.user_id and gm.suspended_at is null;
$function$
;

create or replace function sakaba.gathering_schedule_json(p_quest sakaba.quests, p_user_id uuid, p_viewer text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'sakaba'
AS $function$
  select jsonb_build_object(
    'decided_option_id', p_quest.schedule_decided_option_id,
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'starts_at', o.starts_at,
        'yes', (select count(*) from sakaba.quest_schedule_answers a where a.option_id = o.id and a.answer = 'yes'),
        'maybe', (select count(*) from sakaba.quest_schedule_answers a where a.option_id = o.id and a.answer = 'maybe'),
        'no', (select count(*) from sakaba.quest_schedule_answers a where a.option_id = o.id and a.answer = 'no')
      ) order by o.starts_at)
      from sakaba.quest_schedule_options o where o.quest_id = p_quest.id
    ), '[]'::jsonb),
    'respondents', case when p_viewer = 'guest' then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'is_me', r.user_id = p_user_id,
        'is_guest', r.is_guest,
        'name', case
          when r.user_id = p_user_id or not r.is_guest or p_viewer = 'host'
            then coalesce(case when r.is_guest then gp.display_name else pr.display_name end, '（名前なし）')
          else 'ゲスト' end,
        'comment', r.comment,
        'answers', coalesce((
          select jsonb_object_agg(a.option_id::text, a.answer)
          from sakaba.quest_schedule_answers a
          join sakaba.quest_schedule_options o on o.id = a.option_id
          where o.quest_id = p_quest.id and a.user_id = r.user_id
        ), '{}'::jsonb)
      ) order by r.updated_at)
      from sakaba.quest_schedule_respondents r
      left join sakaba.guild_profiles pr on pr.guild_id = p_quest.guild_id and pr.user_id = r.user_id
      left join sakaba.guest_profiles gp on gp.user_id = r.user_id
      where r.quest_id = p_quest.id
    ), '[]'::jsonb) end,
    'my_comment', (select r.comment from sakaba.quest_schedule_respondents r where r.quest_id = p_quest.id and r.user_id = p_user_id),
    'my_answers', coalesce((
      select jsonb_object_agg(a.option_id::text, a.answer)
      from sakaba.quest_schedule_answers a
      join sakaba.quest_schedule_options o on o.id = a.option_id
      where o.quest_id = p_quest.id and a.user_id = p_user_id
    ), '{}'::jsonb)
  );
$function$
;

create or replace function public.sakaba_list_intro_requests(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ir.id, 'requester_id', ir.requester_id, 'target_id', ir.target_id,
    'quest_id', ir.quest_id, 'purpose', ir.purpose,
    'message', ir.message,
    'status', shown.status, 'outcome', ir.outcome,
    'created_at', ir.created_at, 'updated_at', shown.updated_at,
    'expires_at', ir.expires_at,
    'accept_message', case when ir.status in ('accepted', 'introduced') then ir.accept_message else '' end,
    'other_contact', case
      when ir.status in ('accepted', 'introduced')
        and v_user_id in (ir.requester_id, ir.target_id)
        and sakaba.is_active_member(v_guild_id, ir.requester_id)
        and sakaba.is_active_member(v_guild_id, ir.target_id)
      then jsonb_build_object(
        'email', case when other_pc.email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then other_pc.email else '' end,
        'line_url', case when other_pc.line_url ~* '^https?://' then other_pc.line_url else '' end,
        'website_url', case when other_pc.website_url ~* '^https?://' then other_pc.website_url else '' end
      ) else null end
  ) order by shown.updated_at desc), '[]'::jsonb) into v_result
  from sakaba.intro_requests ir
  -- 申請した人には、相手が見送ったことが分からないようにする（期限までは「お返事待ち」、期限後は「取り下げ」）
  cross join lateral (
    select
      case
        when ir.status in ('proposed', 'declined_by_target') and ir.expires_at is not null and ir.expires_at <= now() then 'expired'
        when ir.status = 'declined_by_target' and v_user_id = ir.requester_id then 'proposed'
        else ir.status
      end as status,
      case
        when ir.status = 'declined_by_target' and v_user_id = ir.requester_id then coalesce(ir.proposed_at, ir.created_at)
        else ir.updated_at
      end as updated_at
  ) shown
  left join sakaba.profile_contacts other_pc on other_pc.guild_id = ir.guild_id and other_pc.user_id = case
    when v_user_id = ir.requester_id then ir.target_id
    when v_user_id = ir.target_id then ir.requester_id
    else null end
  where ir.guild_id = v_guild_id
    and v_user_id in (ir.requester_id, ir.target_id);
  return v_result;
end;
$function$
;

create or replace function public.sakaba_get_guest_gathering(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
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
  from sakaba.guild_profiles host where host.guild_id = v_quest.guild_id and host.user_id = v_quest.creator_id;
  return v_result;
end;
$function$
;

create or replace function public.sakaba_get_guest_gathering_members(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_can_view boolean;
  v_members jsonb;
  v_shown integer;
  v_total integer;
begin
  select q.* into v_quest
  from sakaba.quest_guest_links l join sakaba.quests q on q.id = l.quest_id
  where l.token = p_token and q.category = 'gathering' and not q.members_only and q.status <> 'withdrawn'
    and sakaba.is_active_member(q.guild_id, q.creator_id);
  if not found then return null; end if;
  v_can_view := v_user_id is not null and (
    sakaba.is_active_member(v_quest.guild_id, v_user_id)
    or exists (
      select 1 from sakaba.quest_guest_applications ga
      join auth.users u on u.id = ga.user_id and u.email_confirmed_at is not null
      where ga.quest_id = v_quest.id and ga.user_id = v_user_id and ga.status = 'applied'
    )
  );
  if not v_can_view then
    return jsonb_build_object('can_view', false, 'members', '[]'::jsonb, 'other_member_count', null);
  end if;
  select coalesce(jsonb_agg(m order by (m->>'is_host')::boolean desc, m->>'display_name'), '[]'::jsonb), count(*)
  into v_members, v_shown
  from (
    select jsonb_build_object(
      'id', p.user_id,
      'is_host', p.user_id = v_quest.creator_id,
      'display_name', p.display_name,
      'photo_url', p.photo_url,
      'job_icon', p.job_icon,
      'job', sakaba.if_field(gm.guild_id, 'job', p.job),
      'industry', sakaba.profile_industry(gm.guild_id, p.user_id),
      'region', sakaba.if_field(gm.guild_id, 'region', p.region),
      'headline', sakaba.if_field(gm.guild_id, 'headline', p.headline),
      'bio', case when 'work' = any(gm.visible_groups) then sakaba.if_field(gm.guild_id, 'bio', p.bio) else '' end,
      'values_text', case when 'values' = any(gm.visible_groups) then sakaba.if_field(gm.guild_id, 'values_text', p.values_text) else '' end,
      'looking_for', case when 'connect' = any(gm.visible_groups) then sakaba.if_field(gm.guild_id, 'looking_for', p.looking_for) else '' end,
      'introductions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'author_name', ap.display_name, 'body', mi.body, 'updated_at', mi.updated_at
        ) order by mi.updated_at desc)
        from sakaba.member_introductions mi
        join sakaba.guild_members agm on agm.guild_id = mi.guild_id and agm.user_id = mi.author_id and agm.suspended_at is null
        join sakaba.guild_profiles ap on ap.guild_id = mi.guild_id and ap.user_id = mi.author_id
        where mi.guild_id = v_quest.guild_id and mi.target_id = p.user_id
      ), '[]'::jsonb)
    ) as m
    from sakaba.guild_members gm
    join sakaba.guild_profiles p on p.guild_id = gm.guild_id and p.user_id = gm.user_id
    where gm.guild_id = v_quest.guild_id and gm.suspended_at is null
      and sakaba.is_shown_to_gathering_guests(v_quest, gm.user_id)
  ) shown;
  select count(*) into v_total from sakaba.guild_members gm
  where gm.guild_id = v_quest.guild_id and gm.suspended_at is null;
  return jsonb_build_object(
    'can_view', true,
    'members', v_members,
    'other_member_count', greatest(v_total - coalesce(v_shown, 0), 0)
  );
end;
$function$
;

create or replace function public.sakaba_list_business_cards(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'front', p.business_card_front, 'back', p.business_card_back))
    from sakaba.guild_members gm
    join sakaba.guild_profiles p on p.guild_id = gm.guild_id and p.user_id = gm.user_id
    where gm.guild_id = v_guild_id and gm.suspended_at is null
      and p.business_card_agreed_at is not null
      and (p.business_card_front is not null or p.business_card_back is not null)
  ), '[]'::jsonb);
end;
$function$
;

create or replace function public.sakaba_update_contact_visibility(p_guild_slug text, p_kind text, p_visibility text, p_value text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
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
    (guild_id, user_id, email, line_url, website_url, email_visibility, line_visibility, website_visibility)
  values (
    v_guild_id,
    v_user_id,
    case when p_kind = 'email' then v_value else '' end,
    case when p_kind = 'line' then v_value else '' end,
    case when p_kind = 'website' then v_value else '' end,
    case when p_kind = 'email' then p_visibility else 'approved' end,
    case when p_kind = 'line' then p_visibility else 'approved' end,
    case when p_kind = 'website' then p_visibility else 'approved' end
  )
  on conflict (guild_id, user_id) do update set
    email_visibility = case when p_kind = 'email' then p_visibility else pc.email_visibility end,
    line_visibility = case when p_kind = 'line' then p_visibility else pc.line_visibility end,
    website_visibility = case when p_kind = 'website' then p_visibility else pc.website_visibility end,
    email = case when p_kind = 'email' and p_value is not null then v_value else pc.email end,
    line_url = case when p_kind = 'line' and p_value is not null then v_value else pc.line_url end,
    website_url = case when p_kind = 'website' and p_value is not null then v_value else pc.website_url end;
end;
$function$
;

create or replace function public.sakaba_update_my_profile(p_guild_slug text, p_display_name text, p_photo_url text, p_headline text, p_job text, p_job_icon text, p_region text, p_bio text, p_can_help_with text, p_strengths text, p_values_text text, p_vision text, p_social_issue text, p_looking_for text, p_want_to_meet text, p_visible_groups text[], p_accept_intro boolean, p_company_name text, p_position text, p_show_company boolean, p_want_to_solve text, p_show_achievements boolean, p_email text DEFAULT ''::text, p_line_url text DEFAULT ''::text, p_website_url text DEFAULT ''::text, p_industry text DEFAULT ''::text, p_keywords text[] DEFAULT '{}'::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_tag_id uuid;
  v_keyword text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id
  from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if nullif(btrim(p_display_name), '') is null or char_length(btrim(p_display_name)) > 30 then
    raise exception 'display_name must be 1 to 30 characters' using errcode = '22023';
  end if;
  if nullif(btrim(p_company_name), '') is null or char_length(btrim(p_company_name)) > 60 then
    raise exception 'company_name must be 1 to 60 characters' using errcode = '22023';
  end if;
  if p_position not in ('ceo', 'officer', 'decider', 'other') then
    raise exception 'invalid position' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_want_to_solve, ''))) > 60 then
    raise exception 'want_to_solve must be at most 60 characters' using errcode = '22023';
  end if;
  if p_job_icon not in (
    'web', 'tax', 'build', 'food', 'marketing', 'realestate', 'legal',
    'design', 'teach', 'health', 'owner', 'retail', 'maker', 'beauty',
    'finance', 'logistics', 'care', 'hr', 'farm', 'other'
  ) then
    raise exception 'invalid job_icon' using errcode = '22023';
  end if;
  if not coalesce(p_visible_groups, '{}') <@ array['work', 'values', 'connect']::text[] then
    raise exception 'invalid visible_groups' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_strengths, ''))) > 200 then
    raise exception 'strengths must be at most 200 characters' using errcode = '22023';
  end if;
  if sakaba.is_paid_member(v_user_id)
     and char_length(btrim(coalesce(p_strengths, ''))) < 20 then
    raise exception 'paid members must provide strengths of at least 20 characters' using errcode = '22023';
  end if;
  update sakaba.guild_profiles
  set display_name = btrim(p_display_name),
      photo_url = nullif(btrim(coalesce(p_photo_url, '')), ''),
      headline = sakaba.if_field(v_guild_id, 'headline', btrim(coalesce(p_headline, ''))),
      job = sakaba.if_field(v_guild_id, 'job', btrim(coalesce(p_job, ''))),
      job_icon = p_job_icon,
      region = sakaba.if_field(v_guild_id, 'region', btrim(coalesce(p_region, ''))),
      bio = sakaba.if_field(v_guild_id, 'bio', btrim(coalesce(p_bio, ''))),
      can_help_with = sakaba.if_field(v_guild_id, 'can_help_with', btrim(coalesce(p_can_help_with, ''))),
      strengths = sakaba.if_field(v_guild_id, 'strengths', btrim(coalesce(p_strengths, ''))),
      values_text = sakaba.if_field(v_guild_id, 'values_text', btrim(coalesce(p_values_text, ''))),
      vision = sakaba.if_field(v_guild_id, 'vision', btrim(coalesce(p_vision, ''))),
      social_issue = sakaba.if_field(v_guild_id, 'social_issue', btrim(coalesce(p_social_issue, ''))),
      looking_for = sakaba.if_field(v_guild_id, 'looking_for', btrim(coalesce(p_looking_for, ''))),
      want_to_meet = sakaba.if_field(v_guild_id, 'want_to_meet', btrim(coalesce(p_want_to_meet, '')))
  where guild_id = v_guild_id and user_id = v_user_id;
  update sakaba.guild_members
  set visible_groups = coalesce(p_visible_groups, '{}'),
      accept_intro = p_accept_intro,
      company_name = btrim(p_company_name),
      position = p_position,
      show_company = p_show_company,
      want_to_solve = btrim(coalesce(p_want_to_solve, '')),
      show_achievements = p_show_achievements
  where guild_id = v_guild_id and user_id = v_user_id;
  insert into sakaba.profile_contacts (guild_id, user_id, email, line_url, website_url)
  values (
    v_guild_id,
    v_user_id,
    btrim(coalesce(p_email, '')),
    btrim(coalesce(p_line_url, '')),
    btrim(coalesce(p_website_url, ''))
  )
  on conflict (guild_id, user_id) do update
    set email = excluded.email,
        line_url = excluded.line_url,
        website_url = excluded.website_url;
  delete from sakaba.profile_tags pt where pt.guild_id = v_guild_id and pt.user_id = v_user_id;
  if nullif(btrim(coalesce(p_industry, '')), '') is not null and sakaba.guild_has_field(v_guild_id, 'industry') then
    insert into sakaba.tags (kind, name)
    values ('industry', btrim(p_industry))
    on conflict (kind, lower(name)) do update set is_active = true
    returning id into v_tag_id;
    insert into sakaba.profile_tags (guild_id, user_id, tag_id) values (v_guild_id, v_user_id, v_tag_id);
  end if;
  foreach v_keyword in array coalesce(p_keywords, '{}') loop
    if nullif(btrim(v_keyword), '') is not null and sakaba.guild_has_field(v_guild_id, 'industry') then
      insert into sakaba.tags (kind, name)
      values ('keyword', btrim(v_keyword))
      on conflict (kind, lower(name)) do update set is_active = true
      returning id into v_tag_id;
      insert into sakaba.profile_tags (guild_id, user_id, tag_id)
      values (v_guild_id, v_user_id, v_tag_id)
      on conflict do nothing;
    end if;
  end loop;
end;
$function$
;

create or replace function public.sakaba_decide_my_profile_draft(p_draft_id uuid, p_decision text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_row sakaba.profile_drafts%rowtype;
  v_profile sakaba.guild_profiles%rowtype;
  v_has_industry boolean;
  v_tag_id uuid;
  v_applied text[] := '{}';
  v_skipped text[] := '{}';
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('apply', 'edited', 'decline') then
    raise exception 'invalid decision' using errcode = '22023';
  end if;
  select d.* into v_row from sakaba.profile_drafts d where d.id = p_draft_id for update;
  -- 本人以外には、下書きがあるかどうかも教えない（同じ失敗にする）
  if not found or v_row.member_user_id is distinct from v_user_id
    or not sakaba.is_active_member(v_row.guild_id, v_user_id) then
    raise exception 'only the member can decide' using errcode = '42501';
  end if;
  if v_row.state <> 'waiting' then
    raise exception 'draft already decided' using errcode = '22023';
  end if;
  if p_decision = 'apply' then
    select p.* into v_profile from sakaba.guild_profiles p where p.guild_id = v_row.guild_id and p.user_id = v_user_id for update;
    select exists (
      select 1 from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
      where pt.guild_id = v_row.guild_id and pt.user_id = v_user_id and t.kind = 'industry'
    ) into v_has_industry;
    -- 空いている項目にだけ入れる。下書きが空の項目は触らない
    if btrim(v_row.headline) <> '' and sakaba.guild_has_field(v_row.guild_id, 'headline') then
      if btrim(v_profile.headline) = '' then v_applied := v_applied || 'headline'::text; else v_skipped := v_skipped || 'headline'::text; end if;
    end if;
    if btrim(v_row.region) <> '' and sakaba.guild_has_field(v_row.guild_id, 'region') then
      if btrim(v_profile.region) = '' then v_applied := v_applied || 'region'::text; else v_skipped := v_skipped || 'region'::text; end if;
    end if;
    if btrim(v_row.job) <> '' and sakaba.guild_has_field(v_row.guild_id, 'job') then
      if btrim(v_profile.job) = '' then v_applied := v_applied || 'job'::text; else v_skipped := v_skipped || 'job'::text; end if;
    end if;
    if btrim(v_row.bio) <> '' and sakaba.guild_has_field(v_row.guild_id, 'bio') then
      if btrim(v_profile.bio) = '' then v_applied := v_applied || 'bio'::text; else v_skipped := v_skipped || 'bio'::text; end if;
    end if;
    if btrim(v_row.values_text) <> '' and sakaba.guild_has_field(v_row.guild_id, 'values_text') then
      if btrim(v_profile.values_text) = '' then v_applied := v_applied || 'values_text'::text; else v_skipped := v_skipped || 'values_text'::text; end if;
    end if;
    if btrim(v_row.looking_for) <> '' and sakaba.guild_has_field(v_row.guild_id, 'looking_for') then
      if btrim(v_profile.looking_for) = '' then v_applied := v_applied || 'looking_for'::text; else v_skipped := v_skipped || 'looking_for'::text; end if;
    end if;
    if btrim(v_row.industry) <> '' and sakaba.guild_has_field(v_row.guild_id, 'industry') then
      if not v_has_industry then v_applied := v_applied || 'industry'::text; else v_skipped := v_skipped || 'industry'::text; end if;
    end if;
    update sakaba.guild_profiles set
      headline = case when 'headline' = any(v_applied) then btrim(v_row.headline) else headline end,
      region = case when 'region' = any(v_applied) then btrim(v_row.region) else region end,
      job = case when 'job' = any(v_applied) then btrim(v_row.job) else job end,
      bio = case when 'bio' = any(v_applied) then btrim(v_row.bio) else bio end,
      values_text = case when 'values_text' = any(v_applied) then btrim(v_row.values_text) else values_text end,
      looking_for = case when 'looking_for' = any(v_applied) then btrim(v_row.looking_for) else looking_for end
    where guild_id = v_row.guild_id and user_id = v_user_id;
    if 'industry' = any(v_applied) then
      insert into sakaba.tags (kind, name) values ('industry', btrim(v_row.industry))
      on conflict (kind, lower(name)) do update set is_active = true returning id into v_tag_id;
      insert into sakaba.profile_tags (guild_id, user_id, tag_id) values (v_row.guild_id, v_user_id, v_tag_id) on conflict do nothing;
    end if;
  end if;
  update sakaba.profile_drafts set
    state = case when p_decision = 'decline' then 'declined' else 'applied' end,
    decided_at = now(), updated_at = now(),
    headline = '', industry = '', region = '', job = '', bio = '', values_text = '', looking_for = ''
  where id = v_row.id;
  -- 書いた人へ。その人がもう会員でなくても、返事は止めない
  insert into sakaba.notifications (guild_id, user_id, kind, actor_id)
  select v_row.guild_id, v_row.drafted_by,
    case when p_decision = 'decline' then 'profile_draft_declined' else 'profile_draft_applied' end, v_user_id
  where exists (select 1 from sakaba.guild_profiles p where p.guild_id = v_row.guild_id and p.user_id = v_row.drafted_by);
  return jsonb_build_object('applied', to_jsonb(v_applied), 'skipped', to_jsonb(v_skipped));
end;
$function$
;

create or replace function public.sakaba_get_my_profile_draft(p_guild_slug text DEFAULT 'gia'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_row sakaba.profile_drafts%rowtype;
  v_profile sakaba.guild_profiles%rowtype;
  v_has_industry boolean;
  v_filled text[] := '{}';
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  select d.* into v_row from sakaba.profile_drafts d
  where d.guild_id = v_guild_id and d.member_user_id = v_user_id and d.state = 'waiting';
  if not found then return null; end if;
  select p.* into v_profile from sakaba.guild_profiles p where p.guild_id = v_guild_id and p.user_id = v_user_id;
  select exists (
    select 1 from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
    where pt.guild_id = v_guild_id and pt.user_id = v_user_id and t.kind = 'industry'
  ) into v_has_industry;
  if btrim(v_profile.headline) <> '' then v_filled := v_filled || 'headline'::text; end if;
  if v_has_industry then v_filled := v_filled || 'industry'::text; end if;
  if btrim(v_profile.region) <> '' then v_filled := v_filled || 'region'::text; end if;
  if btrim(v_profile.job) <> '' then v_filled := v_filled || 'job'::text; end if;
  if btrim(v_profile.bio) <> '' then v_filled := v_filled || 'bio'::text; end if;
  if btrim(v_profile.values_text) <> '' then v_filled := v_filled || 'values_text'::text; end if;
  if btrim(v_profile.looking_for) <> '' then v_filled := v_filled || 'looking_for'::text; end if;
  return jsonb_build_object(
    'id', v_row.id, 'created_at', v_row.created_at,
    'drafted_by_name', (select md.display_name from sakaba.member_display(v_guild_id, v_row.drafted_by) md),
    'fields', jsonb_build_object(
      'headline', v_row.headline, 'industry', v_row.industry, 'region', v_row.region, 'job', v_row.job,
      'bio', v_row.bio, 'values_text', v_row.values_text, 'looking_for', v_row.looking_for),
    'filled', to_jsonb(v_filled)
  );
end;
$function$
;

create or replace function sakaba._join_guild(p_code text, p_display_name text, p_company_name text, p_position text, p_show_company boolean, p_want_to_solve text DEFAULT ''::text, p_agreed boolean DEFAULT false, p_other_title text DEFAULT ''::text, p_other_work text DEFAULT ''::text, p_allow_blank_other boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_invite sakaba.invites%rowtype;
  v_existing sakaba.guild_members%rowtype;
  v_pending boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not p_agreed then
    raise exception 'guild promises must be accepted' using errcode = '22023';
  end if;
  if nullif(btrim(p_display_name), '') is null or char_length(btrim(p_display_name)) > 30 then
    raise exception 'display_name must be 1 to 30 characters' using errcode = '22023';
  end if;
  if nullif(btrim(p_company_name), '') is null or char_length(btrim(p_company_name)) > 60 then
    raise exception 'company_name must be 1 to 60 characters' using errcode = '22023';
  end if;
  if p_position not in ('ceo', 'officer', 'decider', 'other') then
    raise exception 'invalid position' using errcode = '22023';
  end if;
  -- 役職「その他」は、オーナーが承認するまで酒場に入れない（0126）
  v_pending := p_position = 'other';
  if char_length(btrim(coalesce(p_other_title, ''))) > 40 then
    raise exception 'other_position_title must be at most 40 characters' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_other_work, ''))) > 100 then
    raise exception 'other_work_summary must be at most 100 characters' using errcode = '22023';
  end if;
  if v_pending and not coalesce(p_allow_blank_other, false) and (
    nullif(btrim(coalesce(p_other_title, '')), '') is null or nullif(btrim(coalesce(p_other_work, '')), '') is null
  ) then
    raise exception 'other_position_title and other_work_summary are required' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_want_to_solve, ''))) > 60 then
    raise exception 'want_to_solve must be at most 60 characters' using errcode = '22023';
  end if;
  select i.* into v_invite
  from sakaba.invites i
  where lower(i.code) = lower(btrim(p_code))
  for update;
  if not found or v_invite.revoked_at is not null then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'invite expired' using errcode = '22023';
  end if;
  if v_invite.used_count >= v_invite.max_uses then
    raise exception 'invite used up' using errcode = '22023';
  end if;
  select gm.* into v_existing
  from sakaba.guild_members gm
  where gm.guild_id = v_invite.guild_id and gm.user_id = v_user_id;
  if found then
    -- 承認待ち・見送りの人が、もう一度入会を押したとき（0126）。停止中として扱って例外にしない
    if v_existing.approval_state is not null then
      return jsonb_build_object('joined', false, 'already_member', true, 'pending', true,
        'approval_state', v_existing.approval_state, 'guild_id', v_invite.guild_id);
    end if;
    if v_existing.suspended_at is not null then
      raise exception 'membership suspended' using errcode = '42501';
    end if;
    return jsonb_build_object('joined', false, 'already_member', true, 'guild_id', v_invite.guild_id);
  end if;
  -- 人ごとの行（ログインの付き添い）だけ作る。既にあれば触らない。名前などの中身は店の行（guild_members のトリガーが作る）
  insert into sakaba.profiles (user_id, display_name)
  values (v_user_id, btrim(p_display_name))
  on conflict (user_id) do nothing;
  insert into sakaba.guild_members (
    guild_id,
    user_id,
    company_name,
    position,
    show_company,
    want_to_solve,
    invite_id,
    promises_agreed_at,
    suspended_at,
    approval_state,
    other_position_title,
    other_work_summary
  ) values (
    v_invite.guild_id,
    v_user_id,
    btrim(p_company_name),
    p_position,
    p_show_company,
    btrim(coalesce(p_want_to_solve, '')),
    v_invite.id,
    now(),
    case when v_pending then now() end,
    case when v_pending then 'pending' end,
    case when v_pending then btrim(coalesce(p_other_title, '')) else '' end,
    case when v_pending then btrim(coalesce(p_other_work, '')) else '' end
  );
  -- どの店にもまだいなかった人は、入会画面で入れた名前を店の行の名前にする（ほかの店にいる人は前の店の名前のまま）
  update sakaba.guild_profiles gp set display_name = btrim(p_display_name)
  where gp.guild_id = v_invite.guild_id and gp.user_id = v_user_id
    and not exists (select 1 from sakaba.guild_profiles o where o.user_id = v_user_id and o.guild_id <> v_invite.guild_id);
  update sakaba.invites
  set used_count = used_count + 1
  where id = v_invite.id;
  return jsonb_build_object('joined', true, 'already_member', false, 'pending', v_pending, 'guild_id', v_invite.guild_id);
end;
$function$
;

notify pgrst, 'reload schema';
