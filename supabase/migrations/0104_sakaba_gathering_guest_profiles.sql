-- 招待URLの集まり：申し込んだゲストに、同じ会に参加する会員のプロフィールを見せる（2026-09-26 五島さん決定）。
-- 見せるのは「その会に申し込んだ会員と主催者のうち、本人が『ゲストにも見せる』を選んだ人」だけ。
-- 見られるのは「その会に申し込んだゲスト（メール確認済み）」と会員だけ。URLを知っているだけの人には見せない。
-- 見せる項目：名前・アイコン・写真・職業・業種・地域・ひとこと・仕事内容・おもい・つながり・紹介状。
-- 見せない：連絡先・会社名。会に来ない会員は名前も出さず、人数だけ返す。

create table sakaba.gathering_guest_visibility (
  quest_id uuid not null references sakaba.quests(id) on delete cascade,
  user_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  show boolean not null,
  updated_at timestamptz not null default now(),
  primary key (quest_id, user_id)
);
alter table sakaba.gathering_guest_visibility enable row level security;
revoke all on sakaba.gathering_guest_visibility from public, anon, authenticated;

-- その会の「ゲストに見せてよい参加者」かどうか：主催者か、申し込み中の会員で、本人が見せると選んでいる
create or replace function sakaba.is_shown_to_gathering_guests(p_quest sakaba.quests, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select sakaba.is_active_member(p_quest.guild_id, p_user_id)
    and exists (
      select 1 from sakaba.gathering_guest_visibility v
      where v.quest_id = p_quest.id and v.user_id = p_user_id and v.show
    )
    and (p_user_id = p_quest.creator_id or exists (
      select 1 from sakaba.quest_applications qa
      where qa.quest_id = p_quest.id and qa.user_id = p_user_id and qa.status = 'applied'
    ));
$$;
revoke all on function sakaba.is_shown_to_gathering_guests(sakaba.quests, uuid) from public, anon, authenticated;

-- 会員・主催者：この集まりでゲストに見せるかを選ぶ（ゲストを招ける、誰でも参加できる集まりだけ）
create or replace function public.sakaba_set_gathering_guest_visibility(p_quest_id uuid, p_show boolean)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
begin
  select * into v_quest from sakaba.quests where id = p_quest_id;
  if not found or v_user_id is null or p_show is null
     or v_quest.category <> 'gathering' or v_quest.members_only or v_quest.status = 'withdrawn'
     or not sakaba.is_active_member(v_quest.guild_id, v_user_id)
     or not (v_quest.creator_id = v_user_id or exists (
       select 1 from sakaba.quest_applications qa
       where qa.quest_id = p_quest_id and qa.user_id = v_user_id and qa.status = 'applied'
     )) then
    raise exception 'gathering participant access required' using errcode = '42501';
  end if;
  insert into sakaba.gathering_guest_visibility (quest_id, user_id, show)
  values (p_quest_id, v_user_id, p_show)
  on conflict (quest_id, user_id) do update set show = excluded.show, updated_at = now();
end;
$$;

-- 会員・主催者：自分がこの集まりでゲストに見せる設定か（まだ選んでいなければ null）
create or replace function public.sakaba_get_my_gathering_guest_visibility(p_quest_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, sakaba as $$
  select v.show from sakaba.gathering_guest_visibility v
  where v.quest_id = p_quest_id and v.user_id = auth.uid();
$$;

-- ゲスト：招待URLで、同じ会に参加する会員のプロフィールを見る
create or replace function public.sakaba_get_guest_gathering_members(p_token text)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
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
      'job', p.job,
      'industry', coalesce((
        select t.name from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
        where pt.user_id = p.user_id and t.kind = 'industry' and t.is_active
        order by t.sort_order, t.name limit 1
      ), ''),
      'region', p.region,
      'headline', p.headline,
      'bio', case when 'work' = any(gm.visible_groups) then p.bio else '' end,
      'values_text', case when 'values' = any(gm.visible_groups) then p.values_text else '' end,
      'looking_for', case when 'connect' = any(gm.visible_groups) then p.looking_for else '' end,
      'introductions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'author_name', ap.display_name, 'body', mi.body, 'updated_at', mi.updated_at
        ) order by mi.updated_at desc)
        from sakaba.member_introductions mi
        join sakaba.guild_members agm on agm.guild_id = mi.guild_id and agm.user_id = mi.author_id and agm.suspended_at is null
        join sakaba.profiles ap on ap.user_id = mi.author_id
        where mi.guild_id = v_quest.guild_id and mi.target_id = p.user_id
      ), '[]'::jsonb)
    ) as m
    from sakaba.guild_members gm
    join sakaba.profiles p on p.user_id = gm.user_id
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
$$;

revoke all on function public.sakaba_set_gathering_guest_visibility(uuid, boolean) from public, anon;
revoke all on function public.sakaba_get_my_gathering_guest_visibility(uuid) from public, anon;
revoke all on function public.sakaba_get_guest_gathering_members(text) from public;
grant execute on function public.sakaba_set_gathering_guest_visibility(uuid, boolean) to authenticated;
grant execute on function public.sakaba_get_my_gathering_guest_visibility(uuid) to authenticated;
grant execute on function public.sakaba_get_guest_gathering_members(text) to anon, authenticated;

notify pgrst, 'reload schema';
