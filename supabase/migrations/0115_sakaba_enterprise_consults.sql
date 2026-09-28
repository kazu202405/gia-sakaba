-- エンタープライズプラン（管理者が事業を手伝う・要相談・初回相談は無料）の「相談する」（2026-09-28 五島さん）。
-- ・会員（どのプランでも）が、相談したいこと（複数選べる）とひとことを送る。届くのは管理者画面だけ。
-- ・月額の決済はしない（契約は個別）。ここは相談の受付と、管理者の対応状況の記録だけ。
-- ・送りすぎ防止：1人24時間に3件まで。

create table sakaba.consult_requests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null,
  user_id uuid not null,
  topics text[] not null,
  message varchar(1000) not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (guild_id, user_id) references sakaba.guild_members (guild_id, user_id) on delete cascade,
  constraint consult_requests_topics_check check (
    cardinality(topics) between 1 and 5 and topics <@ array['dx', 'sales', 'dev', 'intro', 'other']::text[]),
  constraint consult_requests_message_check check (btrim(message) <> ''),
  constraint consult_requests_status_check check (status in ('new', 'contacted', 'closed'))
);
create index consult_requests_guild_idx on sakaba.consult_requests (guild_id, created_at desc);
create index consult_requests_user_idx on sakaba.consult_requests (user_id, created_at desc);
alter table sakaba.consult_requests enable row level security;
revoke all on sakaba.consult_requests from public, anon, authenticated;

-- 会員：相談を送る
create or replace function public.sakaba_create_consult_request(p_guild_slug text, p_topics text[], p_message text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_topics text[];
  v_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct t order by t), '{}') into v_topics from unnest(coalesce(p_topics, '{}')) t;
  if cardinality(v_topics) = 0 or not (v_topics <@ array['dx', 'sales', 'dev', 'intro', 'other']::text[])
     or char_length(btrim(coalesce(p_message, ''))) not between 1 and 1000 then
    raise exception 'invalid consult request' using errcode = '22023';
  end if;
  -- 同時に押しても数がずれないよう、会員の行を押さえてから数える
  perform 1 from sakaba.guild_members gm where gm.guild_id = v_guild_id and gm.user_id = v_user_id for update;
  if (select count(*) from sakaba.consult_requests c
      where c.guild_id = v_guild_id and c.user_id = v_user_id and c.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'too many consult requests' using errcode = '53400';
  end if;
  insert into sakaba.consult_requests (guild_id, user_id, topics, message)
  values (v_guild_id, v_user_id, v_topics, btrim(p_message))
  returning id into v_id;
  return v_id;
end;
$$;

-- 管理者：届いた相談の一覧（新しい順・200件まで）
create or replace function public.sakaba_list_consult_requests(p_guild_slug text default 'gia')
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'user_id', c.user_id, 'display_name', p.display_name,
      'topics', to_jsonb(c.topics), 'message', c.message, 'status', c.status, 'created_at', c.created_at
    ) order by c.created_at desc)
    from (select * from sakaba.consult_requests where guild_id = v_guild_id order by created_at desc limit 200) c
    join sakaba.profiles p on p.user_id = c.user_id
  ), '[]'::jsonb);
end;
$$;

-- 管理者：対応状況を変える（new＝未対応／contacted＝連絡済み／closed＝おわり）
create or replace function public.sakaba_set_consult_request_status(p_request_id uuid, p_status text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select c.guild_id into v_guild_id from sakaba.consult_requests c where c.id = p_request_id;
  if v_user_id is null or v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('new', 'contacted', 'closed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update sakaba.consult_requests set status = p_status, updated_at = now() where id = p_request_id;
end;
$$;

revoke all on function public.sakaba_create_consult_request(text, text[], text) from public, anon;
revoke all on function public.sakaba_list_consult_requests(text) from public, anon;
revoke all on function public.sakaba_set_consult_request_status(uuid, text) from public, anon;
grant execute on function public.sakaba_create_consult_request(text, text[], text) to authenticated;
grant execute on function public.sakaba_list_consult_requests(text) to authenticated;
grant execute on function public.sakaba_set_consult_request_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
