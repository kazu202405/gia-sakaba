-- 入会のつながり（2026-09-26 五島さん決定）。
-- 酒場は招待制なので、会員ごとに「この人を招いたのは誰か」が1人に決まる（招待リンクを作った人＝invites.created_by）。
-- 見る人と相手から招待をさかのぼり、最初に合流した人でつないで「あなた → Bさん → Aさん → Cさん」を返す。
-- 見られるのは会員どうしだけ。ゲストには出さない。
-- 「入会のつながりで名前を出さない」を選んだ人は、ほかの人のつながりでは「匿名の会員」になり、
-- その人のページではつながりを出さない（誰に招かれたかが分かってしまうため）。自分の画面では自分には見える。
-- 停止中・退会済みの人は名前を出さず「今は在籍していない方」とし、道は切らない。

alter table sakaba.guild_members
  add column hide_invite_path boolean not null default false;

-- 招待をさかのぼった列（自分 → 招いた人 → その人を招いた人 …）。行き止まり・30段・同じ人の再登場で止める
create or replace function sakaba.invite_ancestors(p_guild_id uuid, p_user_id uuid)
returns uuid[] language plpgsql stable security definer
set search_path = pg_catalog, sakaba as $$
declare
  v_chain uuid[] := array[p_user_id];
  v_current uuid := p_user_id;
  v_next uuid;
begin
  for i in 1..30 loop
    select inv.created_by into v_next
    from sakaba.guild_members gm
    join sakaba.invites inv on inv.id = gm.invite_id
    where gm.guild_id = p_guild_id and gm.user_id = v_current;
    exit when v_next is null or v_next = any(v_chain);
    v_chain := v_chain || v_next;
    v_current := v_next;
  end loop;
  return v_chain;
end;
$$;
revoke all on function sakaba.invite_ancestors(uuid, uuid) from public, anon, authenticated;

-- 会員：自分から相手までの入会のつながり。相手が自分なら、根っこから自分までの列
create or replace function public.sakaba_get_invite_path(p_target_id uuid, p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
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
    select p.display_name into v_name from sakaba.profiles p where p.user_id = v_id;
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
$$;

-- 会員：入会のつながりで名前を出さないか
create or replace function public.sakaba_set_invite_path_hidden(p_hidden boolean, p_guild_slug text default 'gia')
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or p_hidden is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  update sakaba.guild_members set hide_invite_path = p_hidden, updated_at = now()
  where guild_id = v_guild_id and user_id = v_user_id;
end;
$$;

revoke all on function public.sakaba_get_invite_path(uuid, text) from public, anon;
revoke all on function public.sakaba_set_invite_path_hidden(boolean, text) from public, anon;
grant execute on function public.sakaba_get_invite_path(uuid, text) to authenticated;
grant execute on function public.sakaba_set_invite_path_hidden(boolean, text) to authenticated;

notify pgrst, 'reload schema';
