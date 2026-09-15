-- 0062_set_my_referrer.sql
--
-- 新規登録者が「自分の紹介者」を後追いで確定するための SECURITY DEFINER RPC。
-- referrer_id は保護列（0018）でユーザーは直接書き込めないため、本RPCが正規ルート。
--
-- 背景: これまで紹介者は event_attendees への招待コード経由（0016 トリガ）でしか
--   入らず、セミナー無しの素の登録だと取りこぼしていた。登録フォームから
--   「紹介コード手入力」または「メンバーを名前で選択」して、ここで確定させる。
--
-- 引数: p_code=招待コード(invitations.code) / p_referrer_id=メンバーを直接指定。
-- ガード:
--   - 本人（auth.uid()）の applicants 行だけを更新
--   - 既に referrer_id があれば上書きしない（0016 トリガと同じ方針）
--   - 自分自身は紹介者にできない
--   - コードはメンバー紹介リンク（seminar_id IS NULL）のみ有効
--   - 直接指定は実在の登録会員（tier registered/paid）のみ
-- 返り値: 確定した referrer_id と名前（確定しなければ NULL）。

create or replace function set_my_referrer(
  p_code text default null,
  p_referrer_id uuid default null
)
returns table (referrer_id uuid, referrer_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_target uuid;
  v_name text;
  v_existing uuid;
begin
  if v_me is null then
    raise exception 'ログインが必要です';
  end if;

  -- 既に紹介者が確定済みなら何もしない（上書き禁止）。現状の紹介者を返す。
  select a.referrer_id into v_existing from applicants a where a.id = v_me;
  if v_existing is not null then
    select a.name into v_name from applicants a where a.id = v_existing;
    return query select v_existing, v_name;
    return;
  end if;

  -- 1) コード優先（メンバー紹介リンク = seminar_id NULL のみ）。
  if p_code is not null and length(trim(p_code)) > 0 then
    update invitations
       set used_count = used_count + 1,
           updated_at = now()
     where code = trim(p_code)
       and is_active = true
       and seminar_id is null
    returning created_by into v_target;
  end if;

  -- 2) コードで取れなければ、直接指定のメンバーIDを使う（実在の登録会員のみ）。
  if v_target is null and p_referrer_id is not null then
    select a.id into v_target
      from applicants a
     where a.id = p_referrer_id
       and a.tier in ('registered', 'paid');
  end if;

  -- 解決できない / 自分自身 はセットしない。
  if v_target is null or v_target = v_me then
    return query select null::uuid, null::text;
    return;
  end if;

  update applicants
     set referrer_id = v_target,
         updated_at = now()
   where id = v_me
     and referrer_id is null;

  select a.name into v_name from applicants a where a.id = v_target;
  return query select v_target, v_name;
end $$;

grant execute on function set_my_referrer(text, uuid) to authenticated;
