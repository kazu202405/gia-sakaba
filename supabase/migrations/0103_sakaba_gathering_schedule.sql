-- 集まりの日程調整（調整さん方式）。
-- 主催者が候補日を出し、会員とゲスト（招待URL・メール確認済み）が候補日ごとに ○△× と一言コメントを付ける。
-- 主催者が1つに決めると、答えた会員に「日にちが決まりました」のおしらせを送る。
-- 日程の回答は参加の申し込みではない：決まったあとも ○△× に関係なく、今までの申し込み（定員つき）から申し込む。
-- 名前の見え方：主催者＝全員／ほかの会員＝会員の名前・ゲストは「ゲスト」／ゲスト＝人数の集計だけ。

create table sakaba.quest_schedule_options (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references sakaba.quests(id) on delete cascade,
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint quest_schedule_options_unique unique (quest_id, starts_at)
);
create index quest_schedule_options_quest_idx on sakaba.quest_schedule_options (quest_id, starts_at);

create table sakaba.quest_schedule_answers (
  option_id uuid not null references sakaba.quest_schedule_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer text not null,
  updated_at timestamptz not null default now(),
  primary key (option_id, user_id),
  constraint quest_schedule_answers_answer_check check (answer in ('yes', 'maybe', 'no'))
);
create index quest_schedule_answers_user_idx on sakaba.quest_schedule_answers (user_id);

-- 回答した人ごとの一言と、ゲストかどうか（答えた時点で会員でなければゲスト）
create table sakaba.quest_schedule_respondents (
  quest_id uuid not null references sakaba.quests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_guest boolean not null,
  comment varchar(120) not null default '',
  updated_at timestamptz not null default now(),
  primary key (quest_id, user_id)
);

alter table sakaba.quests
  add column schedule_decided_option_id uuid references sakaba.quest_schedule_options(id) on delete set null;

alter table sakaba.quest_schedule_options enable row level security;
alter table sakaba.quest_schedule_answers enable row level security;
alter table sakaba.quest_schedule_respondents enable row level security;
-- 表には直接触らせない（読むのも書くのも下の関数だけ）
revoke all on sakaba.quest_schedule_options, sakaba.quest_schedule_answers, sakaba.quest_schedule_respondents
  from public, anon, authenticated;

alter table sakaba.notifications drop constraint notifications_kind_check;
alter table sakaba.notifications add constraint notifications_kind_check check (kind in (
  'quest_applied', 'quest_updated', 'quest_withdrawn', 'intro_progress',
  'gathering_approved', 'gathering_declined', 'schedule_decided'
));

-- 会員として日程を見て答えられるか：その集まりのギルドの会員で、
-- 限定の集まりなら有料会員か主催者（詳細を読める人と同じ条件）
create or replace function sakaba.can_use_gathering_schedule(p_quest sakaba.quests, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select p_user_id is not null
    and p_quest.category = 'gathering'
    and p_quest.status <> 'withdrawn'
    and sakaba.is_active_member(p_quest.guild_id, p_user_id)
    and (not p_quest.members_only or p_quest.creator_id = p_user_id or sakaba.is_paid_member(p_user_id));
$$;
revoke all on function sakaba.can_use_gathering_schedule(sakaba.quests, uuid) from public, anon, authenticated;

-- 候補日ごとの集計と、回答の一覧（名前の出し方は p_viewer で変える）
-- p_viewer: 'host'＝全員の名前／'member'＝ゲストは名前を伏せる／'guest'＝一覧を返さない
create or replace function sakaba.gathering_schedule_json(p_quest sakaba.quests, p_user_id uuid, p_viewer text)
returns jsonb language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select jsonb_build_object(
    'decided_option_id', p_quest.schedule_decided_option_id,
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'starts_at', o.starts_at,
        'yes', (select count(*) from sakaba.quest_schedule_answers a where a.option_id = o.id and a.answer = 'yes'),
        'maybe', (select count(*) from sakaba.quest_schedule_answers a where a.option_id = o.id and a.answer = 'maybe'),
        'no', (select count(*) from sakaba.quest_schedule_answers a where a.option_id = o.id and a.answer = 'no')
      ) order by o.starts_at)
      from sakaba.quest_schedule_options o where o.quest_id = p_quest.id
    ), '[]'::jsonb),
    'respondents', case when p_viewer = 'guest' then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'is_me', r.user_id = p_user_id,
        'is_guest', r.is_guest,
        'name', case
          when r.user_id = p_user_id or not r.is_guest or p_viewer = 'host'
            then coalesce(case when r.is_guest then gp.display_name else pr.display_name end, '（名前なし）')
          else 'ゲスト' end,
        'comment', r.comment,
        'answers', coalesce((
          select jsonb_object_agg(a.option_id::text, a.answer)
          from sakaba.quest_schedule_answers a
          join sakaba.quest_schedule_options o on o.id = a.option_id
          where o.quest_id = p_quest.id and a.user_id = r.user_id
        ), '{}'::jsonb)
      ) order by r.updated_at)
      from sakaba.quest_schedule_respondents r
      left join sakaba.profiles pr on pr.user_id = r.user_id
      left join sakaba.guest_profiles gp on gp.user_id = r.user_id
      where r.quest_id = p_quest.id
    ), '[]'::jsonb) end,
    'my_comment', (select r.comment from sakaba.quest_schedule_respondents r where r.quest_id = p_quest.id and r.user_id = p_user_id),
    'my_answers', coalesce((
      select jsonb_object_agg(a.option_id::text, a.answer)
      from sakaba.quest_schedule_answers a
      join sakaba.quest_schedule_options o on o.id = a.option_id
      where o.quest_id = p_quest.id and a.user_id = p_user_id
    ), '{}'::jsonb)
  );
