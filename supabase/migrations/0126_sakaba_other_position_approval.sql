-- 入会時の役職「その他」を承認制にする（2026-10-03 五島さん）。
-- 「代表・役員・決裁者の場」と言い切るため、「その他」で入ろうとした人は、オーナーが承認するまで酒場の中に入れない。
--
-- 設計（入口に条件を足して全員が通れなくなる事故を避けるため、次の形にした）
--  ・既存の「会員か」の判定は 30か所近くが sakaba.guild_members の `suspended_at is null` を直接見ている。
--    そこで、承認待ち・見送りの人は suspended_at を入れた行として作る（＝既存の全部の関門が自動で閉じる）。
--    承認すると suspended_at を空に戻す。承認状態の列は approval_state（空 = 今までの会員。pending / declined のときだけ値が入る）。
--  ・approval_state が入る行は必ず suspended_at も入っている、をCHECKで固定する（片方だけ外れて開く事故を防ぐ）。
--  ・既存の行は何も変えない（approval_state は空のまま・suspended_at も触らない）。既存の「その他」の会員はそのまま使える。
--  ・承認待ち・見送り・停止・会員の判定は sakaba.member_gate_state() の1か所。画面（sakaba_get_my_gate_status）もRPCもこれを使う。
--  ・入会の経路は3つとも sakaba._join_guild() を通る（招待コード・下書き招待・集まりのゲスト）。承認制の判定はここ1か所。
--  ・既存の関数は、最新版の本文をファイルからそのまま写し、必要な行だけ足した
--      sakaba_join_guild（0079）・sakaba_join_prepared_guild（0111）・sakaba_join_from_guest_gathering（0102）
--      sakaba_get_my_member_invite・sakaba_list_invite_network（0093）・sakaba_list_master_invites（0092）
--      sakaba_push_candidates（0124）・notify_owner_member_joined（0124 の本文のまま。発火の条件だけ変える）

-- ---------- 列 ----------

alter table sakaba.guild_members
  add column if not exists approval_state text,
  add column if not exists other_position_title varchar(40) not null default '',
  add column if not exists other_work_summary varchar(100) not null default '',
  add column if not exists approval_decided_at timestamptz;

alter table sakaba.guild_members drop constraint if exists guild_members_approval_state_check;
alter table sakaba.guild_members add constraint guild_members_approval_state_check
  check (approval_state is null or approval_state in ('pending', 'declined'));

alter table sakaba.guild_members drop constraint if exists guild_members_approval_needs_suspended;
alter table sakaba.guild_members add constraint guild_members_approval_needs_suspended
  check (approval_state is null or suspended_at is not null);

comment on column sakaba.guild_members.approval_state is
  '空=承認不要（今までの会員）。pending=オーナーの承認待ち（役職「その他」で申請）。declined=見送り。入っている間は必ず suspended_at も入る';

-- ---------- 判定（1か所） ----------

create or replace function sakaba.member_gate_state(p_guild_id uuid, p_user_id uuid default auth.uid())
returns text language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select coalesce((
    select case
      when gm.approval_state is not null then gm.approval_state
      when gm.suspended_at is not null then 'suspended'
      else 'active'
    end
    from sakaba.guild_members gm
    where gm.guild_id = p_guild_id and gm.user_id = p_user_id
  ), 'none');
$$;
revoke all on function sakaba.member_gate_state(uuid, uuid) from public, anon, authenticated;

-- 画面用。自分の状態（none / active / suspended / pending / declined）だけを返す
create or replace function public.sakaba_get_my_gate_status(p_guild_slug text default 'gia')
returns text language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null then
    raise exception 'guild not found' using errcode = 'P0002';
  end if;
  return sakaba.member_gate_state(v_guild_id, v_user_id);
end;
$$;
revoke all on function public.sakaba_get_my_gate_status(text) from public, anon, authenticated;
grant execute on function public.sakaba_get_my_gate_status(text) to authenticated;

-- ---------- 入会（3つの経路の共通の入口） ----------
-- 0079 の sakaba_join_guild の本文を写し、次の行だけを足した：
--   ・引数 p_other_title / p_other_work / p_allow_blank_other
--   ・「その他」のときの入力の確認と、承認待ちの行（suspended_at と approval_state）の作成
--   ・すでに承認待ち・見送りの人が来たときの返り値
-- 公開の sakaba_join_guild はこれを呼ぶだけの薄い入口（p_allow_blank_other は外から渡せない）

drop function if exists public.sakaba_join_guild(text, text, text, text, boolean, text, boolean);

