-- ステータスの下書き：オーナー・マスターが、メンバー本人のステータスの中身を下書きする（2026-10-19 五島さん）。
-- 本人が承認するまで、誰にも見えない。載せられるのは本人だけ（オーナー・マスターが書けても、載せる処理は呼べない）。
--
-- ・A（これから招待する人）：招待状の下書き（0111 prepared_invites）に、invite_id でひもづける。
--   入会した瞬間に、トリガーで本人あてに届ける（入会の関数 sakaba._join_guild は書き換えない）
-- ・B（もう入っている人）：member_user_id をつけて書く。酒場の中のおしらせで届く
-- ・表は誰にも直接読ませない（RLS有効＋権限なし）。読み書きはすべて下のRPCを通す
-- ・本人がすでに書いた項目は上書きしない（空いている項目にだけ入る）
-- ・載せた／いらない、の返事は書いたオーナー・マスターにおしらせで届く
-- ・sakaba_push_candidates は 0126 の本文をそのまま写し、新しい種類の3行（本文・行き先）だけを足した

create table sakaba.profile_drafts (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  -- 下書きの相手。A では入会するまで空（入会したらトリガーで入る）
  member_user_id uuid references sakaba.profiles(user_id) on delete cascade,
  -- A のとき：招待状
  invite_id uuid references sakaba.invites(id) on delete cascade,
  drafted_by uuid not null references auth.users(id) on delete cascade,
  headline varchar(40) not null default '',
  industry varchar(40) not null default '',
  region varchar(40) not null default '',
  job varchar(40) not null default '',
  bio varchar(1200) not null default '',
  values_text varchar(1200) not null default '',
  looking_for varchar(1200) not null default '',
  state text not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint profile_drafts_state_check check (state in ('waiting', 'applied', 'declined')),
  constraint profile_drafts_target_check check (member_user_id is not null or invite_id is not null),
  constraint profile_drafts_decided_check check ((state = 'waiting') = (decided_at is null)),
  -- 待っている下書きは中身がある。返事のあとは中身を消す（履歴は持たない）
  constraint profile_drafts_content_check check (
    state <> 'waiting' or btrim(headline || industry || region || job || bio || values_text || looking_for) <> ''
  )
);

-- 1人（1つの招待状）に待っている下書きは1つまで。書き直したら上書き
create unique index profile_drafts_waiting_member_uidx
  on sakaba.profile_drafts (member_user_id) where state = 'waiting' and member_user_id is not null;
create unique index profile_drafts_waiting_invite_uidx
  on sakaba.profile_drafts (invite_id) where state = 'waiting' and invite_id is not null;
create index profile_drafts_drafted_by_idx on sakaba.profile_drafts (drafted_by, created_at desc);

alter table sakaba.profile_drafts enable row level security;
revoke all on table sakaba.profile_drafts from public, anon, authenticated;

-- ---------- おしらせの種類を足す（0126 の一覧に3つ） ----------

alter table sakaba.notifications drop constraint if exists notifications_kind_check;
alter table sakaba.notifications add constraint notifications_kind_check check (kind in (
  'quest_applied', 'quest_updated', 'quest_withdrawn', 'intro_progress',
  'gathering_approved', 'gathering_declined', 'schedule_decided', 'consult_request', 'feedback_report',
  'member_joined', 'member_pending',
  'profile_draft_waiting', 'profile_draft_applied', 'profile_draft_declined'
));

-- ---------- 内部：文字数の確認（どの入口でも同じ上限） ----------

create or replace function sakaba._profile_draft_too_long(
  p_headline text, p_industry text, p_region text, p_job text,
  p_bio text, p_values_text text, p_looking_for text
)
returns boolean language sql immutable
set search_path = pg_catalog as $$
  select char_length(btrim(coalesce(p_headline, ''))) > 40
    or char_length(btrim(coalesce(p_industry, ''))) > 40
    or char_length(btrim(coalesce(p_region, ''))) > 40
    or char_length(btrim(coalesce(p_job, ''))) > 40
    or char_length(btrim(coalesce(p_bio, ''))) > 1200
    or char_length(btrim(coalesce(p_values_text, ''))) > 1200
    or char_length(btrim(coalesce(p_looking_for, ''))) > 1200;
