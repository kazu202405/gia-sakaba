-- タスクのしめきりと、ご意見・不具合の報告（2026-09-28 五島さん）。
-- 1) タスクの名前をなおすときに、しめきりも一緒になおせるようにする（足すときは 0081 の sakaba_add_project_task がもともと受け取れる）。
--    0100 の sakaba_update_project_task(uuid, text) はそのまま残す（名前だけ送る古い画面が、しめきりを消してしまわないように）。
-- 2) 会員が「ご意見・不具合」を送る。届くのは管理者画面だけ。管理者にはプッシュ通知（0116 の相談と同じ流れ）。
--    送りすぎ防止：1人24時間に10件まで。
-- 3) sakaba_push_candidates は 0116 から写し、違うのは次の2点だけ：
--    ・feedback_report の文面と行き先
--    ・タスクの期限前日の知らせを、担当が「きまっていない」タスクでも持ち主に送る
--      （ホームの「しめきりが近いタスク」と同じ判定＝lib/guild/projects.ts の isMyTask）

-- ---------- 1) タスクのしめきり ----------

create or replace function public.sakaba_update_project_task(p_task_id uuid, p_title text, p_due_date date)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_start date;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 100 then
    raise exception 'invalid task fields' using errcode = '22023';
  end if;

  select t.start_date into v_start
  from sakaba.project_tasks t
  join sakaba.projects p on p.id = t.project_id
  where t.id = p_task_id and p.owner_id = v_user_id
    and p.status = 'active' and sakaba.is_active_member(p.guild_id, v_user_id);
  if not found then
    raise exception 'task not found or access denied' using errcode = '42501';
  end if;
  -- はじめる日より前のしめきりは入れられない（表の制約 project_tasks_date_order と同じ）
  if p_due_date is not null and v_start is not null and p_due_date < v_start then
    raise exception 'invalid task fields' using errcode = '22023';
  end if;

  update sakaba.project_tasks set title = btrim(p_title), due_date = p_due_date, updated_at = now()
  where id = p_task_id;
end;
$$;

revoke all on function public.sakaba_update_project_task(uuid, text, date) from public;
revoke all on function public.sakaba_update_project_task(uuid, text, date) from anon;
grant execute on function public.sakaba_update_project_task(uuid, text, date) to authenticated;

-- ---------- 2) ご意見・不具合の報告 ----------

create table sakaba.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null,
  user_id uuid not null,
  kind text not null,
  message varchar(2000) not null,
  -- 送ったときに開いていた画面（例：/guild/projects/…）。どこで起きたかを管理者が見るため
  page_path varchar(300),
  user_agent varchar(400),
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (guild_id, user_id) references sakaba.guild_members (guild_id, user_id) on delete cascade,
  constraint feedback_reports_kind_check check (kind in ('bug', 'idea', 'other')),
  constraint feedback_reports_message_check check (btrim(message) <> ''),
  constraint feedback_reports_status_check check (status in ('new', 'done'))
);
create index feedback_reports_guild_idx on sakaba.feedback_reports (guild_id, created_at desc);
create index feedback_reports_user_idx on sakaba.feedback_reports (user_id, created_at desc);
alter table sakaba.feedback_reports enable row level security;
revoke all on sakaba.feedback_reports from public, anon, authenticated;

alter table sakaba.notifications drop constraint notifications_kind_check;
alter table sakaba.notifications add constraint notifications_kind_check check (kind in (
  'quest_applied', 'quest_updated', 'quest_withdrawn', 'intro_progress',
  'gathering_approved', 'gathering_declined', 'schedule_decided', 'consult_request', 'feedback_report'
));