create or replace function sakaba._join_guild(
  p_code text,
  p_display_name text,
  p_company_name text,
  p_position text,
  p_show_company boolean,
  p_want_to_solve text default '',
  p_agreed boolean default false,
  p_other_title text default '',
  p_other_work text default '',
  p_allow_blank_other boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
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

  insert into sakaba.profiles (user_id, display_name)
  values (v_user_id, btrim(p_display_name))
  on conflict (user_id) do update
    set display_name = excluded.display_name;

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

  update sakaba.invites
  set used_count = used_count + 1
  where id = v_invite.id;

  return jsonb_build_object('joined', true, 'already_member', false, 'pending', v_pending, 'guild_id', v_invite.guild_id);
end;
$$;

revoke all on function sakaba._join_guild(text, text, text, text, boolean, text, boolean, text, text, boolean) from public, anon, authenticated;

create or replace function public.sakaba_join_guild(
  p_code text,
  p_display_name text,
  p_company_name text,
  p_position text,
  p_show_company boolean,
  p_want_to_solve text default '',
  p_agreed boolean default false,
  p_other_title text default '',
  p_other_work text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
begin
  return sakaba._join_guild(p_code, p_display_name, p_company_name, p_position, p_show_company,
    p_want_to_solve, p_agreed, p_other_title, p_other_work, false);
end;
$$;
revoke all on function public.sakaba_join_guild(text, text, text, text, boolean, text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.sakaba_join_guild(text, text, text, text, boolean, text, boolean, text, text) to authenticated;

-- ---------- 集まりのゲストからの入会（0102 の本文から。役職を受け取る引数を足し、入会の呼び出しを差し替え） ----------
-- 役職を選んでもらう（2026-10-03 五島さん：限定と知らずに来た人もいるので）。代表・役員・決裁者はそのまま会員、「その他」は役職・お仕事の内容を書いて承認待ち。
-- 役職を渡さない古い画面からの呼び出し（p_position が空）は、今まで通り「その他」の承認待ちとして入れる（役職・お仕事の内容は空で可）。

drop function if exists public.sakaba_join_from_guest_gathering(text, boolean);

create or replace function public.sakaba_join_from_guest_gathering(
  p_token text, p_agreed boolean,
  p_position text default null, p_other_title text default '', p_other_work text default ''
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_link sakaba.quest_guest_links%rowtype;
  v_profile sakaba.guest_profiles%rowtype;
  v_invite sakaba.invites%rowtype;
begin
  if not coalesce(p_agreed, false) then
    raise exception 'guild promises must be accepted' using errcode = '22023';
  end if;
  if v_user_id is null or not exists (
    select 1 from auth.users u where u.id = v_user_id and u.email_confirmed_at is not null
  ) then
    raise exception 'verified email required' using errcode = '42501';
  end if;
  select l.* into v_link
  from sakaba.quest_guest_links l join sakaba.quests q on q.id = l.quest_id
  where l.token = p_token and q.status <> 'withdrawn'
    and sakaba.is_active_member(q.guild_id, q.creator_id);
  if not found or not exists (
    select 1 from sakaba.quest_guest_applications ga
    where ga.quest_id = v_link.quest_id and ga.user_id = v_user_id and ga.status = 'applied'
  ) then
    raise exception 'guest application required' using errcode = '42501';
  end if;
  select * into v_profile from sakaba.guest_profiles where user_id = v_user_id;
  select * into v_invite from sakaba.invites where id = v_link.invite_id;
  if v_invite.revoked_at is not null or v_invite.expires_at < now() then
    raise exception 'invite unavailable' using errcode = '42501';
  end if;
  return sakaba._join_guild(v_invite.code, v_profile.display_name, '未登録', coalesce(p_position, 'other'), false, '', true,
    coalesce(p_other_title, ''), coalesce(p_other_work, ''), p_position is null);
end;
$$;
revoke all on function public.sakaba_join_from_guest_gathering(text, boolean, text, text, text) from public, anon;
grant execute on function public.sakaba_join_from_guest_gathering(text, boolean, text, text, text) to authenticated;

-- ---------- 下書き招待からの入会（0111 の本文から、入会の呼び出しと引数だけ差し替え） ----------

drop function if exists public.sakaba_join_prepared_guild(text, text, text, text, boolean, text, boolean, boolean);

create or replace function public.sakaba_join_prepared_guild(
  p_code text,
  p_display_name text,
  p_company_name text,
  p_position text,
  p_show_company boolean,
  p_want_to_solve text,
  p_agreed boolean,
  p_accept_introduction boolean default false,
  p_other_title text default '',
  p_other_work text default ''
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_invite_id uuid;
  v_guild_id uuid;
  v_author_id uuid;
  v_introduction text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select i.id, i.guild_id, i.created_by, p.introduction
  into v_invite_id, v_guild_id, v_author_id, v_introduction
  from sakaba.invites i
  join sakaba.prepared_invites p on p.invite_id = i.id
  where lower(i.code) = lower(btrim(p_code));
  if v_invite_id is null then
    raise exception 'prepared invite not found' using errcode = 'P0002';
  end if;

  -- The existing join function validates consent, membership and invite use
  -- under a row lock. This wrapper and the introduction share one transaction.
  v_result := sakaba._join_guild(p_code, p_display_name, p_company_name,
    p_position, p_show_company, p_want_to_solve, p_agreed, p_other_title, p_other_work, false);
  if coalesce(p_accept_introduction, false)
    and coalesce((v_result->>'joined')::boolean, false)
    and not coalesce((v_result->>'pending')::boolean, false)
    and nullif(btrim(v_introduction), '') is not null
    and v_author_id <> auth.uid()
    and sakaba.is_active_member(v_guild_id, v_author_id) then
    insert into sakaba.member_introductions (guild_id, author_id, target_id, body)
    values (v_guild_id, v_author_id, auth.uid(), v_introduction);
  end if;
  return v_result;
end;
$$;

revoke all on function public.sakaba_join_prepared_guild(text, text, text, text, boolean, text, boolean, boolean, text, text) from public, anon, authenticated;
grant execute on function public.sakaba_join_prepared_guild(text, text, text, text, boolean, text, boolean, boolean, text, text) to authenticated;

-- ---------- 招待した人・管理者の一覧に、承認待ち・見送りの人を出さない（招待した人には何も知らせない） ----------

create or replace function public.sakaba_get_my_member_invite(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
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
  join sakaba.profiles p on p.user_id = gm.user_id
  where gm.guild_id = v_guild_id and i.created_by = v_user_id and i.kind = 'member'
    and gm.approval_state is null;

  return jsonb_build_object('link', v_link, 'people', v_people);
end;
$$;

create or replace function public.sakaba_list_invite_network(p_guild_slug text default 'gia')
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
  join sakaba.profiles p on p.user_id = gm.user_id
  left join sakaba.invites i on i.id = gm.invite_id
  left join sakaba.profiles inviter on inviter.user_id = i.created_by
  where gm.guild_id = v_guild_id and gm.approval_state is null;
  return v_result;
end;
$$;

create or replace function public.sakaba_list_master_invites(p_guild_slug text default 'gia')
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
      join sakaba.profiles p on p.user_id = gm.user_id
      where gm.invite_id = i.id and gm.guild_id = v_guild_id and gm.approval_state is null
    ), '[]'::jsonb)
  ) order by i.created_at desc), '[]'::jsonb)
  into v_result
  from sakaba.invites i
  left join sakaba.profiles creator on creator.user_id = i.created_by
  where i.guild_id = v_guild_id;
  return v_result;
end;
$$;

-- ---------- おしらせ ----------
-- ・申請が入ったら、オーナーへ member_pending（おしらせ＋プッシュ）
-- ・member_joined は、承認待ちでない人の入会と、承認された時点だけ（二重に出さない）

alter table sakaba.notifications drop constraint if exists notifications_kind_check;
alter table sakaba.notifications add constraint notifications_kind_check check (kind in (
  'quest_applied', 'quest_updated', 'quest_withdrawn', 'intro_progress',
  'gathering_approved', 'gathering_declined', 'schedule_decided', 'consult_request', 'feedback_report',
  'member_joined', 'member_pending'
));

-- 0124 の本文のまま（発火する条件だけ下のトリガーで変える）
create or replace function sakaba.notify_owner_member_joined()
returns trigger language plpgsql security definer
set search_path = pg_catalog, sakaba as $$
begin
  begin
    insert into sakaba.notifications (guild_id, user_id, kind, actor_id)
    select new.guild_id, gm.user_id, 'member_joined', new.user_id
    from sakaba.guild_members gm
    where gm.guild_id = new.guild_id and gm.role = 'owner' and gm.suspended_at is null and gm.user_id <> new.user_id;
  exception when others then
    raise warning 'member_joined notice failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function sakaba.notify_owner_member_joined() from public;

drop trigger if exists guild_members_notify_owner_joined on sakaba.guild_members;
create trigger guild_members_notify_owner_joined
after insert on sakaba.guild_members
for each row when (new.role = 'member' and new.approval_state is null)
execute function sakaba.notify_owner_member_joined();

drop trigger if exists guild_members_notify_owner_approved on sakaba.guild_members;
create trigger guild_members_notify_owner_approved
after update of approval_state on sakaba.guild_members
for each row when (old.approval_state = 'pending' and new.approval_state is null and new.role = 'member')
execute function sakaba.notify_owner_member_joined();

create or replace function sakaba.notify_owner_member_pending()
returns trigger language plpgsql security definer
set search_path = pg_catalog, sakaba as $$
begin
  begin
    insert into sakaba.notifications (guild_id, user_id, kind, actor_id)
    select new.guild_id, gm.user_id, 'member_pending', new.user_id
    from sakaba.guild_members gm
    where gm.guild_id = new.guild_id and gm.role = 'owner' and gm.suspended_at is null and gm.user_id <> new.user_id;
  exception when others then
    raise warning 'member_pending notice failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function sakaba.notify_owner_member_pending() from public;

drop trigger if exists guild_members_notify_owner_pending on sakaba.guild_members;
create trigger guild_members_notify_owner_pending
after insert on sakaba.guild_members
for each row when (new.role = 'member' and new.approval_state = 'pending')
execute function sakaba.notify_owner_member_pending();

-- ---------- プッシュ通知の候補（0124 から写した） ----------

create or replace function public.sakaba_push_candidates()
returns table (event_key text, user_id uuid, category text, body text, href text, occurred_at timestamptz)
language sql security definer
set search_path = pg_catalog, public, sakaba
as $$
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
        else 'しょうかいについておしらせがあります'
      end as body,
      case when n.intro_request_id is not null then '/guild/requests'
        when n.kind = 'quest_applied' and q.members_only and qa.approved_at is null then '/guild/master'
        when n.kind = 'quest_applied' then '/guild/quests/' || n.quest_id::text || '/applicants'
        when n.kind = 'consult_request' then '/guild/master#master-consults-title'
        when n.kind = 'feedback_report' then '/guild/master#master-feedback-title'
        when n.kind = 'member_joined' then '/guild/members/' || n.actor_id::text
        when n.kind = 'member_pending' then '/guild/master#master-pending-members-title'
        when n.quest_id is not null then '/guild/quests/' || n.quest_id::text
        else '/guild/notifications' end as href,
      n.created_at as occurred_at
    from sakaba.notifications n
    left join sakaba.quests q on q.id = n.quest_id
    left join sakaba.profiles ap on ap.user_id = n.actor_id
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
  select c.event_key, c.user_id, c.category, c.body, c.href, c.occurred_at
  from candidates c
  join sakaba.guild_members gm on gm.guild_id = c.guild_id and gm.user_id = c.user_id and gm.suspended_at is null;
$$;

-- ---------- 管理画面：参加の申請（オーナーだけ） ----------

create or replace function public.sakaba_list_pending_members(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
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
    join sakaba.profiles p on p.user_id = gm.user_id
    left join sakaba.invites i on i.id = gm.invite_id
    left join sakaba.profiles inviter on inviter.user_id = i.created_by
    where gm.guild_id = v_guild_id and sakaba.member_gate_state(gm.guild_id, gm.user_id) = 'pending'
  ), '[]'::jsonb);
