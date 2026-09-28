-- 連絡先を「種類を選んで追加」できる形にする（2026-09-28 五島さん。Codex の途中作業 contact-items を引き継いだ）。
-- ・種類：メール・LINE・Instagram・X・Facebook・Threads・note・ウェブサイト・その他。10件まで。
-- ・公開範囲は1件ごと：members＝会員全員／approved＝承認した人だけ（つながり申請を承諾し合った相手）／private＝非公開。
--   「承認した人だけ」は、承認前は種類（Instagram など）があることだけ見えて、URL・アドレスは渡らない。
-- ・新しい保存場所は profile_contact_items。古い profile_contacts は、古い読み手（プロフィールの追加情報・
--   つながり申請の一覧）のために、保存のたびに新しい内容から作り直す（非公開にした値が古い経路で漏れないように）。
-- ・プロフィールの保存（sakaba_update_my_profile_simple）は 0095 の本体を写し、連絡先を書く行だけ外した。
-- ・古い公開範囲の変更（sakaba_update_contact_visibility）は画面から使わなくなるので、呼べないようにする。

create table sakaba.profile_contact_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  kind text not null,
  label varchar(40) not null default '',
  value varchar(300) not null,
  visibility text not null default 'approved',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_contact_items_kind_check check (kind in ('email', 'line', 'instagram', 'x', 'facebook', 'threads', 'note', 'website', 'other')),
  constraint profile_contact_items_visibility_check check (visibility in ('members', 'approved', 'private')),
  constraint profile_contact_items_value_check check (btrim(value) <> ''),
  constraint profile_contact_items_other_label_check check (kind <> 'other' or btrim(label) <> '')
);
create index profile_contact_items_user_idx on sakaba.profile_contact_items (user_id, sort_order);
alter table sakaba.profile_contact_items enable row level security;
revoke all on sakaba.profile_contact_items from public, anon, authenticated;

-- 今の3項目（メール・LINE・ウェブサイト）を、公開範囲ごと移す（空のものは移さない）
insert into sakaba.profile_contact_items (user_id, kind, value, visibility, sort_order)
select pc.user_id, c.kind, btrim(c.value), coalesce(c.visibility, 'approved'), c.ord
from sakaba.profile_contacts pc
cross join lateral (values
  ('email', pc.email, pc.email_visibility, 0),
  ('line', pc.line_url, pc.line_visibility, 1),
  ('website', pc.website_url, pc.website_visibility, 2)
) as c(kind, value, visibility, ord)
where btrim(coalesce(c.value, '')) <> ''
  and (c.kind = 'email' and btrim(c.value) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or c.kind <> 'email' and btrim(c.value) ~* '^https?://');

