-- ステータスの共有URL（会員以外にも見せる・紹介用）。仕様：contexts/projects/gia/sakaba_share_url.md
--
-- ・表 sakaba.profile_shares は本人が「共有URL」の窓を開いたときに1行できる（最初から全員ぶんは作らない）
-- ・URLの文字列は 64桁の16進（推測できない長さ）。本人があとでコピーし直せるよう、そのまま保存する
-- ・表は誰にも直接読ませない（RLS有効＋権限なし）。読み書きは下の関数だけ
-- ・公開用の関数 sakaba_get_shared_profile は未ログインでも呼べる。返す項目は「allow-list」だけ。
--   出さないもの（出身地・誕生日・連絡先・入会のつながり・いま解決したいこと・管理者の情報・ほかの会員）は
--   そもそも組み立てに入れない。見張りテスト lib/guild/share-profile-guard.test.ts がこれを監視する

create table sakaba.profile_shares (
  user_id uuid primary key references sakaba.profiles(user_id) on delete cascade,
  token text not null unique,
  enabled boolean not null default true,
  show_profile boolean not null default true,
  show_personal boolean not null default true,
  show_card boolean not null default false,
  show_intros boolean not null default false,
  show_intro_authors boolean not null default false,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint profile_shares_token_shape check (token ~ '^[0-9a-f]{64}$'),
  constraint profile_shares_authors_need_intros check (show_intros or not show_intro_authors)
);

alter table sakaba.profile_shares enable row level security;
revoke all on table sakaba.profile_shares from anon, authenticated;

-- 推測できない文字列（uuid v4 を2つつなげて 64桁。乱数は約244ビット）
create or replace function sakaba.new_share_token()
returns text language sql volatile
set search_path = pg_catalog as $$
  select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$;
revoke all on function sakaba.new_share_token() from public;

-- 自分の共有設定を読む（なければ、ここで作る＝窓を開いた本人の操作）
create or replace function public.sakaba_get_my_share(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
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
  insert into sakaba.profile_shares (user_id, token) values (v_user_id, sakaba.new_share_token())
  on conflict (user_id) do nothing;
  select * into v_row from sakaba.profile_shares where user_id = v_user_id;
  return jsonb_build_object(
    'token', v_row.token, 'enabled', v_row.enabled,
    'show_profile', v_row.show_profile, 'show_personal', v_row.show_personal,
    'show_card', v_row.show_card, 'show_intros', v_row.show_intros,
    'show_intro_authors', v_row.show_intro_authors
  );
end;
$$;

-- 設定を変える。紹介状がオフなら、書いた人の名前も必ずオフにする
create or replace function public.sakaba_update_my_share(
  p_guild_slug text, p_enabled boolean, p_show_profile boolean, p_show_personal boolean,
  p_show_card boolean, p_show_intros boolean, p_show_intro_authors boolean
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  insert into sakaba.profile_shares (user_id, token) values (v_user_id, sakaba.new_share_token())
  on conflict (user_id) do nothing;
  update sakaba.profile_shares set
    enabled = coalesce(p_enabled, enabled),
    show_profile = coalesce(p_show_profile, show_profile),
    show_personal = coalesce(p_show_personal, show_personal),
    show_card = coalesce(p_show_card, show_card),
    show_intros = coalesce(p_show_intros, show_intros),
    show_intro_authors = coalesce(p_show_intros, show_intros) and coalesce(p_show_intro_authors, show_intro_authors),
    updated_at = now()
  where user_id = v_user_id;
end;
$$;

-- URLを作り直す（古いURLはその場で見られなくなる）
create or replace function public.sakaba_rotate_my_share(p_guild_slug text default 'gia')
returns text language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
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
  insert into sakaba.profile_shares (user_id, token, rotated_at) values (v_user_id, v_token, now())
  on conflict (user_id) do update set token = excluded.token, rotated_at = now(), updated_at = now();
  return v_token;
end;
$$;

-- 公開用：URLの文字列から、共有してよい項目だけを返す（未ログインでも呼べる）
-- ない・停止中・形が違う・本人が酒場を抜けている、のどれでも同じ null を返す（理由を教えない）
create or replace function public.sakaba_get_shared_profile(p_token text)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_share sakaba.profile_shares;
  v_guild_id uuid;
  v_member sakaba.guild_members;
  v_profile sakaba.profiles;
  v_industry text;
  v_keywords jsonb;
  v_intros jsonb := '[]'::jsonb;
  v_card jsonb := null;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into v_share from sakaba.profile_shares where token = p_token and enabled;
  if not found then return null; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = 'gia';
  select * into v_member from sakaba.guild_members gm
  where gm.guild_id = v_guild_id and gm.user_id = v_share.user_id and gm.suspended_at is null;
  if not found then return null; end if;
  select * into v_profile from sakaba.profiles p where p.user_id = v_share.user_id;
  if not found then return null; end if;

  select t.name into v_industry
  from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
  where pt.user_id = v_share.user_id and t.kind = 'industry' and t.is_active
  limit 1;

  if v_share.show_profile then
    select coalesce(jsonb_agg(t.name order by t.name), '[]'::jsonb) into v_keywords
    from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
    where pt.user_id = v_share.user_id and t.kind = 'keyword' and t.is_active;
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
      join sakaba.profiles ap on ap.user_id = mi.author_id
      join sakaba.guild_members agm on agm.guild_id = mi.guild_id and agm.user_id = mi.author_id and agm.suspended_at is null
      where mi.guild_id = v_guild_id and mi.target_id = v_share.user_id
      order by mi.updated_at desc
      limit 20
    ) x;
  end if;

  return jsonb_build_object(
    'display_name', v_profile.display_name,
    'photo_url', v_profile.photo_url,
    'headline', v_profile.headline,
    'job', v_profile.job,
    'job_icon', v_profile.job_icon,
    'region', v_profile.region,
    'industry', v_industry,
    'company_name', case when v_member.show_company then v_member.company_name else null end,
    'position', case when v_member.show_company then v_member.position else null end,
    'bio', case when v_share.show_profile then v_profile.bio else null end,
    'values_text', case when v_share.show_profile then v_profile.values_text else null end,
    'looking_for', case when v_share.show_profile then v_profile.looking_for else null end,
    'keywords', case when v_share.show_profile then v_keywords else null end,
    'hobbies', case when v_share.show_personal then v_profile.hobbies else null end,
    'life_story', case when v_share.show_personal then v_profile.life_story else null end,
    'business_card', v_card,
    'introductions', case when v_share.show_intros then v_intros else null end
  );
end;
$$;

revoke all on function public.sakaba_get_my_share(text) from public;
revoke all on function public.sakaba_update_my_share(text, boolean, boolean, boolean, boolean, boolean, boolean) from public;
revoke all on function public.sakaba_rotate_my_share(text) from public;
revoke all on function public.sakaba_get_shared_profile(text) from public;
grant execute on function public.sakaba_get_my_share(text) to authenticated;
grant execute on function public.sakaba_update_my_share(text, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.sakaba_rotate_my_share(text) to authenticated;
grant execute on function public.sakaba_get_shared_profile(text) to anon, authenticated;

notify pgrst, 'reload schema';
