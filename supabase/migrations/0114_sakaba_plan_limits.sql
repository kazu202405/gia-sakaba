-- 料金の段（フリー／プラス 480円／ビジネス 880円）の回数と上限を、DBの中で止める（2026-09-28 五島さんと合意）。
-- 設計：contexts/projects/gia/sakaba_plan_tiers_design.md
--
-- |                         | フリー | プラス | ビジネス | 管理者 |
-- | 紹介の申請（名鑑から・月）  | 1      | 3      | 10       | 無制限 |
-- | クエスト・集まり（月）      | 1      | 3      | 無制限   | 無制限 |
-- | プロジェクト（持ち主）      | 2      | 5      | 無制限   | 無制限 |
--
-- ・月は日本時間の1日に戻る。出した時点で数え、取り下げ・期限切れ・見送りでも戻さない（行は消えないので行を数える）。
-- ・クエストの参加希望者へ出す紹介の申請（quest_id あり）は数えない。
-- ・段の見分け：管理者・課金免除＝exempt／Company Note の11,000円特典＝dining／支払いが有効なら料金IDの表で決める。
--   表に無い料金IDで支払い中の人は dining として扱う（払っている人を少なく扱わない）。
-- ・今プラス等を払っている人は、プロジェクト無制限のまま据え置く（projects_unlimited_kept）。
-- ・コード上のキー dining の表示名は「ビジネス」。

create table sakaba.billing_prices (
  price_id text primary key,
  plan text not null,
  created_at timestamptz not null default now(),
  constraint billing_prices_plan_check check (plan in ('standard', 'dining')),
  constraint billing_prices_id_check check (price_id ~ '^price_[A-Za-z0-9]+$')
);
alter table sakaba.billing_prices enable row level security;
revoke all on sakaba.billing_prices from public, anon, authenticated;

create table sakaba.plan_limits (
  plan text primary key,
  intro_requests_per_month integer,
  quests_per_month integer,
  projects_max integer,
  constraint plan_limits_plan_check check (plan in ('free', 'standard', 'dining', 'exempt')),
  constraint plan_limits_non_negative check (
    coalesce(intro_requests_per_month, 0) >= 0 and coalesce(quests_per_month, 0) >= 0 and coalesce(projects_max, 0) >= 0)
);
alter table sakaba.plan_limits enable row level security;
revoke all on sakaba.plan_limits from public, anon, authenticated;
-- null＝無制限
insert into sakaba.plan_limits (plan, intro_requests_per_month, quests_per_month, projects_max) values
  ('free', 1, 1, 2),
  ('standard', 3, 3, 5),
  ('dining', 10, null, null),
  ('exempt', null, null, null);

-- 据え置き：いま支払いが有効な会員は、プロジェクト無制限のまま
alter table sakaba.guild_members add column projects_unlimited_kept boolean not null default false;
update sakaba.guild_members set projects_unlimited_kept = true
where role = 'member' and billing_status in ('active', 'trialing') and suspended_at is null;