end;
$$;

-- 承認（すぐ普通の会員になる）か見送り（入れないまま）。招待した人・申請した本人には通知を作らない
create or replace function public.sakaba_decide_pending_member(
  p_user_id uuid,
  p_approve boolean,
  p_guild_slug text default 'gia'
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_found boolean;
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
  if p_approve is null then
    raise exception 'p_approve required' using errcode = '22023';
  end if;

  perform 1 from sakaba.guild_members gm
  where gm.guild_id = v_guild_id and gm.user_id = p_user_id
  for update;
  if sakaba.member_gate_state(v_guild_id, p_user_id) <> 'pending' then
    raise exception 'not pending' using errcode = '22023';
  end if;

  if p_approve then
    update sakaba.guild_members
    set approval_state = null, suspended_at = null, approval_decided_at = now(), updated_at = now()
    where guild_id = v_guild_id and user_id = p_user_id;
  else
    update sakaba.guild_members
    set approval_state = 'declined', approval_decided_at = now(), updated_at = now()
    where guild_id = v_guild_id and user_id = p_user_id;
  end if;
  return jsonb_build_object('ok', true, 'approved', p_approve);
end;
$$;

revoke all on function public.sakaba_list_pending_members(text) from public, anon, authenticated;
revoke all on function public.sakaba_decide_pending_member(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.sakaba_list_pending_members(text) to authenticated;
grant execute on function public.sakaba_decide_pending_member(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';