$$;
revoke all on function sakaba._profile_draft_too_long(text, text, text, text, text, text, text) from public, anon, authenticated;

-- ---------- B：もう入っている人の下書きを書く（オーナー・マスターだけ） ----------

create or replace function public.sakaba_save_member_profile_draft(
  p_guild_slug text,
  p_member_id uuid,
  p_headline text default '',
  p_industry text default '',
  p_region text default '',
  p_job text default '',
  p_bio text default '',
  p_values_text text default '',
  p_looking_for text default ''
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  if p_member_id is null or p_member_id = v_user_id or not sakaba.is_active_member(v_guild_id, p_member_id) then
    raise exception 'active member required' using errcode = '22023';
  end if;
  if sakaba._profile_draft_too_long(p_headline, p_industry, p_region, p_job, p_bio, p_values_text, p_looking_for) then
    raise exception 'profile draft too long' using errcode = '22023';
  end if;
  if btrim(coalesce(p_headline, '') || coalesce(p_industry, '') || coalesce(p_region, '') || coalesce(p_job, '')
    || coalesce(p_bio, '') || coalesce(p_values_text, '') || coalesce(p_looking_for, '')) = '' then
    raise exception 'profile draft is empty' using errcode = '22023';
  end if;

  insert into sakaba.profile_drafts (guild_id, member_user_id, drafted_by, headline, industry, region, job, bio, values_text, looking_for)
  values (v_guild_id, p_member_id, v_user_id, btrim(coalesce(p_headline, '')), btrim(coalesce(p_industry, '')),
    btrim(coalesce(p_region, '')), btrim(coalesce(p_job, '')), btrim(coalesce(p_bio, '')),
    btrim(coalesce(p_values_text, '')), btrim(coalesce(p_looking_for, '')))
  on conflict (member_user_id) where state = 'waiting' and member_user_id is not null
  do update set drafted_by = excluded.drafted_by, headline = excluded.headline, industry = excluded.industry,
    region = excluded.region, job = excluded.job, bio = excluded.bio, values_text = excluded.values_text,
    looking_for = excluded.looking_for, updated_at = now();

  -- まだ読まれていない「届きました」があるときは、重ねて知らせない
  if not exists (
    select 1 from sakaba.notifications n
    where n.user_id = p_member_id and n.guild_id = v_guild_id and n.kind = 'profile_draft_waiting' and n.read_at is null
  ) then
    insert into sakaba.notifications (guild_id, user_id, kind, actor_id)
    values (v_guild_id, p_member_id, 'profile_draft_waiting', v_user_id);
  end if;
end;
$$;

-- 書いた本人（オーナー・マスター）が、その人あてに書いた下書きを読む。返事が済んだものは中身を返さない
create or replace function public.sakaba_get_member_profile_draft(p_guild_slug text, p_member_id uuid)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_row sakaba.profile_drafts%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  select d.* into v_row from sakaba.profile_drafts d
  where d.guild_id = v_guild_id and d.member_user_id = p_member_id and d.drafted_by = v_user_id
  order by d.created_at desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_row.id, 'state', v_row.state, 'decided_at', v_row.decided_at,
    'fields', case when v_row.state = 'waiting' then jsonb_build_object(
      'headline', v_row.headline, 'industry', v_row.industry, 'region', v_row.region, 'job', v_row.job,
      'bio', v_row.bio, 'values_text', v_row.values_text, 'looking_for', v_row.looking_for) end
  );
end;
$$;

-- ---------- A：これから招待する人の下書き（招待状の下書きにひもづける） ----------
-- 全部空で保存すると、待っている下書きを取り下げる