-- 見る人と持ち主が、つながり申請を承諾し合っているか（どちら向きでも。2人とも在籍中）
create or replace function sakaba.is_connected(p_viewer uuid, p_owner uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select p_viewer is not null and p_owner is not null and exists (
    select 1 from sakaba.intro_requests ir
    where ir.status in ('accepted', 'introduced')
      and ((ir.requester_id = p_viewer and ir.target_id = p_owner) or (ir.requester_id = p_owner and ir.target_id = p_viewer))
      and sakaba.is_active_member(ir.guild_id, p_viewer)
      and sakaba.is_active_member(ir.guild_id, p_owner)
  );
$$;
revoke all on function sakaba.is_connected(uuid, uuid) from public, anon, authenticated;

-- 本人：連絡先を丸ごと保存する。p_items は [{kind, label, value, visibility}, ...]（並び順＝表示順）
create or replace function public.sakaba_save_my_contact_items(p_items jsonb)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_kind text;
  v_label text;
  v_value text;
  v_visibility text;
  v_index integer := 0;
begin
  if v_user_id is null or not sakaba.shares_active_guild(v_user_id, v_user_id) then
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

  delete from sakaba.profile_contact_items where user_id = v_user_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into sakaba.profile_contact_items (user_id, kind, label, value, visibility, sort_order)
    values (v_user_id, v_item->>'kind', case when v_item->>'kind' = 'other' then btrim(coalesce(v_item->>'label', '')) else '' end,
            btrim(v_item->>'value'), coalesce(v_item->>'visibility', 'approved'), v_index);
    v_index := v_index + 1;
  end loop;

  -- 古い読み手のために、古い保存場所を新しい内容から作り直す。
  -- 非公開のものは空にする（古い経路で非公開の値が渡らないように）。種類ごとに最初の1件だけ
  insert into sakaba.profile_contacts (user_id, email, line_url, website_url, email_visibility, line_visibility, website_visibility)
  select v_user_id,
    coalesce((select i.value from sakaba.profile_contact_items i where i.user_id = v_user_id and i.kind = 'email' and i.visibility <> 'private' order by i.sort_order limit 1), ''),
    coalesce((select i.value from sakaba.profile_contact_items i where i.user_id = v_user_id and i.kind = 'line' and i.visibility <> 'private' order by i.sort_order limit 1), ''),
    coalesce((select i.value from sakaba.profile_contact_items i where i.user_id = v_user_id and i.kind = 'website' and i.visibility <> 'private' order by i.sort_order limit 1), ''),
    coalesce((select i.visibility from sakaba.profile_contact_items i where i.user_id = v_user_id and i.kind = 'email' and i.visibility <> 'private' order by i.sort_order limit 1), 'approved'),
    coalesce((select i.visibility from sakaba.profile_contact_items i where i.user_id = v_user_id and i.kind = 'line' and i.visibility <> 'private' order by i.sort_order limit 1), 'approved'),
    coalesce((select i.visibility from sakaba.profile_contact_items i where i.user_id = v_user_id and i.kind = 'website' and i.visibility <> 'private' order by i.sort_order limit 1), 'approved')
  on conflict (user_id) do update set
    email = excluded.email, line_url = excluded.line_url, website_url = excluded.website_url,
    email_visibility = excluded.email_visibility, line_visibility = excluded.line_visibility,
    website_visibility = excluded.website_visibility, updated_at = now();
end;
$$;

-- 会員：人ごとの連絡先。本人には全部（公開範囲つき）。ほかの人には
-- 「会員全員」はそのまま、「承認した人だけ」は承諾し合った相手にだけ値を渡し、それ以外は種類だけ（value は null）、
-- 「非公開」は出さない。見る人と同じギルドに在籍していない人の分は返さない。
create or replace function public.sakaba_get_contact_items(p_user_ids uuid[])
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null or not sakaba.shares_active_guild(v_viewer, v_viewer) then
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
            when i.visibility = 'approved' and sakaba.is_connected(v_viewer, o.owner_id) then i.value
            else null end,
          'visibility', case when o.owner_id = v_viewer then i.visibility else null end,
          'locked', o.owner_id <> v_viewer and i.visibility = 'approved' and not sakaba.is_connected(v_viewer, o.owner_id)
        ) order by i.sort_order)
        from sakaba.profile_contact_items i
        where i.user_id = o.owner_id and (o.owner_id = v_viewer or i.visibility <> 'private')
      ), '[]'::jsonb) as items
      from (select distinct unnest(p_user_ids) as owner_id) o
      where o.owner_id = v_viewer or sakaba.shares_active_guild(v_viewer, o.owner_id)
    ) per_owner
  ), '{}'::jsonb);
end;
$$;

revoke all on function public.sakaba_save_my_contact_items(jsonb) from public, anon;
revoke all on function public.sakaba_get_contact_items(uuid[]) from public, anon;
grant execute on function public.sakaba_save_my_contact_items(jsonb) to authenticated;
grant execute on function public.sakaba_get_contact_items(uuid[]) to authenticated;

-- 古い公開範囲の変更は画面から使わなくなるので、呼べないようにする（新しい保存と食い違わないように）
revoke all on function public.sakaba_update_contact_visibility(text, text, text, text) from public, anon, authenticated;

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

  -- 連絡先はここでは書かない（0113 から sakaba_save_my_contact_items だけが書く。
  -- p_email・p_line_url・p_website_url は古い画面との互換のため引数に残すが、使わない）

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

notify pgrst, 'reload schema';