$$;
revoke all on function sakaba.gathering_schedule_json(sakaba.quests, uuid, text) from public, anon, authenticated;

-- 回答を保存する共通部分。p_answers は {候補日のid: 'yes'|'maybe'|'no'}。書いていない候補日は「未回答」に戻す
create or replace function sakaba.save_gathering_schedule_answers(
  p_quest sakaba.quests, p_user_id uuid, p_is_guest boolean, p_answers jsonb, p_comment text
)
returns void language plpgsql security definer
set search_path = pg_catalog, sakaba as $$
declare
  v_key text;
  v_value text;
begin
  if p_quest.status <> 'open' or p_quest.schedule_decided_option_id is not null then
    raise exception 'schedule is closed' using errcode = '22023';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or char_length(btrim(coalesce(p_comment, ''))) > 120 then
    raise exception 'invalid schedule answers' using errcode = '22023';
  end if;
  for v_key, v_value in select key, value from jsonb_each_text(p_answers) loop
    if v_value not in ('yes', 'maybe', 'no') or not exists (
      select 1 from sakaba.quest_schedule_options o where o.quest_id = p_quest.id and o.id::text = v_key
    ) then
      raise exception 'invalid schedule answers' using errcode = '22023';
    end if;
  end loop;

  delete from sakaba.quest_schedule_answers a
  using sakaba.quest_schedule_options o
  where o.id = a.option_id and o.quest_id = p_quest.id and a.user_id = p_user_id
    and not (p_answers ? o.id::text);
  insert into sakaba.quest_schedule_answers (option_id, user_id, answer)
  select key::uuid, p_user_id, value from jsonb_each_text(p_answers)
  on conflict (option_id, user_id) do update set answer = excluded.answer, updated_at = now();

  insert into sakaba.quest_schedule_respondents (quest_id, user_id, is_guest, comment)
  values (p_quest.id, p_user_id, p_is_guest, btrim(coalesce(p_comment, '')))
  on conflict (quest_id, user_id) do update
    set is_guest = excluded.is_guest, comment = excluded.comment, updated_at = now();
end;
$$;
revoke all on function sakaba.save_gathering_schedule_answers(sakaba.quests, uuid, boolean, jsonb, text) from public, anon, authenticated;