create or replace function public.sakaba_save_invite_profile_draft(
  p_invite_id uuid,
  p_headline text default '',
  p_industry text default '',
  p_region text default '',
  p_job text default '',
  p_bio text default '',
  p_values_text text default '',
  p_looking_for text default ''
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select i.guild_id into v_guild_id from sakaba.invites i
  join sakaba.prepared_invites p on p.invite_id = i.id
  where i.id = p_invite_id and i.revoked_at is null and i.used_count = 0
    and (i.expires_at is null or i.expires_at >= now())
  for update of i;
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'active prepared invite and guild master required' using errcode = '42501';
  end if;
  if sakaba._profile_draft_too_long(p_headline, p_industry, p_region, p_job, p_bio, p_values_text, p_looking_for) then
    raise exception 'profile draft too long' using errcode = '22023';
  end if;
  if btrim(coalesce(p_headline, '') || coalesce(p_industry, '') || coalesce(p_region, '') || coalesce(p_job, '')
    || coalesce(p_bio, '') || coalesce(p_values_text, '') || coalesce(p_looking_for, '')) = '' then
    delete from sakaba.profile_drafts where invite_id = p_invite_id and state = 'waiting';
    return;
  end if;

  insert into sakaba.profile_drafts (guild_id, invite_id, drafted_by, headline, industry, region, job, bio, values_text, looking_for)
  values (v_guild_id, p_invite_id, v_user_id, btrim(coalesce(p_headline, '')), btrim(coalesce(p_industry, '')),
    btrim(coalesce(p_region, '')), btrim(coalesce(p_job, '')), btrim(coalesce(p_bio, '')),
    btrim(coalesce(p_values_text, '')), btrim(coalesce(p_looking_for, '')))
  on conflict (invite_id) where state = 'waiting' and invite_id is not null
  do update set drafted_by = excluded.drafted_by, headline = excluded.headline, industry = excluded.industry,
    region = excluded.region, job = excluded.job, bio = excluded.bio, values_text = excluded.values_text,
    looking_for = excluded.looking_for, updated_at = now();
end;
$$;

-- 自分が書いた、入会前の下書きの一覧（招待状の一覧に重ねて出す）
create or replace function public.sakaba_list_invite_profile_drafts(p_guild_slug text default 'gia')
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
  if v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'invite_id', d.invite_id, 'headline', d.headline, 'industry', d.industry, 'region', d.region, 'job', d.job,
      'bio', d.bio, 'values_text', d.values_text, 'looking_for', d.looking_for
    ) order by d.created_at desc)
    from sakaba.profile_drafts d
    where d.guild_id = v_guild_id and d.invite_id is not null and d.state = 'waiting' and d.drafted_by = v_user_id
  ), '[]'::jsonb);
end;
$$;

-- 入会したら、その招待状に待っていた下書きを本人にひもづけて、おしらせを出す。
-- 入会を止めない（失敗しても警告だけ残す）
create or replace function sakaba.attach_profile_draft_on_join()
returns trigger language plpgsql security definer
set search_path = pg_catalog, sakaba as $$
declare
  v_drafter uuid;
begin
  begin
    update sakaba.profile_drafts set member_user_id = new.user_id, updated_at = now()
    where invite_id = new.invite_id and state = 'waiting' and member_user_id is null
    returning drafted_by into v_drafter;
    if found then
      insert into sakaba.notifications (guild_id, user_id, kind, actor_id)
      values (new.guild_id, new.user_id, 'profile_draft_waiting', v_drafter);
    end if;
  exception when others then
    raise warning 'profile draft attach failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function sakaba.attach_profile_draft_on_join() from public;

drop trigger if exists guild_members_attach_profile_draft on sakaba.guild_members;
create trigger guild_members_attach_profile_draft
after insert on sakaba.guild_members
for each row when (new.invite_id is not null)
execute function sakaba.attach_profile_draft_on_join();

-- ---------- 本人：届いた下書きを見る ----------
-- filled＝本人がすでに書いている項目（下書きは入らない）

