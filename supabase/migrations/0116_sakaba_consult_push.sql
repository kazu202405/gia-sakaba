-- エンタープライズの相談が届いたら、管理者にプッシュ通知する（2026-09-28 五島さん）。
-- ・相談を送ると、管理者（owner・master）に sakaba.notifications の行を作る。既存の Webhook（notifications の INSERT）→
--   /api/guild/push/dispatch → sakaba_push_candidates の流れでプッシュされる。
-- ・sakaba_create_consult_request は 0115 から、sakaba_push_candidates は 0103 から写し、足した行だけが違う。

alter table sakaba.notifications drop constraint notifications_kind_check;
alter table sakaba.notifications add constraint notifications_kind_check check (kind in (
  'quest_applied', 'quest_updated', 'quest_withdrawn', 'intro_progress',
  'gathering_approved', 'gathering_declined', 'schedule_decided', 'consult_request'
));

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
  -- 管理者（owner・master）におしらせ。これがプッシュ通知の元になる（0116）
  insert into sakaba.notifications (guild_id, user_id, kind, actor_id)
  select v_guild_id, gm.user_id, 'consult_request', v_user_id
  from sakaba.guild_members gm
  where gm.guild_id = v_guild_id and gm.role in ('owner', 'master') and gm.suspended_at is null and gm.user_id <> v_user_id;
  return v_id;
end;
$$;

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
        else 'しょうかいについておしらせがあります'
      end as body,
      case when n.intro_request_id is not null then '/guild/requests'
        when n.kind = 'quest_applied' and q.members_only and qa.approved_at is null then '/guild/master'
        when n.kind = 'quest_applied' then '/guild/quests/' || n.quest_id::text || '/applicants'
        when n.kind = 'consult_request' then '/guild/master#master-consults-title'
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

notify pgrst, 'reload schema';