-- 主催者：候補日を置き換える（同じ日時の候補日と、その回答は残す）。決まったあとは変えられない
create or replace function public.sakaba_set_gathering_schedule(p_quest_id uuid, p_starts timestamptz[])
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_starts timestamptz[];
begin
  select * into v_quest from sakaba.quests where id = p_quest_id for update;
  if not found or v_user_id is null or v_quest.creator_id <> v_user_id
     or not sakaba.can_use_gathering_schedule(v_quest, v_user_id) then
    raise exception 'gathering host access required' using errcode = '42501';
  end if;
  if v_quest.status <> 'open' or v_quest.schedule_decided_option_id is not null then
    raise exception 'schedule is closed' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct s), '{}') into v_starts from unnest(coalesce(p_starts, '{}')) s where s is not null;
  if cardinality(v_starts) > 10 then
    raise exception 'too many schedule options' using errcode = '22023';
  end if;

  delete from sakaba.quest_schedule_options o
  where o.quest_id = p_quest_id and not (o.starts_at = any(v_starts));
  insert into sakaba.quest_schedule_options (quest_id, starts_at)
  select p_quest_id, s from unnest(v_starts) s
  on conflict (quest_id, starts_at) do nothing;
  -- 候補日がなくなった人の一言だけが残らないように、回答が1つもない人は外す
  delete from sakaba.quest_schedule_respondents r
  where r.quest_id = p_quest_id and not exists (
    select 1 from sakaba.quest_schedule_answers a
    join sakaba.quest_schedule_options o on o.id = a.option_id
    where o.quest_id = p_quest_id and a.user_id = r.user_id
  ) and r.comment = '';
end;
$$;

-- 会員：日程を見る
create or replace function public.sakaba_get_gathering_schedule(p_quest_id uuid)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
begin
  select * into v_quest from sakaba.quests where id = p_quest_id;
  if not found or not sakaba.can_use_gathering_schedule(v_quest, v_user_id) then
    raise exception 'gathering schedule not available' using errcode = '42501';
  end if;
  return sakaba.gathering_schedule_json(v_quest, v_user_id,
    case when v_quest.creator_id = v_user_id then 'host' else 'member' end)
    || jsonb_build_object('is_host', v_quest.creator_id = v_user_id);
end;
$$;

