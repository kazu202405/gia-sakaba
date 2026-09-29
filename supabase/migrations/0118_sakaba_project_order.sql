-- プロジェクトの並び順（2026-09-29 五島さん）。
-- ・並び順は人ごとに持つ（参加中のプロジェクトも、自分の好きな順にできる。ほかの人の並びは変わらない）。
-- ・並べ替えるのは進行中だけ（完了は一覧の下にたたむ）。送られてこなかったプロジェクトの順はそのまま残す。
-- ・順が無いプロジェクト（作ったばかり等）は、画面側で上に出す（lib/guild/project-order.ts）。

create table sakaba.project_positions (
  user_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  project_id uuid not null references sakaba.projects(id) on delete cascade,
  position integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);
alter table sakaba.project_positions enable row level security;
revoke all on sakaba.project_positions from public, anon, authenticated;

-- 自分の並び順を保存する（p_project_ids の順が上から）
create or replace function public.sakaba_set_project_order(p_guild_slug text, p_project_ids uuid[])
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_project_ids is null or cardinality(p_project_ids) > 500
     or array_position(p_project_ids, null) is not null
     or cardinality(p_project_ids) <> (select count(distinct x) from unnest(p_project_ids) x) then
    raise exception 'invalid project order' using errcode = '22023';
  end if;
  -- 見えるプロジェクト（持ち主か参加中）だけ並べられる
  if exists (
    select 1 from unnest(p_project_ids) x
    where not exists (
      select 1 from sakaba.projects p
      where p.id = x and p.guild_id = v_guild_id
        and (p.owner_id = v_user_id or exists (
          select 1 from sakaba.project_members pm where pm.project_id = p.id and pm.user_id = v_user_id
        ))
    )
  ) then
    raise exception 'project not found or access denied' using errcode = '42501';
  end if;

  insert into sakaba.project_positions (user_id, project_id, position)
  select v_user_id, t.id, t.ord::integer
  from unnest(p_project_ids) with ordinality as t(id, ord)
  on conflict (user_id, project_id) do update set position = excluded.position, updated_at = now();
end;
$$;

-- 自分の並び順（上から順のプロジェクトID）
create or replace function public.sakaba_list_my_project_order(p_guild_slug text default 'gia')
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
  return coalesce((
    select jsonb_agg(pp.project_id order by pp.position, pp.updated_at)
    from sakaba.project_positions pp
    join sakaba.projects p on p.id = pp.project_id
    where pp.user_id = v_user_id and p.guild_id = v_guild_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.sakaba_set_project_order(text, uuid[]) from public, anon;
revoke all on function public.sakaba_list_my_project_order(text) from public, anon;
grant execute on function public.sakaba_set_project_order(text, uuid[]) to authenticated;
grant execute on function public.sakaba_list_my_project_order(text) to authenticated;

notify pgrst, 'reload schema';