create or replace function public.sakaba_get_my_profile_draft(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_row sakaba.profile_drafts%rowtype;
  v_profile sakaba.profiles%rowtype;
  v_has_industry boolean;
  v_filled text[] := '{}';
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  select d.* into v_row from sakaba.profile_drafts d
  where d.guild_id = v_guild_id and d.member_user_id = v_user_id and d.state = 'waiting';
  if not found then return null; end if;
  select p.* into v_profile from sakaba.profiles p where p.user_id = v_user_id;
  select exists (
    select 1 from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
    where pt.user_id = v_user_id and t.kind = 'industry'
  ) into v_has_industry;
  if btrim(v_profile.headline) <> '' then v_filled := v_filled || 'headline'::text; end if;
  if v_has_industry then v_filled := v_filled || 'industry'::text; end if;
  if btrim(v_profile.region) <> '' then v_filled := v_filled || 'region'::text; end if;
  if btrim(v_profile.job) <> '' then v_filled := v_filled || 'job'::text; end if;
  if btrim(v_profile.bio) <> '' then v_filled := v_filled || 'bio'::text; end if;
  if btrim(v_profile.values_text) <> '' then v_filled := v_filled || 'values_text'::text; end if;
  if btrim(v_profile.looking_for) <> '' then v_filled := v_filled || 'looking_for'::text; end if;
  return jsonb_build_object(
    'id', v_row.id, 'created_at', v_row.created_at,
    'drafted_by_name', (select p.display_name from sakaba.profiles p where p.user_id = v_row.drafted_by),
    'fields', jsonb_build_object(
      'headline', v_row.headline, 'industry', v_row.industry, 'region', v_row.region, 'job', v_row.job,
      'bio', v_row.bio, 'values_text', v_row.values_text, 'looking_for', v_row.looking_for),
    'filled', to_jsonb(v_filled)
  );
end;
$$;

-- ---------- 本人：載せる／いらない（載せる入口はここ1か所。呼べるのは本人だけ） ----------
-- apply  ＝このまま載せる。空いている項目にだけ入る（書いてある項目は上書きしない）
-- edited ＝なおしてから載せる。中身はステータスの編集画面で本人が保存したので、ここでは書かず済みにするだけ
-- decline＝いらない
-- どれも、返事のあとは下書きの中身を消し、書いたオーナー・マスターに知らせる

create or replace function public.sakaba_decide_my_profile_draft(p_draft_id uuid, p_decision text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_row sakaba.profile_drafts%rowtype;
  v_profile sakaba.profiles%rowtype;
  v_has_industry boolean;
  v_tag_id uuid;
  v_applied text[] := '{}';
  v_skipped text[] := '{}';
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('apply', 'edited', 'decline') then
    raise exception 'invalid decision' using errcode = '22023';
  end if;
  select d.* into v_row from sakaba.profile_drafts d where d.id = p_draft_id for update;
  -- 本人以外には、下書きがあるかどうかも教えない（同じ失敗にする）
  if not found or v_row.member_user_id is distinct from v_user_id
    or not sakaba.is_active_member(v_row.guild_id, v_user_id) then
    raise exception 'only the member can decide' using errcode = '42501';
  end if;
  if v_row.state <> 'waiting' then
    raise exception 'draft already decided' using errcode = '22023';
  end if;

  if p_decision = 'apply' then
    select p.* into v_profile from sakaba.profiles p where p.user_id = v_user_id for update;
    select exists (
      select 1 from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
      where pt.user_id = v_user_id and t.kind = 'industry'
    ) into v_has_industry;

    -- 空いている項目にだけ入れる。下書きが空の項目は触らない
    if btrim(v_row.headline) <> '' then
      if btrim(v_profile.headline) = '' then v_applied := v_applied || 'headline'::text; else v_skipped := v_skipped || 'headline'::text; end if;
    end if;
    if btrim(v_row.region) <> '' then
      if btrim(v_profile.region) = '' then v_applied := v_applied || 'region'::text; else v_skipped := v_skipped || 'region'::text; end if;
    end if;
    if btrim(v_row.job) <> '' then
      if btrim(v_profile.job) = '' then v_applied := v_applied || 'job'::text; else v_skipped := v_skipped || 'job'::text; end if;
    end if;
    if btrim(v_row.bio) <> '' then
      if btrim(v_profile.bio) = '' then v_applied := v_applied || 'bio'::text; else v_skipped := v_skipped || 'bio'::text; end if;
    end if;
    if btrim(v_row.values_text) <> '' then
      if btrim(v_profile.values_text) = '' then v_applied := v_applied || 'values_text'::text; else v_skipped := v_skipped || 'values_text'::text; end if;
    end if;
    if btrim(v_row.looking_for) <> '' then
      if btrim(v_profile.looking_for) = '' then v_applied := v_applied || 'looking_for'::text; else v_skipped := v_skipped || 'looking_for'::text; end if;
    end if;
    if btrim(v_row.industry) <> '' then
      if not v_has_industry then v_applied := v_applied || 'industry'::text; else v_skipped := v_skipped || 'industry'::text; end if;
    end if;

    update sakaba.profiles set
      headline = case when 'headline' = any(v_applied) then btrim(v_row.headline) else headline end,
      region = case when 'region' = any(v_applied) then btrim(v_row.region) else region end,
      job = case when 'job' = any(v_applied) then btrim(v_row.job) else job end,
      bio = case when 'bio' = any(v_applied) then btrim(v_row.bio) else bio end,
      values_text = case when 'values_text' = any(v_applied) then btrim(v_row.values_text) else values_text end,
      looking_for = case when 'looking_for' = any(v_applied) then btrim(v_row.looking_for) else looking_for end
    where user_id = v_user_id;

    if 'industry' = any(v_applied) then
      insert into sakaba.tags (kind, name) values ('industry', btrim(v_row.industry))
      on conflict (kind, lower(name)) do update set is_active = true returning id into v_tag_id;
      insert into sakaba.profile_tags (user_id, tag_id) values (v_user_id, v_tag_id) on conflict do nothing;
    end if;
  end if;

  update sakaba.profile_drafts set
    state = case when p_decision = 'decline' then 'declined' else 'applied' end,
    decided_at = now(), updated_at = now(),
    headline = '', industry = '', region = '', job = '', bio = '', values_text = '', looking_for = ''
  where id = v_row.id;

  -- 書いた人へ。その人がもう会員でなくても、返事は止めない
  insert into sakaba.notifications (guild_id, user_id, kind, actor_id)
  select v_row.guild_id, v_row.drafted_by,
    case when p_decision = 'decline' then 'profile_draft_declined' else 'profile_draft_applied' end, v_user_id
  where exists (select 1 from sakaba.profiles p where p.user_id = v_row.drafted_by);

  return jsonb_build_object('applied', to_jsonb(v_applied), 'skipped', to_jsonb(v_skipped));
end;
$$;

revoke all on function public.sakaba_save_member_profile_draft(text, uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.sakaba_get_member_profile_draft(text, uuid) from public, anon, authenticated;
revoke all on function public.sakaba_save_invite_profile_draft(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.sakaba_list_invite_profile_drafts(text) from public, anon, authenticated;
revoke all on function public.sakaba_get_my_profile_draft(text) from public, anon, authenticated;
revoke all on function public.sakaba_decide_my_profile_draft(uuid, text) from public, anon, authenticated;
grant execute on function public.sakaba_save_member_profile_draft(text, uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.sakaba_get_member_profile_draft(text, uuid) to authenticated;
grant execute on function public.sakaba_save_invite_profile_draft(uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.sakaba_list_invite_profile_drafts(text) to authenticated;
grant execute on function public.sakaba_get_my_profile_draft(text) to authenticated;
grant execute on function public.sakaba_decide_my_profile_draft(uuid, text) to authenticated;

-- ---------- プッシュ通知の候補（0126 から写した） ----------

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
        when 'profile_draft_waiting' then 'ステータスの下書きが届きました。内容を見て選んでください'
        when 'profile_draft_applied' then coalesce(ap.display_name, 'メンバー') || 'さんが、下書きをステータスに載せました'
        when 'profile_draft_declined' then coalesce(ap.display_name, 'メンバー') || 'さんは、今回は下書きを載せませんでした'
        else 'しょうかいについておしらせがあります'
      end as body,
      case when n.intro_request_id is not null then '/guild/requests'
        when n.kind = 'quest_applied' and q.members_only and qa.approved_at is null then '/guild/master'
        when n.kind = 'quest_applied' then '/guild/quests/' || n.quest_id::text || '/applicants'
        when n.kind = 'consult_request' then '/guild/master#master-consults-title'
        when n.kind = 'feedback_report' then '/guild/master#master-feedback-title'
        when n.kind = 'member_joined' then '/guild/members/' || n.actor_id::text
        when n.kind = 'member_pending' then '/guild/master#master-pending-members-title'
        when n.kind = 'profile_draft_waiting' then '/guild/me/status/draft'
        when n.kind in ('profile_draft_applied', 'profile_draft_declined') then '/guild/members/' || n.actor_id::text
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

notify pgrst, 'reload schema';