-- 会員：答える
create or replace function public.sakaba_answer_gathering_schedule(p_quest_id uuid, p_answers jsonb, p_comment text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
begin
  select * into v_quest from sakaba.quests where id = p_quest_id for update;
  if not found or not sakaba.can_use_gathering_schedule(v_quest, v_user_id) then
    raise exception 'gathering schedule not available' using errcode = '42501';
  end if;
  perform sakaba.save_gathering_schedule_answers(v_quest, v_user_id, false, p_answers, p_comment);
end;
$$;

-- 主催者：1つに決める（p_option_id が null なら決定を取り消す）。決めたら、答えた会員におしらせ
create or replace function public.sakaba_decide_gathering_schedule(p_quest_id uuid, p_option_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
begin
  select * into v_quest from sakaba.quests where id = p_quest_id for update;
  if not found or v_user_id is null or v_quest.creator_id <> v_user_id
     or not sakaba.can_use_gathering_schedule(v_quest, v_user_id) then
    raise exception 'gathering host access required' using errcode = '42501';
  end if;
  if v_quest.status <> 'open' then
    raise exception 'schedule is closed' using errcode = '22023';
  end if;
  if p_option_id is not null and not exists (
    select 1 from sakaba.quest_schedule_options o where o.id = p_option_id and o.quest_id = p_quest_id
  ) then
    raise exception 'invalid schedule option' using errcode = '22023';
  end if;
  if p_option_id is not distinct from v_quest.schedule_decided_option_id then
    return;
  end if;

  update sakaba.quests set schedule_decided_option_id = p_option_id, updated_at = now() where id = p_quest_id;

  if p_option_id is not null then
    insert into sakaba.notifications (guild_id, user_id, kind, actor_id, quest_id)
    select v_quest.guild_id, r.user_id, 'schedule_decided', v_user_id, p_quest_id
    from sakaba.quest_schedule_respondents r
    where r.quest_id = p_quest_id and not r.is_guest and r.user_id <> v_user_id
      and sakaba.is_active_member(v_quest.guild_id, r.user_id);
  end if;
end;
$$;

-- ゲスト：招待URLで日程を見る（人数の集計と、自分の回答だけ）
create or replace function public.sakaba_get_guest_gathering_schedule(p_token text)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
begin
  select q.* into v_quest
  from sakaba.quest_guest_links l join sakaba.quests q on q.id = l.quest_id
  where l.token = p_token and q.category = 'gathering' and not q.members_only and q.status <> 'withdrawn'
    and sakaba.is_active_member(q.guild_id, q.creator_id);
  if not found then return null; end if;
  return sakaba.gathering_schedule_json(v_quest, v_user_id, 'guest')
    || jsonb_build_object('my_name', (select gp.display_name from sakaba.guest_profiles gp where gp.user_id = v_user_id));
end;
$$;

-- ゲスト：招待URLで答える（メール確認済みのアカウントが必要。名前はゲストの登録に保存する）
create or replace function public.sakaba_answer_guest_gathering_schedule(
  p_token text, p_display_name text, p_answers jsonb, p_comment text
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_is_member boolean;
begin
  if v_user_id is null or not exists (
    select 1 from auth.users u where u.id = v_user_id and u.email_confirmed_at is not null
  ) then
    raise exception 'verified email required' using errcode = '42501';
  end if;
  select q.* into v_quest
  from sakaba.quest_guest_links l join sakaba.quests q on q.id = l.quest_id
  where l.token = p_token and q.category = 'gathering' and not q.members_only
    and sakaba.is_active_member(q.guild_id, q.creator_id)
  for update of q;
  if not found then
    raise exception 'gathering schedule not available' using errcode = '42501';
  end if;
  v_is_member := sakaba.is_active_member(v_quest.guild_id, v_user_id);
  if not v_is_member then
    if nullif(btrim(p_display_name), '') is null or char_length(btrim(p_display_name)) > 30 then
      raise exception 'invalid guest profile' using errcode = '22023';
    end if;
    insert into sakaba.guest_profiles (user_id, display_name)
    values (v_user_id, btrim(p_display_name))
    on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now();
  end if;
  perform sakaba.save_gathering_schedule_answers(v_quest, v_user_id, not v_is_member, p_answers, p_comment);
end;
$$;

revoke all on function public.sakaba_set_gathering_schedule(uuid, timestamptz[]) from public, anon;
revoke all on function public.sakaba_get_gathering_schedule(uuid) from public, anon;
revoke all on function public.sakaba_answer_gathering_schedule(uuid, jsonb, text) from public, anon;
revoke all on function public.sakaba_decide_gathering_schedule(uuid, uuid) from public, anon;
revoke all on function public.sakaba_get_guest_gathering_schedule(text) from public;
revoke all on function public.sakaba_answer_guest_gathering_schedule(text, text, jsonb, text) from public, anon;
grant execute on function public.sakaba_set_gathering_schedule(uuid, timestamptz[]) to authenticated;
grant execute on function public.sakaba_get_gathering_schedule(uuid) to authenticated;
grant execute on function public.sakaba_answer_gathering_schedule(uuid, jsonb, text) to authenticated;
grant execute on function public.sakaba_decide_gathering_schedule(uuid, uuid) to authenticated;
grant execute on function public.sakaba_get_guest_gathering_schedule(text) to anon, authenticated;
grant execute on function public.sakaba_answer_guest_gathering_schedule(text, text, jsonb, text) to authenticated;

-- プッシュ通知の文面に「日にちが決まりました」を足す。
-- 0099 の sakaba_push_candidates を丸ごと写し、'schedule_decided' の1行だけを足している（ほかは1文字も変えていない）

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
        else 'しょうかいについておしらせがあります'
      end as body,
      case when n.intro_request_id is not null then '/guild/requests'
        when n.kind = 'quest_applied' and q.members_only and qa.approved_at is null then '/guild/master'
        when n.kind = 'quest_applied' then '/guild/quests/' || n.quest_id::text || '/applicants'
        when n.quest_id is not null then '/guild/quests/' || n.quest_id::text
        else '/guild/notifications' end as href,
      n.created_at as occurred_at
    from sakaba.notifications n
    left join sakaba.quests q on q.id = n.quest_id
    left join sakaba.quest_applications qa on qa.quest_id = n.quest_id and qa.user_id = n.actor_id
    where n.created_at >= now() - interval '2 days'
      and (n.kind <> 'quest_applied' or qa.status = 'applied')
    union all
    select 'task:' || t.id::text || ':' || d.day::text, p.guild_id, t.assignee_id, 'deadlines',
      '担当タスクの期限が明日です', '/guild/projects/' || t.project_id::text, now()
    from sakaba.project_tasks t
    join sakaba.projects p on p.id = t.project_id
    cross join tomorrow d
    where t.status = 'todo' and p.status = 'active' and t.due_date = d.day and t.assignee_id is not null
      and (t.assignee_id = p.owner_id or exists (
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

revoke all on function public.sakaba_push_candidates() from public, anon, authenticated;
grant execute on function public.sakaba_push_candidates() to service_role;

notify pgrst, 'reload schema';
