-- 名刺の表裏（2026-09-26 五島さん決定）。
-- ・本人が同意して登録した名刺の画像を、同じギルドの在籍中の会員だけが見られる。ゲスト・未ログインは見られない。
-- ・名刺には電話・メール・住所が写るので、登録のときに「会員全員に見える」ことへの同意を取る（同意した日時を残す）。
-- ・画像は鍵付きの保存場所（sakaba-business-cards）に「<本人のid>/<front|back>-<時刻>.jpg」で置く。置けるのは本人のフォルダだけ。
-- ・読めるのは、本人か、本人と同じギルドに在籍していて、しかもプロフィールに登録済みの画像だけ（置いただけで未登録の画像は読めない）。

alter table sakaba.profiles
  add column business_card_front text,
  add column business_card_back text,
  add column business_card_agreed_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sakaba-business-cards', 'sakaba-business-cards', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 見る人と名刺の持ち主が、同じギルドに在籍しているか
create or replace function sakaba.shares_active_guild(p_viewer uuid, p_owner uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select p_viewer is not null and p_owner is not null and exists (
    select 1 from sakaba.guild_members me
    join sakaba.guild_members owner on owner.guild_id = me.guild_id
    where me.user_id = p_viewer and me.suspended_at is null
      and owner.user_id = p_owner and owner.suspended_at is null
  );
$$;
revoke all on function sakaba.shares_active_guild(uuid, uuid) from public, anon;
grant execute on function sakaba.shares_active_guild(uuid, uuid) to authenticated;

-- 保存場所の「名前」から持ち主を取り出す（形が違えば null）
create or replace function sakaba.business_card_owner(p_name text)
returns uuid language sql immutable
set search_path = pg_catalog as $$
  select case when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(front|back)-[0-9]+\.(jpg|png|webp)$'
    then split_part(p_name, '/', 1)::uuid else null end;
$$;
revoke all on function sakaba.business_card_owner(text) from public, anon;
grant execute on function sakaba.business_card_owner(text) to authenticated;

-- 読めるか：本人か、同じギルドに在籍していて、しかもプロフィールに登録済みの画像か。
-- 保存場所の決まりは見る人の権限で動くので、プロフィールの表を見る部分はこの関数（持ち主の権限）に閉じ込める
create or replace function sakaba.can_read_business_card(p_name text)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select sakaba.business_card_owner(p_name) = auth.uid()
    or (
      sakaba.shares_active_guild(auth.uid(), sakaba.business_card_owner(p_name))
      and exists (
        select 1 from sakaba.profiles p
        where p.user_id = sakaba.business_card_owner(p_name)
          and p.business_card_agreed_at is not null
          and p_name in (p.business_card_front, p.business_card_back)
      )
    );
$$;
revoke all on function sakaba.can_read_business_card(text) from public, anon;
grant execute on function sakaba.can_read_business_card(text) to authenticated;

drop policy if exists sakaba_business_cards_read on storage.objects;
create policy sakaba_business_cards_read on storage.objects
  for select to authenticated
  using (bucket_id = 'sakaba-business-cards' and coalesce(sakaba.can_read_business_card(name), false));

drop policy if exists sakaba_business_cards_insert on storage.objects;
create policy sakaba_business_cards_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sakaba-business-cards'
    and sakaba.business_card_owner(name) = auth.uid()
    and sakaba.shares_active_guild(auth.uid(), auth.uid())
  );

drop policy if exists sakaba_business_cards_update on storage.objects;
create policy sakaba_business_cards_update on storage.objects
  for update to authenticated
  using (bucket_id = 'sakaba-business-cards' and sakaba.business_card_owner(name) = auth.uid())
  with check (bucket_id = 'sakaba-business-cards' and sakaba.business_card_owner(name) = auth.uid());

drop policy if exists sakaba_business_cards_delete on storage.objects;
create policy sakaba_business_cards_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'sakaba-business-cards' and sakaba.business_card_owner(name) = auth.uid());

-- 本人：名刺を登録・差し替え・消す（null で消す）。画像を1枚でも登録するなら同意が必要
create or replace function public.sakaba_set_business_card(p_front text, p_back text, p_agreed boolean)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba, storage as $$
declare
  v_user_id uuid := auth.uid();
  v_path text;
begin
  if v_user_id is null or not sakaba.shares_active_guild(v_user_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if (p_front is not null or p_back is not null) and not coalesce(p_agreed, false) then
    raise exception 'consent required' using errcode = '22023';
  end if;
  foreach v_path in array array_remove(array[p_front, p_back], null) loop
    if sakaba.business_card_owner(v_path) is distinct from v_user_id or not exists (
      select 1 from storage.objects o where o.bucket_id = 'sakaba-business-cards' and o.name = v_path
    ) then
      raise exception 'invalid business card image' using errcode = '22023';
    end if;
  end loop;
  if p_front is not null and p_front !~ '/front-' or p_back is not null and p_back !~ '/back-' then
    raise exception 'invalid business card image' using errcode = '22023';
  end if;

  update sakaba.profiles
  set business_card_front = p_front,
      business_card_back = p_back,
      business_card_agreed_at = case when p_front is null and p_back is null then null
        else coalesce(business_card_agreed_at, now()) end,
      updated_at = now()
  where user_id = v_user_id;
end;
$$;

-- 会員：ある人の名刺（見られない人・未登録なら null）
create or replace function public.sakaba_get_business_card(p_user_id uuid)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, sakaba as $$
  select case when p_user_id = auth.uid() or sakaba.shares_active_guild(auth.uid(), p_user_id) then (
    select jsonb_build_object('front', p.business_card_front, 'back', p.business_card_back, 'agreed_at', p.business_card_agreed_at)
    from sakaba.profiles p
    where p.user_id = p_user_id and (p.user_id = auth.uid() or p.business_card_agreed_at is not null)
  ) else null end;
$$;

-- 会員：ギルドの名刺の表面の一覧（在籍中の会員で、登録済みの人だけ）
create or replace function public.sakaba_list_business_cards(p_guild_slug text default 'gia')
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
    select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'front', p.business_card_front, 'back', p.business_card_back))
    from sakaba.guild_members gm
    join sakaba.profiles p on p.user_id = gm.user_id
    where gm.guild_id = v_guild_id and gm.suspended_at is null
      and p.business_card_agreed_at is not null
      and (p.business_card_front is not null or p.business_card_back is not null)
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.sakaba_set_business_card(text, text, boolean) from public, anon;
revoke all on function public.sakaba_get_business_card(uuid) from public, anon;
revoke all on function public.sakaba_list_business_cards(text) from public, anon;
grant execute on function public.sakaba_set_business_card(text, text, boolean) to authenticated;
grant execute on function public.sakaba_get_business_card(uuid) to authenticated;
grant execute on function public.sakaba_list_business_cards(text) to authenticated;

notify pgrst, 'reload schema';
