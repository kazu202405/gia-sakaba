-- 共有URLを「本人が使いはじめたか」を覚える（ホームで「共有URLを作りましょう」を出すかどうかの判断用）
--
-- ・マイページを開くだけで表の行はできてしまう（0121）ので、「行がある」は「気づいた」の印にならない
-- ・本人がURLをコピーした・見え方を確認した・スイッチを変えたときだけ acknowledged_at を入れる
-- ・読み書きは関数だけ（表は誰にも直接読ませない）

alter table sakaba.profile_shares add column acknowledged_at timestamptz;

-- 自分が共有URLを使いはじめたか。行がない・まだ印がないなら false
create or replace function public.sakaba_get_my_share_acknowledged(p_guild_slug text default 'gia')
returns boolean language plpgsql stable security definer
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
  return coalesce((select ps.acknowledged_at is not null from sakaba.profile_shares ps where ps.user_id = v_user_id), false);
end;
$$;

-- 本人が共有URLを使いはじめた印を付ける（2回目以降は最初の日時のまま）
create or replace function public.sakaba_ack_my_share(p_guild_slug text default 'gia')
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
  update sakaba.profile_shares set acknowledged_at = coalesce(acknowledged_at, now()) where user_id = v_user_id;
end;
$$;

revoke all on function public.sakaba_get_my_share_acknowledged(text) from public;
revoke all on function public.sakaba_ack_my_share(text) from public;
grant execute on function public.sakaba_get_my_share_acknowledged(text) to authenticated;
grant execute on function public.sakaba_ack_my_share(text) to authenticated;

notify pgrst, 'reload schema';
