-- 「建設・不動産の酒場」の owner（五島さん）を付与する。migration（0132）ではなく、五島さんが SQL Editor で手で1回流す（2026-10-22）。
--
-- 流す順番：0131 → 0132 → これ。
-- なぜ migration に入れないか：owner は本番の auth.users の id が要る。ここでは「GIAの酒場の owner と同じ人」を引いて、2店目の owner にする
--   （0080 が email で五島さんを引いているのと同じ考え方。email の決め打ちを増やさないため、GIAの酒場の owner の行から引く）。
-- 何度流しても同じ結果（すでに owner なら、役割と課金の免除を整え直すだけ）。
-- GIAの酒場の owner が1人ちょうどでないときは、何も変えずに止まる（別の人を owner にしないため）。
-- 流したあと確認する SQL は末尾のコメント。

do $$
declare
  v_gia_id uuid;
  v_ken_id uuid;
  v_user_id uuid;
  v_owner_count integer;
  v_company text;
begin
  select id into v_gia_id from sakaba.guilds where slug = 'gia';
  select id into v_ken_id from sakaba.guilds where slug = 'kensetsu-fudosan';
  if v_gia_id is null or v_ken_id is null then
    raise exception '店の行が見つかりません。先に 0132 を流してください（gia=%, kensetsu-fudosan=%）', v_gia_id, v_ken_id;
  end if;

  select count(*), max(user_id::text)::uuid, max(company_name)
  into v_owner_count, v_user_id, v_company
  from sakaba.guild_members
  where guild_id = v_gia_id and role = 'owner' and suspended_at is null;
  if v_owner_count <> 1 then
    raise exception 'GIAの酒場の owner が % 人います（1人のときだけ進めます）。手で確認してください', v_owner_count;
  end if;

  insert into sakaba.guild_members (
    guild_id, user_id, role, company_name, position, show_company,
    invite_id, promises_agreed_at, billing_status, billing_updated_at
  ) values (
    v_ken_id, v_user_id, 'owner', v_company, 'ceo', true,
    null, now(), 'exempt', now()
  )
  on conflict (guild_id, user_id) do update
    set role = 'owner',
        billing_status = 'exempt',
        billing_updated_at = now(),
        suspended_at = null;
end;
$$;

-- 確認（流したあとに別に流す）：両方の店で role = owner の行が1つずつ、同じ user_id で出る
-- select g.slug, gm.role, gm.billing_status, gm.user_id
-- from sakaba.guild_members gm join sakaba.guilds g on g.id = gm.guild_id
-- where gm.role = 'owner' order by g.slug;
