-- 0122：入会のつながりで「つながっている」人どうしの扱い ＋ 会員のページで相手の共有URLを渡す
-- 2026-09-30 五島さん決定：
--   ・招待した人と招待された人（直接の1つ）は「つながり済み」。その2人の間の申請は、月の回数に数えない・上限も見ない
--   ・相手の連絡先は、従来どおり相手の承諾があったときだけ見える（承諾制は変えない）
--   ・会員のステータスのページに「紹介のためのURL」を出す（LINEなどで貼る用。相手の共有URLがあるときだけ）
-- 既存の関数（plan_usage_count・sakaba_create_intro_request）は、0114 の本文から該当の数行だけを差し替えている（手で打ち直していない）

-- 招待した人と招待された人（直接の1つ）か。2つ先の人には広げない
create or replace function sakaba.is_direct_invite_pair(p_guild_id uuid, p_a uuid, p_b uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select exists (
    select 1
    from sakaba.guild_members gm
    join sakaba.invites inv on inv.id = gm.invite_id
    where gm.guild_id = p_guild_id
      and ((gm.user_id = p_a and inv.created_by = p_b) or (gm.user_id = p_b and inv.created_by = p_a))
  );
$$;
revoke all on function sakaba.is_direct_invite_pair(uuid, uuid, uuid) from public, anon, authenticated;

-- 月の申請の数え方（0114 の plan_usage_count の本文＋招待でつながった相手を除く）
create or replace function sakaba.plan_usage_count(p_guild_id uuid, p_user_id uuid, p_kind text)
returns integer language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
begin
  if p_kind = 'intro' then
    return (select count(*)::integer from sakaba.intro_requests ir
      where ir.guild_id = p_guild_id and ir.requester_id = p_user_id and ir.quest_id is null
        and ir.created_at >= sakaba.month_start_jst()
        -- 招待した人・された人どうしへの申請は、回数に数えない（0122）
        and not sakaba.is_direct_invite_pair(p_guild_id, p_user_id, ir.target_id));
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

-- つながり申請を作る（0114 の本文＋招待でつながった相手は上限を見ない）
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
  -- 招待した人・された人どうしへの申請は、回数の上限を見ない（0122）
  if not sakaba.is_direct_invite_pair(v_guild_id, v_user_id, p_target_id) then
    perform sakaba.assert_within_plan_limit(v_guild_id, v_user_id, 'intro');
  end if;

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

-- 会員のページ用：相手の共有URLと、入会のつながりの有無
--  ・share_token：相手が共有をオンにしていて、URLがすでにあるときだけ。ないときは null（この関数で作ることはしない）
--  ・invite_connected：招待した人・された人どうしか。相手が「入会のつながりで名前を出さない」なら false にする（つながりが分かってしまうため）
create or replace function public.sakaba_get_member_link_info(p_target_id uuid, p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
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
  select ps.token into v_token from sakaba.profile_shares ps where ps.user_id = p_target_id and ps.enabled;
  if p_target_id <> v_user_id
     and sakaba.is_direct_invite_pair(v_guild_id, v_user_id, p_target_id)
     and not exists (select 1 from sakaba.guild_members gm where gm.guild_id = v_guild_id and gm.user_id = p_target_id and gm.hide_invite_path) then
    v_connected := true;
  end if;
  return jsonb_build_object('share_token', v_token, 'invite_connected', v_connected);
end;
$$;
revoke all on function public.sakaba_get_member_link_info(uuid, text) from public, anon;
grant execute on function public.sakaba_get_member_link_info(uuid, text) to authenticated;

notify pgrst, 'reload schema';