-- 日本時間の、その月の1日0時
create or replace function sakaba.month_start_jst(p_at timestamptz default now())
returns timestamptz language sql stable
set search_path = pg_catalog as $$
  select date_trunc('month', p_at at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
$$;

-- ギルドの中での段
create or replace function sakaba.plan_of(p_guild_id uuid, p_user_id uuid)
returns text language sql stable security definer
set search_path = pg_catalog, public, sakaba as $$
  select case
    when gm.user_id is null then 'free'
    when gm.role in ('owner', 'master') or gm.billing_status = 'exempt' then 'exempt'
    when sakaba.has_company_note_11000_benefit(p_user_id) then 'dining'
    when gm.billing_status in ('active', 'trialing') then
      coalesce((select bp.plan from sakaba.billing_prices bp where bp.price_id = gm.stripe_price_id), 'dining')
    else 'free'
  end
  from (select 1) as one
  left join sakaba.guild_members gm
    on gm.guild_id = p_guild_id and gm.user_id = p_user_id and gm.suspended_at is null;
$$;

-- 上限（null＝無制限）。表に段が無いときは止める（上限が分からないまま通さない）
create or replace function sakaba.plan_limit_of(p_guild_id uuid, p_user_id uuid, p_kind text)
returns integer language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_plan text := sakaba.plan_of(p_guild_id, p_user_id);
  v_row sakaba.plan_limits%rowtype;
begin
  select * into v_row from sakaba.plan_limits where plan = v_plan;
  if not found then
    raise exception 'plan limits are not configured' using errcode = '55000';
  end if;
  if p_kind = 'intro' then return v_row.intro_requests_per_month; end if;
  if p_kind = 'quest' then return v_row.quests_per_month; end if;
  if p_kind = 'project' then
    if v_plan = 'standard' and exists (
      select 1 from sakaba.guild_members gm
      where gm.guild_id = p_guild_id and gm.user_id = p_user_id and gm.projects_unlimited_kept
    ) then return null; end if;
    return v_row.projects_max;
  end if;
  raise exception 'unknown plan limit kind' using errcode = '22023';
end;
$$;

-- 使った数（紹介の申請・クエストは今月、プロジェクトは今持っている数）
create or replace function sakaba.plan_usage_count(p_guild_id uuid, p_user_id uuid, p_kind text)
returns integer language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
begin
  if p_kind = 'intro' then
    return (select count(*)::integer from sakaba.intro_requests ir
      where ir.guild_id = p_guild_id and ir.requester_id = p_user_id and ir.quest_id is null
        and ir.created_at >= sakaba.month_start_jst());
  end if;
  if p_kind = 'quest' then
    return (select count(*)::integer from sakaba.quests q
      where q.guild_id = p_guild_id and q.creator_id = p_user_id and q.created_at >= sakaba.month_start_jst());
  end if;
  if p_kind = 'project' then
    return (select count(*)::integer from sakaba.projects p where p.guild_id = p_guild_id and p.owner_id = p_user_id);
  end if;
  raise exception 'unknown plan limit kind' using errcode = '22023';
end;
$$;

-- 作る前に呼ぶ。会員の行を押さえてから数える（同時に押しても上限を超えない）
create or replace function sakaba.assert_within_plan_limit(p_guild_id uuid, p_user_id uuid, p_kind text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_limit integer;
begin
  perform 1 from sakaba.guild_members gm
  where gm.guild_id = p_guild_id and gm.user_id = p_user_id for update;
  v_limit := sakaba.plan_limit_of(p_guild_id, p_user_id, p_kind);
  if v_limit is not null and sakaba.plan_usage_count(p_guild_id, p_user_id, p_kind) >= v_limit then
    raise exception 'plan limit reached' using errcode = '53400', detail = p_kind;
  end if;
end;
$$;

revoke all on function sakaba.month_start_jst(timestamptz) from public, anon, authenticated;
revoke all on function sakaba.plan_of(uuid, uuid) from public, anon, authenticated;
revoke all on function sakaba.plan_limit_of(uuid, uuid, text) from public, anon, authenticated;
revoke all on function sakaba.plan_usage_count(uuid, uuid, text) from public, anon, authenticated;
revoke all on function sakaba.assert_within_plan_limit(uuid, uuid, text) from public, anon, authenticated;

-- 本人：自分の段・上限・使った数。画面の「今月あと○件」に使う
create or replace function public.sakaba_get_my_plan_usage(p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'plan', sakaba.plan_of(v_guild_id, v_user_id),
    'resets_at', sakaba.month_start_jst() + interval '1 month',
    'intro', jsonb_build_object('limit', sakaba.plan_limit_of(v_guild_id, v_user_id, 'intro'), 'used', sakaba.plan_usage_count(v_guild_id, v_user_id, 'intro')),
    'quest', jsonb_build_object('limit', sakaba.plan_limit_of(v_guild_id, v_user_id, 'quest'), 'used', sakaba.plan_usage_count(v_guild_id, v_user_id, 'quest')),
    'project', jsonb_build_object('limit', sakaba.plan_limit_of(v_guild_id, v_user_id, 'project'), 'used', sakaba.plan_usage_count(v_guild_id, v_user_id, 'project'))
  );
end;
$$;
revoke all on function public.sakaba_get_my_plan_usage(text) from public, anon;
grant execute on function public.sakaba_get_my_plan_usage(text) to authenticated;

-- ギルドマスター：支払い中なのに料金IDの表に無いもの（登録漏れ。その人たちはビジネス扱いになっている）
create or replace function public.sakaba_list_unmapped_billing_prices(p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('price_id', x.price_id, 'members', x.members) order by x.price_id)
    from (
      select coalesce(gm.stripe_price_id, '(なし)') as price_id, count(*) as members
      from sakaba.guild_members gm
      where gm.guild_id = v_guild_id and gm.role = 'member' and gm.suspended_at is null
        and gm.billing_status in ('active', 'trialing')
        and not exists (select 1 from sakaba.billing_prices bp where bp.price_id = gm.stripe_price_id)
      group by 1
    ) x
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.sakaba_list_unmapped_billing_prices(text) from public, anon;
grant execute on function public.sakaba_list_unmapped_billing_prices(text) to authenticated;

create or replace function public.sakaba_create_quest(
  p_guild_slug text,
  p_title text,
  p_category text,
  p_summary text,
  p_body text,
  p_region text,
  p_deadline date,
  p_member_limit integer,
  p_is_urgent boolean default false,
  p_members_only boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null then
    raise exception 'title is required' using errcode = '22023';
  end if;
  if p_category not in ('work', 'consult', 'collab', 'info', 'gathering') then
    raise exception 'invalid category' using errcode = '22023';
  end if;
  if p_member_limit is not null and p_member_limit <= 0 then
    raise exception 'member_limit must be positive' using errcode = '22023';
  end if;
  if p_members_only and (p_category <> 'gathering' or not sakaba.is_guild_master(v_guild_id, v_user_id)) then
    raise exception 'only guild masters can create members-only gatherings' using errcode = '42501';
  end if;

  -- 段ごとの月の件数（0114）
  perform sakaba.assert_within_plan_limit(v_guild_id, v_user_id, 'quest');

  insert into sakaba.quests (
    guild_id, creator_id, title, category, summary, body, region,
    deadline, member_limit, is_urgent, members_only
  ) values (
    v_guild_id, v_user_id, btrim(p_title), p_category,
    btrim(coalesce(p_summary, '')), btrim(coalesce(p_body, '')),
    btrim(coalesce(p_region, '')), p_deadline, p_member_limit,
    p_is_urgent, p_members_only
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.sakaba_create_project(
  p_guild_slug text, p_title text, p_goal text, p_memo text,
  p_start_date date, p_due_date date
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_project_id uuid;
begin
  select id into v_guild_id from sakaba.guilds where lower(slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 40
    or char_length(coalesce(p_goal, '')) > 200 or char_length(coalesce(p_memo, '')) > 500
    or (p_due_date is not null and p_due_date < coalesce(p_start_date, current_date)) then
    raise exception 'invalid project fields' using errcode = '22023';
  end if;
  -- 段ごとの上限（0114。フリー2・プラス5・ビジネス無制限。同時に作っても超えないよう行を押さえて数える）
  perform sakaba.assert_within_plan_limit(v_guild_id, v_user_id, 'project');
  insert into sakaba.projects (guild_id, owner_id, title, goal, memo, start_date, due_date)
  values (v_guild_id, v_user_id, btrim(p_title), coalesce(p_goal, ''), coalesce(p_memo, ''),
    coalesce(p_start_date, current_date), p_due_date)
  returning id into v_project_id;
  return v_project_id;
end;
$$;

create or replace function public.sakaba_create_intro_request(
  p_guild_slug text, p_target_id uuid, p_purpose text, p_message text default ''
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
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_target_id is null or p_target_id = v_user_id or not exists (
    select 1 from sakaba.guild_members gm where gm.guild_id = v_guild_id
      and gm.user_id = p_target_id and gm.suspended_at is null and gm.accept_intro
  ) then raise exception 'target is not accepting introductions' using errcode = '22023'; end if;
  if p_purpose is null or p_purpose not in ('work', 'consult', 'collab', 'info') then
    raise exception 'invalid introduction purpose' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) > 400 then
    raise exception 'message is too long' using errcode = '22001';
  end if;

  -- 期限の過ぎた申請を片付けてから、同じ相手への申請がまだ生きていないかを見る。
  -- 見送られた申請も期限までは「お返事待ち」と同じに扱い、同じ答えで断る（見送りが分からないように）
  update sakaba.intro_requests set status = 'expired'
  where guild_id = v_guild_id and requester_id = v_user_id and target_id = p_target_id
    and status in ('proposed', 'declined_by_target') and expires_at is not null and expires_at <= now();
  if exists (
    select 1 from sakaba.intro_requests
    where guild_id = v_guild_id and requester_id = v_user_id and target_id = p_target_id
      and status in ('requested', 'reviewing', 'proposed', 'accepted', 'introduced', 'declined_by_target')
  ) then raise exception 'introduction already pending' using errcode = '23505'; end if;

  -- 段ごとの月の件数（0114）。同じ相手への重複の確認より後に置く（重複は重複として断る）
  perform sakaba.assert_within_plan_limit(v_guild_id, v_user_id, 'intro');

  insert into sakaba.intro_requests
    (guild_id, requester_id, target_id, purpose, message, status, proposed_at, expires_at)
  values
    (v_guild_id, v_user_id, p_target_id, p_purpose, btrim(coalesce(p_message, '')), 'proposed', now(), now() + interval '14 days')
  returning id into v_id;

  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
  values (v_guild_id, p_target_id, 'intro_progress', v_user_id, v_id, 'proposed');
  return v_id;
end;
$$;

notify pgrst, 'reload schema';