-- 会員：送る
create or replace function public.sakaba_create_feedback_report(
  p_guild_slug text, p_kind text, p_message text, p_page_path text default null, p_user_agent text default null
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_id uuid;
begin
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('bug', 'idea', 'other')
     or char_length(btrim(coalesce(p_message, ''))) not between 1 and 2000 then
    raise exception 'invalid feedback report' using errcode = '22023';
  end if;
  -- 同時に押しても数がずれないよう、会員の行を押さえてから数える
  perform 1 from sakaba.guild_members gm where gm.guild_id = v_guild_id and gm.user_id = v_user_id for update;
  if (select count(*) from sakaba.feedback_reports f
      where f.guild_id = v_guild_id and f.user_id = v_user_id and f.created_at > now() - interval '24 hours') >= 10 then
    raise exception 'too many feedback reports' using errcode = '53400';
  end if;
  insert into sakaba.feedback_reports (guild_id, user_id, kind, message, page_path, user_agent)
  values (v_guild_id, v_user_id, p_kind, btrim(p_message),
    -- 画面の道だけを残す（/ で始まらないもの・長すぎるものは捨てる）
    case when left(p_page_path, 1) = '/' and char_length(p_page_path) <= 300 then p_page_path end,
    left(nullif(btrim(coalesce(p_user_agent, '')), ''), 400))
  returning id into v_id;
  -- 管理者（owner・master）におしらせ。これがプッシュ通知の元になる
  insert into sakaba.notifications (guild_id, user_id, kind, actor_id)
  select v_guild_id, gm.user_id, 'feedback_report', v_user_id
  from sakaba.guild_members gm
  where gm.guild_id = v_guild_id and gm.role in ('owner', 'master') and gm.suspended_at is null and gm.user_id <> v_user_id;
  return v_id;
end;
$$;

-- 管理者：届いたものの一覧（新しい順・200件まで）
create or replace function public.sakaba_list_feedback_reports(p_guild_slug text default 'gia')
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
      'id', f.id, 'user_id', f.user_id, 'display_name', p.display_name,
      'kind', f.kind, 'message', f.message, 'page_path', f.page_path, 'user_agent', f.user_agent,
      'status', f.status, 'created_at', f.created_at
    ) order by f.created_at desc)
    from (select * from sakaba.feedback_reports where guild_id = v_guild_id order by created_at desc limit 200) f
    join sakaba.profiles p on p.user_id = f.user_id
  ), '[]'::jsonb);
end;
$$;

-- 管理者：対応状況を変える（new＝未対応／done＝対応ずみ）
create or replace function public.sakaba_set_feedback_report_status(p_report_id uuid, p_status text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
begin
  select f.guild_id into v_guild_id from sakaba.feedback_reports f where f.id = p_report_id;
  if v_user_id is null or v_guild_id is null or not sakaba.is_guild_master(v_guild_id, v_user_id) then
    raise exception 'guild master required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('new', 'done') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update sakaba.feedback_reports set status = p_status, updated_at = now() where id = p_report_id;
end;
$$;

revoke all on function public.sakaba_create_feedback_report(text, text, text, text, text) from public, anon;
revoke all on function public.sakaba_list_feedback_reports(text) from public, anon;
revoke all on function public.sakaba_set_feedback_report_status(uuid, text) from public, anon;
grant execute on function public.sakaba_create_feedback_report(text, text, text, text, text) to authenticated;
grant execute on function public.sakaba_list_feedback_reports(text) to authenticated;
grant execute on function public.sakaba_set_feedback_report_status(uuid, text) to authenticated;

-- ---------- 3) プッシュ通知の候補（0116 から写した） ----------

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
        else 'しょうかいについておしらせがあります'
      end as body,
      case when n.intro_request_id is not null then '/guild/requests'
        when n.kind = 'quest_applied' and q.members_only and qa.approved_at is null then '/guild/master'
        when n.kind = 'quest_applied' then '/guild/quests/' || n.quest_id::text || '/applicants'
        when n.kind = 'consult_request' then '/guild/master#master-consults-title'
        when n.kind = 'feedback_report' then '/guild/master#master-feedback-title'
        when n.quest_id is not null then '/guild/quests/' || n.quest_id::text
        else '/guild/notifications' end as href,
      n.created_at as occurred_at
    from sakaba.notifications n
    left join sakaba.quests q on q.id = n.quest_id
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
