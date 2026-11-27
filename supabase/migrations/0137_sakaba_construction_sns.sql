-- 建設・不動産の酒場のDB基盤（0136まで適用済みのGIA Supabase用）
-- 新しい表は直接公開せず、既存の店への所属と公開範囲をRPCで確認する。
begin;

do $$
begin
  if to_regclass('sakaba.guild_profiles') is null then
    raise exception '先に店別プロフィール（0134以降）を適用してください';
  end if;
  if not exists (select 1 from sakaba.guilds where slug = 'kensetsu-fudosan') then
    raise exception '先に建設・不動産の酒場の店舗設定を適用してください';
  end if;
end;
$$;

create table sakaba.construction_prefectures (
  name text primary key
);

insert into sakaba.construction_prefectures (name)
select unnest(string_to_array(
  '北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県', ' '
));

create table sakaba.construction_companies (
  guild_id uuid not null references sakaba.guilds (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  owner_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  prefecture text not null references sakaba.construction_prefectures (name),
  industries text[] not null check (
    cardinality(industries) between 1 and 4 and array_position(industries, null) is null
    and industries <@ array['建設', '不動産', '士業', 'その他']
  ),
  business text not null default '' check (char_length(business) <= 600),
  website text not null default '' check (website = '' or (char_length(website) <= 500 and website ~ '^https?://[^[:space:]]+$')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (guild_id, id),
  unique (guild_id, owner_id),
  foreign key (guild_id, owner_id) references sakaba.guild_members (guild_id, user_id) on delete cascade
);

create table sakaba.construction_company_affiliations (
  guild_id uuid not null,
  company_id uuid not null,
  user_id uuid not null,
  title text not null default '' check (char_length(title) <= 80),
  started_at timestamptz not null default now(),
  ended_at timestamptz check (ended_at >= started_at),
  primary key (guild_id, user_id, started_at),
  foreign key (guild_id, company_id) references sakaba.construction_companies (guild_id, id) on delete cascade,
  foreign key (guild_id, user_id) references sakaba.guild_members (guild_id, user_id) on delete cascade
);

create unique index construction_affiliation_current_idx
  on sakaba.construction_company_affiliations (guild_id, user_id) where ended_at is null;

create index construction_affiliation_company_idx
  on sakaba.construction_company_affiliations (guild_id, company_id) where ended_at is null;

create table sakaba.construction_company_areas (
  guild_id uuid not null,
  company_id uuid not null,
  prefecture text not null references sakaba.construction_prefectures (name),
  primary key (guild_id, company_id, prefecture),
  foreign key (guild_id, company_id) references sakaba.construction_companies (guild_id, id) on delete cascade
);

create table sakaba.construction_company_licenses (
  guild_id uuid not null,
  company_id uuid not null,
  kind text not null check (char_length(btrim(kind)) between 1 and 80),
  issuer text not null check (char_length(btrim(issuer)) between 1 and 100),
  number text not null check (char_length(btrim(number)) between 1 and 80),
  verified_at timestamptz,
  primary key (guild_id, company_id, kind, issuer, number),
  foreign key (guild_id, company_id) references sakaba.construction_companies (guild_id, id) on delete cascade
);

create table sakaba.construction_connections (
  guild_id uuid not null,
  id uuid not null default gen_random_uuid(),
  user_low uuid not null,
  user_high uuid not null,
  requested_by uuid not null check (requested_by in (user_low, user_high)),
  status text not null default 'pending' check (status in ('pending', 'connected', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (guild_id, user_low, user_high),
  unique (guild_id, id),
  check (user_low < user_high),
  foreign key (guild_id, user_low) references sakaba.guild_members (guild_id, user_id) on delete cascade,
  foreign key (guild_id, user_high) references sakaba.guild_members (guild_id, user_id) on delete cascade
);

create index construction_connections_high_idx
  on sakaba.construction_connections (guild_id, user_high, status);

create table sakaba.construction_network_preferences (
  guild_id uuid not null,
  user_id uuid not null,
  level text not null check (level in ('open', 'intro', 'masked', 'hidden')),
  primary key (guild_id, user_id),
  foreign key (guild_id, user_id) references sakaba.guild_members (guild_id, user_id) on delete cascade
);

create table sakaba.construction_network_overrides (
  guild_id uuid not null,
  owner_id uuid not null,
  friend_id uuid not null,
  level text not null check (level in ('open', 'intro', 'masked', 'hidden')),
  primary key (guild_id, owner_id, friend_id),
  check (owner_id <> friend_id),
  foreign key (guild_id, owner_id) references sakaba.guild_members (guild_id, user_id) on delete cascade,
  foreign key (guild_id, friend_id) references sakaba.guild_members (guild_id, user_id) on delete cascade
);

create table sakaba.construction_posts (
  guild_id uuid not null,
  id uuid not null default gen_random_uuid(),
  author_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  category text not null check (category in ('request-work', 'offer-property', 'seek-property', 'seek-partner', 'other')),
  industry text not null check (industry in ('建設', '不動産', '士業', 'その他')),
  body text not null check (char_length(btrim(body)) between 1 and 600),
  contact text not null check (char_length(btrim(contact)) between 1 and 300),
  deadline date,
  visibility text not null check (visibility in ('friends', 'friends2')),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (guild_id, id),
  foreign key (guild_id, author_id) references sakaba.guild_members (guild_id, user_id) on delete cascade
);

create index construction_posts_feed_idx
  on sakaba.construction_posts (guild_id, created_at desc, id) where withdrawn_at is null;

create table sakaba.construction_post_areas (
  guild_id uuid not null,
  post_id uuid not null,
  prefecture text not null references sakaba.construction_prefectures (name),
  primary key (guild_id, post_id, prefecture),
  foreign key (guild_id, post_id) references sakaba.construction_posts (guild_id, id) on delete cascade
);

create index construction_post_areas_prefecture_idx
  on sakaba.construction_post_areas (guild_id, prefecture, post_id);

create table sakaba.construction_post_replies (
  guild_id uuid not null,
  post_id uuid not null,
  author_id uuid not null,
  kind text not null check (kind in ('can', 'know')),
  note text not null check (char_length(btrim(note)) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (guild_id, post_id, author_id, kind),
  foreign key (guild_id, post_id) references sakaba.construction_posts (guild_id, id) on delete cascade,
  foreign key (guild_id, author_id) references sakaba.guild_members (guild_id, user_id) on delete cascade
);

create table sakaba.construction_introductions (
  guild_id uuid not null,
  id uuid not null default gen_random_uuid(),
  requester_id uuid not null,
  introducer_id uuid not null,
  target_id uuid not null,
  masked_for_requester boolean not null,
  note text not null check (char_length(btrim(note)) between 1 and 200),
  status text not null default 'requested' check (
    status in ('requested', 'asking_target', 'connected', 'declined_by_introducer', 'declined_by_target')
  ),
  fee_kind text,
  fee_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (guild_id, id),
  check (requester_id <> introducer_id and introducer_id <> target_id and requester_id <> target_id),
  check ((
    (status in ('requested', 'declined_by_introducer') and fee_kind is null and fee_value is null)
    or (status in ('asking_target', 'connected', 'declined_by_target') and (
      (fee_kind in ('none', 'discuss') and fee_value is null)
      or (fee_kind = 'fixed' and fee_value between 1 and 10000000 and fee_value = trunc(fee_value))
      or (fee_kind = 'percent' and fee_value between 0.1 and 50)
    ))
  ) is true),
  foreign key (guild_id, requester_id) references sakaba.guild_members (guild_id, user_id) on delete cascade,
  foreign key (guild_id, introducer_id) references sakaba.guild_members (guild_id, user_id) on delete cascade,
  foreign key (guild_id, target_id) references sakaba.guild_members (guild_id, user_id) on delete cascade
);

create unique index construction_intro_open_idx
  on sakaba.construction_introductions (guild_id, requester_id, introducer_id, target_id)
  where status in ('requested', 'asking_target');

create index construction_intro_introducer_idx
  on sakaba.construction_introductions (guild_id, introducer_id, updated_at desc);
create index construction_intro_target_idx
  on sakaba.construction_introductions (guild_id, target_id, updated_at desc);

create table sakaba.construction_intro_events (
  guild_id uuid not null,
  introduction_id uuid not null,
  status text not null check (
    status in ('requested', 'asking_target', 'connected', 'declined_by_introducer', 'declined_by_target')
  ),
  actor_id uuid not null,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  primary key (guild_id, introduction_id, status),
  foreign key (guild_id, introduction_id) references sakaba.construction_introductions (guild_id, id) on delete cascade,
  foreign key (guild_id, actor_id) references sakaba.guild_members (guild_id, user_id) on delete cascade
);

-- 認証済みクライアントの入口は public のRPCに限定する。
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'construction_prefectures', 'construction_companies', 'construction_company_affiliations',
    'construction_company_areas', 'construction_company_licenses', 'construction_connections',
    'construction_network_preferences', 'construction_network_overrides', 'construction_posts',
    'construction_post_areas', 'construction_post_replies', 'construction_introductions',
    'construction_intro_events'
  ] loop
    execute format('alter table sakaba.%I enable row level security', v_table);
    execute format('revoke all on table sakaba.%I from public, anon, authenticated, service_role', v_table);
  end loop;
end;
$$;

create function sakaba.construction_require_member()
returns uuid
language plpgsql stable
set search_path = ''
as $$
declare
  v_guild uuid;
begin
  select g.id into v_guild from sakaba.guilds g where g.slug = 'kensetsu-fudosan';
  if sakaba.is_active_member(v_guild, auth.uid()) is not true then
    raise exception '建設・不動産の酒場の有効な会員資格が必要です' using errcode = '42501';
  end if;
  return v_guild;
end;
$$;

create function sakaba.construction_friends(p_guild uuid, p_user uuid)
returns table (friend_id uuid, connection_id uuid)
language sql stable
set search_path = ''
as $$
  select c.user_high, c.id
  from sakaba.construction_connections c
  where c.guild_id = p_guild and c.user_low = p_user and c.status = 'connected'
    and sakaba.is_active_member(p_guild, c.user_high)
  union all
  select c.user_low, c.id
  from sakaba.construction_connections c
  where c.guild_id = p_guild and c.user_high = p_user and c.status = 'connected'
    and sakaba.is_active_member(p_guild, c.user_low)
$$;

create function sakaba.construction_network_level(p_guild uuid, p_owner uuid, p_friend uuid)
returns text
language sql stable
set search_path = ''
as $$
  select coalesce(
    (select o.level from sakaba.construction_network_overrides o
     where o.guild_id = p_guild and o.owner_id = p_owner and o.friend_id = p_friend),
    (select n.level from sakaba.construction_network_preferences n where n.guild_id = p_guild and n.user_id = p_owner),
    'intro'
  )
$$;

create function sakaba.construction_can_read_post(p_guild uuid, p_author uuid, p_visibility text, p_viewer uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select sakaba.is_active_member(p_guild, p_viewer)
    and sakaba.is_active_member(p_guild, p_author)
    and (
      p_author = p_viewer
      or exists (select 1 from sakaba.construction_friends(p_guild, p_viewer) f where f.friend_id = p_author)
      or (p_visibility = 'friends2' and exists (
        select 1
        from sakaba.construction_friends(p_guild, p_viewer) first_hop
        cross join lateral sakaba.construction_friends(p_guild, first_hop.friend_id) second_hop
        where second_hop.friend_id = p_author
          and sakaba.construction_network_level(p_guild, first_hop.friend_id, p_author) in ('open', 'intro')
      ))
    )
$$;

revoke all on function sakaba.construction_require_member(),
  sakaba.construction_friends(uuid, uuid),
  sakaba.construction_network_level(uuid, uuid, uuid),
  sakaba.construction_can_read_post(uuid, uuid, text, uuid)
from public, anon, authenticated, service_role;

create function public.sakaba_construction_save_my_company(
  p_name text, p_prefecture text, p_industries text[], p_areas text[],
  p_business text default '', p_website text default '', p_title text default '', p_licenses jsonb default '[]'::jsonb
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
  v_company uuid;
begin
  if cardinality(p_areas) not between 1 and 47 or p_areas is null then
    raise exception '対応エリアを選んでください' using errcode = '22023';
  end if;
  if p_licenses is null or jsonb_typeof(p_licenses) <> 'array' then
    raise exception '許可・免許は配列で指定してください' using errcode = '22023';
  end if;
  if jsonb_array_length(p_licenses) > 30 then
    raise exception '許可・免許は30件までです' using errcode = '22023';
  end if;

  insert into sakaba.construction_companies as c (guild_id, owner_id, name, prefecture, industries, business, website)
  values (v_guild, v_user, btrim(p_name), p_prefecture, p_industries, btrim(p_business), btrim(p_website))
  on conflict (guild_id, owner_id) do update set
    name = excluded.name, prefecture = excluded.prefecture, industries = excluded.industries,
    business = excluded.business, website = excluded.website, updated_at = now()
  returning c.id into v_company;

  insert into sakaba.construction_company_affiliations as a (guild_id, company_id, user_id, title)
  values (v_guild, v_company, v_user, btrim(p_title))
  on conflict (guild_id, user_id) where ended_at is null do update set title = excluded.title
  where a.company_id = excluded.company_id;
  if not found then
    raise exception 'すでに別の会社に所属しています' using errcode = '23505';
  end if;

  delete from sakaba.construction_company_areas a where a.guild_id = v_guild and a.company_id = v_company;
  insert into sakaba.construction_company_areas (guild_id, company_id, prefecture)
  select distinct v_guild, v_company, a.prefecture from unnest(p_areas) a(prefecture);

  -- 内容の変わらない許可には確認日時を残す。新規・変更は本人申告として保存する。
  delete from sakaba.construction_company_licenses l
  where l.guild_id = v_guild and l.company_id = v_company
    and not exists (
      select 1 from jsonb_to_recordset(p_licenses) x(kind text, issuer text, number text)
      where (l.kind, l.issuer, l.number) = (btrim(x.kind), btrim(x.issuer), btrim(x.number))
    );
  insert into sakaba.construction_company_licenses (guild_id, company_id, kind, issuer, number)
  select v_guild, v_company, btrim(x.kind), btrim(x.issuer), btrim(x.number)
  from jsonb_to_recordset(p_licenses) x(kind text, issuer text, number text)
  on conflict do nothing;
  return v_company;
end;
$$;

create function public.sakaba_construction_list_companies()
returns table (
  id uuid, name text, prefecture text, industries text[], business text, website text,
  areas text[], licenses jsonb, members jsonb
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
begin
  return query
  select c.id, c.name, c.prefecture, c.industries, c.business, c.website,
    array(select a.prefecture from sakaba.construction_company_areas a
          where a.guild_id = c.guild_id and a.company_id = c.id order by a.prefecture),
    coalesce((select jsonb_agg(jsonb_build_object(
      'kind', l.kind, 'issuer', l.issuer, 'number', l.number, 'verified', l.verified_at is not null
    ) order by l.kind, l.issuer, l.number)
    from sakaba.construction_company_licenses l where l.guild_id = c.guild_id and l.company_id = c.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'title', a.title) order by a.started_at)
    from sakaba.construction_company_affiliations a
    join sakaba.guild_members m on (m.guild_id, m.user_id) = (a.guild_id, a.user_id)
    where a.guild_id = c.guild_id and a.company_id = c.id and a.ended_at is null
      and m.suspended_at is null and (m.show_company or m.user_id = auth.uid())), '[]'::jsonb)
  from sakaba.construction_companies c where c.guild_id = v_guild
    and sakaba.is_active_member(v_guild, c.owner_id)
  order by c.name, c.id;
end;
$$;

create function public.sakaba_construction_request_connection(p_target_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if p_target_id is null or p_target_id = v_user or not sakaba.is_active_member(v_guild, p_target_id) then
    raise exception 'この相手につながりを申請できません' using errcode = '42501';
  end if;
  insert into sakaba.construction_connections as c (guild_id, user_low, user_high, requested_by)
  values (v_guild, least(v_user, p_target_id), greatest(v_user, p_target_id), v_user)
  on conflict (guild_id, user_low, user_high) do nothing returning c.id into v_id;
  if v_id is null then
    select c.id into v_id from sakaba.construction_connections c
    where c.guild_id = v_guild and c.user_low = least(v_user, p_target_id) and c.user_high = greatest(v_user, p_target_id);
  end if;
  return v_id;
end;
$$;

create function public.sakaba_construction_answer_connection(p_connection_id uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
begin
  if p_accept is null then
    raise exception '承認または辞退を選んでください' using errcode = '22023';
  end if;
  update sakaba.construction_connections c
  set status = case when p_accept then 'connected' else 'declined' end, updated_at = now()
  where c.guild_id = v_guild and c.id = p_connection_id and c.status = 'pending'
    and v_user in (c.user_low, c.user_high) and v_user <> c.requested_by
    and sakaba.is_active_member(v_guild, c.requested_by);
  if not found then
    raise exception 'この申請に返事できません' using errcode = '42501';
  end if;
end;
$$;

create function public.sakaba_construction_list_my_connections()
returns table (id uuid, friend_id uuid, requested_by uuid, status text)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
begin
  return query
  select c.id, other.friend_id, c.requested_by, c.status
  from sakaba.construction_connections c
  cross join lateral (select case when c.user_low = v_user then c.user_high else c.user_low end as friend_id) other
  where c.guild_id = v_guild and v_user in (c.user_low, c.user_high)
    and sakaba.is_active_member(v_guild, other.friend_id)
  order by c.updated_at desc, c.id;
end;
$$;

create function public.sakaba_construction_set_network_visibility(p_level text, p_friend_id uuid default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
begin
  if p_friend_id is null then
    if p_level is null then
      delete from sakaba.construction_network_preferences n where n.guild_id = v_guild and n.user_id = v_user;
    else
      insert into sakaba.construction_network_preferences (guild_id, user_id, level) values (v_guild, v_user, p_level)
      on conflict (guild_id, user_id) do update set level = excluded.level;
    end if;
  else
    if not exists (select 1 from sakaba.construction_friends(v_guild, v_user) f where f.friend_id = p_friend_id) then
      raise exception 'この知り合いの公開設定は変更できません' using errcode = '42501';
    end if;
    if p_level is null then
      delete from sakaba.construction_network_overrides o
      where o.guild_id = v_guild and o.owner_id = v_user and o.friend_id = p_friend_id;
    else
      insert into sakaba.construction_network_overrides (guild_id, owner_id, friend_id, level)
      values (v_guild, v_user, p_friend_id, p_level)
      on conflict (guild_id, owner_id, friend_id) do update set level = excluded.level;
    end if;
  end if;
end;
$$;

create function public.sakaba_construction_get_network_visibility()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
begin
  return jsonb_build_object(
    'default_level', coalesce((select n.level from sakaba.construction_network_preferences n
      where n.guild_id = v_guild and n.user_id = v_user), 'intro'),
    'overrides', coalesce((select jsonb_object_agg(o.friend_id, o.level)
      from sakaba.construction_network_overrides o
      join sakaba.construction_friends(v_guild, v_user) f on f.friend_id = o.friend_id
      where o.guild_id = v_guild and o.owner_id = v_user), '{}'::jsonb)
  );
end;
$$;

create function public.sakaba_construction_create_post(
  p_title text, p_category text, p_industry text, p_body text, p_contact text, p_prefectures text[],
  p_visibility text default 'friends2', p_deadline date default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_id uuid;
begin
  if p_prefectures is null or cardinality(p_prefectures) not between 1 and 47 then
    raise exception '対象の都道府県を選んでください' using errcode = '22023';
  end if;
  if p_deadline < (now() at time zone 'Asia/Tokyo')::date then
    raise exception '返事の期限は今日以降にしてください' using errcode = '22023';
  end if;
  insert into sakaba.construction_posts (guild_id, author_id, title, category, industry, body, contact, deadline, visibility)
  values (v_guild, auth.uid(), btrim(p_title), p_category, p_industry, btrim(p_body), btrim(p_contact), p_deadline, p_visibility)
  returning id into v_id;
  insert into sakaba.construction_post_areas (guild_id, post_id, prefecture)
  select distinct v_guild, v_id, a.prefecture from unnest(p_prefectures) a(prefecture);
  return v_id;
end;
$$;

create function public.sakaba_construction_list_posts(
  p_post_id uuid default null, p_category text default null, p_prefecture text default null, p_limit integer default 50
)
returns table (
  id uuid, author_id uuid, title text, category text, industry text, body text, contact text, deadline date,
  visibility text, areas text[], reply_count bigint, created_at timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
begin
  return query
  select p.id, p.author_id, p.title, p.category, p.industry, p.body, p.contact, p.deadline, p.visibility,
    array(select pa.prefecture from sakaba.construction_post_areas pa
          where pa.guild_id = p.guild_id and pa.post_id = p.id order by pa.prefecture),
    (select count(*) from sakaba.construction_post_replies r
     where r.guild_id = p.guild_id and r.post_id = p.id and sakaba.is_active_member(v_guild, r.author_id)),
    p.created_at
  from sakaba.construction_posts p
  where p.guild_id = v_guild and p.withdrawn_at is null and (p_post_id is null or p.id = p_post_id)
    and (p_category is null or p.category = p_category)
    and (p_prefecture is null or exists (
      select 1 from sakaba.construction_post_areas pa
      where pa.guild_id = p.guild_id and pa.post_id = p.id and pa.prefecture = p_prefecture
    ))
    and sakaba.construction_can_read_post(v_guild, p.author_id, p.visibility, v_user)
  order by p.created_at desc, p.id
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

create function public.sakaba_construction_withdraw_post(p_post_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
begin
  update sakaba.construction_posts p
  set withdrawn_at = coalesce(p.withdrawn_at, now())
  where p.guild_id = v_guild and p.id = p_post_id and p.author_id = auth.uid();
  if not found then
    raise exception 'この案件は取り下げられません' using errcode = '42501';
  end if;
end;
$$;

create function public.sakaba_construction_reply(p_post_id uuid, p_kind text, p_note text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
begin
  perform 1 from sakaba.construction_posts p
  where p.guild_id = v_guild and p.id = p_post_id and p.withdrawn_at is null and p.author_id <> v_user
    and (p.deadline is null or p.deadline >= (now() at time zone 'Asia/Tokyo')::date)
    and sakaba.construction_can_read_post(v_guild, p.author_id, p.visibility, v_user)
  for update;
  if not found then
    raise exception 'この案件には返事できません' using errcode = '42501';
  end if;
  insert into sakaba.construction_post_replies (guild_id, post_id, author_id, kind, note)
  values (v_guild, p_post_id, v_user, p_kind, btrim(p_note))
  on conflict do nothing;
  return found;
end;
$$;

create function public.sakaba_construction_list_replies(p_post_id uuid)
returns table (author_id uuid, kind text, note text, created_at timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
begin
  return query select r.author_id, r.kind, r.note, r.created_at
  from sakaba.construction_post_replies r
  join sakaba.construction_posts p on (p.guild_id, p.id) = (r.guild_id, r.post_id)
  where r.guild_id = v_guild and r.post_id = p_post_id and p.withdrawn_at is null
    and sakaba.construction_can_read_post(v_guild, p.author_id, p.visibility, auth.uid())
    and sakaba.is_active_member(v_guild, r.author_id)
  order by r.created_at, r.author_id, r.kind;
end;
$$;

-- Aから見たBの紹介候補。伏せた相手の識別子はDB内部だけで扱う。
create function sakaba.construction_intro_candidates(p_guild uuid, p_viewer uuid, p_introducer uuid)
returns table (connection_id uuid, target_id uuid, level text)
language sql stable
set search_path = ''
as $$
  select f.connection_id, f.friend_id, setting.level
  from sakaba.construction_friends(p_guild, p_introducer) f
  join sakaba.guild_members m on m.guild_id = p_guild and m.user_id = f.friend_id and m.accept_intro
  cross join lateral (select sakaba.construction_network_level(p_guild, p_introducer, f.friend_id) as level) setting
  where setting.level <> 'hidden' and f.friend_id <> p_viewer
    and exists (select 1 from sakaba.construction_friends(p_guild, p_viewer) a where a.friend_id = p_introducer)
    and not exists (select 1 from sakaba.construction_friends(p_guild, p_viewer) a where a.friend_id = f.friend_id)
$$;
revoke all on function sakaba.construction_intro_candidates(uuid, uuid, uuid) from public, anon, authenticated, service_role;

create function public.sakaba_construction_list_intro_candidates(p_introducer_id uuid)
returns table (route_id uuid, target_id uuid, masked boolean, label text)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
begin
  return query
  select c.connection_id, case when c.level <> 'masked' then c.target_id end, c.level = 'masked',
    case
      when c.level <> 'masked' then p.display_name::text
      when p.industry in ('建設', '不動産', '士業') then p.industry
      else '氏名非公開'
    end
  from sakaba.construction_intro_candidates(v_guild, auth.uid(), p_introducer_id) c
  join sakaba.guild_profiles p on p.guild_id = v_guild and p.user_id = c.target_id
  order by 4, 1;
end;
$$;

create function public.sakaba_construction_request_intro(p_introducer_id uuid, p_route_id uuid, p_note text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
  v_target uuid;
  v_level text;
  v_id uuid;
begin
  select c.target_id, c.level into v_target, v_level
  from sakaba.construction_intro_candidates(v_guild, v_user, p_introducer_id) c where c.connection_id = p_route_id;
  if not found then
    raise exception 'この紹介は依頼できません' using errcode = '42501';
  end if;
  insert into sakaba.construction_introductions (guild_id, requester_id, introducer_id, target_id, masked_for_requester, note)
  values (v_guild, v_user, p_introducer_id, v_target, v_level = 'masked', btrim(p_note))
  returning id into v_id;
  insert into sakaba.construction_intro_events (guild_id, introduction_id, status, actor_id, note)
  values (v_guild, v_id, 'requested', v_user, btrim(p_note));
  return v_id;
end;
$$;

create function public.sakaba_construction_answer_intro(
  p_introduction_id uuid, p_accept boolean, p_note text default '', p_fee_kind text default null, p_fee_value numeric default null
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
  v_request sakaba.construction_introductions%rowtype;
  v_next text;
begin
  if p_accept is null then
    raise exception '承認または辞退を選んでください' using errcode = '22023';
  end if;
  select i.* into v_request from sakaba.construction_introductions i
  where i.guild_id = v_guild and i.id = p_introduction_id
    and ((i.status = 'requested' and i.introducer_id = v_user) or (i.status = 'asking_target' and i.target_id = v_user))
    and sakaba.is_active_member(v_guild, i.requester_id) and sakaba.is_active_member(v_guild, i.introducer_id)
    and sakaba.is_active_member(v_guild, i.target_id)
  for update;
  if not found then
    raise exception 'この紹介に返事できません' using errcode = '42501';
  end if;

  if v_request.status = 'requested' then
    if p_accept and not exists (
      select 1 from sakaba.construction_intro_candidates(v_guild, v_request.requester_id, v_request.introducer_id) c
      where c.target_id = v_request.target_id
    ) then
      raise exception 'この紹介経路は利用できなくなりました' using errcode = '42501';
    end if;
    v_next := case when p_accept then 'asking_target' else 'declined_by_introducer' end;
    update sakaba.construction_introductions i set status = v_next, updated_at = now(),
      masked_for_requester = i.masked_for_requester or sakaba.construction_network_level(v_guild, i.introducer_id, i.target_id) = 'masked',
      fee_kind = case when p_accept then p_fee_kind end, fee_value = case when p_accept then p_fee_value end
    where i.guild_id = v_guild and i.id = p_introduction_id;
  else
    v_next := case when p_accept then 'connected' else 'declined_by_target' end;
    update sakaba.construction_introductions i set status = v_next, updated_at = now()
    where i.guild_id = v_guild and i.id = p_introduction_id;
    if p_accept then
      insert into sakaba.construction_connections as c (guild_id, user_low, user_high, requested_by, status)
      values (v_guild, least(v_request.requester_id, v_user), greatest(v_request.requester_id, v_user), v_request.requester_id, 'connected')
      on conflict (guild_id, user_low, user_high) do update set status = 'connected', updated_at = now()
      where c.status <> 'connected';
    end if;
  end if;
  insert into sakaba.construction_intro_events (guild_id, introduction_id, status, actor_id, note)
  values (v_guild, p_introduction_id, v_next, v_user, btrim(p_note));
  return v_next;
end;
$$;

create function public.sakaba_construction_list_intros()
returns table (
  id uuid, requester_id uuid, introducer_id uuid, target_id uuid, masked boolean, status text, note text,
  fee_kind text, fee_value numeric, updated_at timestamptz, events jsonb
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_guild uuid := sakaba.construction_require_member();
  v_user uuid := auth.uid();
begin
  return query
  select i.id, i.requester_id, i.introducer_id, case when not visibility.masked then i.target_id end,
    visibility.masked, i.status, i.note, i.fee_kind, i.fee_value, i.updated_at,
    (select jsonb_agg(jsonb_build_object(
      'status', e.status, 'at', e.created_at,
      'actor_id', case when not visibility.masked or e.actor_id <> i.target_id then e.actor_id end,
      'note', case when visibility.masked and e.actor_id <> i.requester_id then '' else e.note end
    ) order by e.created_at, case e.status when 'requested' then 1 when 'asking_target' then 2 else 3 end)
    from sakaba.construction_intro_events e where e.guild_id = i.guild_id and e.introduction_id = i.id)
  from sakaba.construction_introductions i
  cross join lateral (select v_user = i.requester_id and i.status <> 'connected' and (
    i.masked_for_requester
    or sakaba.construction_network_level(v_guild, i.introducer_id, i.target_id) in ('masked', 'hidden')
  ) as masked) visibility
  where i.guild_id = v_guild and (
    v_user in (i.requester_id, i.introducer_id)
    or (v_user = i.target_id and i.status in ('asking_target', 'connected', 'declined_by_target'))
  )
  order by i.updated_at desc, i.id;
end;
$$;

do $$
declare
  v_rpc regprocedure;
begin
  foreach v_rpc in array array[
    'public.sakaba_construction_save_my_company(text,text,text[],text[],text,text,text,jsonb)'::regprocedure,
    'public.sakaba_construction_list_companies()'::regprocedure,
    'public.sakaba_construction_request_connection(uuid)'::regprocedure,
    'public.sakaba_construction_answer_connection(uuid,boolean)'::regprocedure,
    'public.sakaba_construction_list_my_connections()'::regprocedure,
    'public.sakaba_construction_set_network_visibility(text,uuid)'::regprocedure,
    'public.sakaba_construction_get_network_visibility()'::regprocedure,
    'public.sakaba_construction_create_post(text,text,text,text,text,text[],text,date)'::regprocedure,
    'public.sakaba_construction_list_posts(uuid,text,text,integer)'::regprocedure,
    'public.sakaba_construction_withdraw_post(uuid)'::regprocedure,
    'public.sakaba_construction_reply(uuid,text,text)'::regprocedure,
    'public.sakaba_construction_list_replies(uuid)'::regprocedure,
    'public.sakaba_construction_list_intro_candidates(uuid)'::regprocedure,
    'public.sakaba_construction_request_intro(uuid,uuid,text)'::regprocedure,
    'public.sakaba_construction_answer_intro(uuid,boolean,text,text,numeric)'::regprocedure,
    'public.sakaba_construction_list_intros()'::regprocedure
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', v_rpc);
    execute format('grant execute on function %s to authenticated', v_rpc);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
