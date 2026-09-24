-- Web Push is opt-in per device. Endpoints and encryption keys must never be public.
create table public.sakaba_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sakaba_push_subscription_shape check (
    length(endpoint) between 20 and 2048
    and subscription->>'endpoint' = endpoint
    and length(coalesce(subscription->'keys'->>'p256dh', '')) > 20
    and length(coalesce(subscription->'keys'->>'auth', '')) > 10
  )
);
create index sakaba_push_subscriptions_user_idx on public.sakaba_push_subscriptions (user_id);
alter table public.sakaba_push_subscriptions enable row level security;
create policy sakaba_push_subscriptions_own_select on public.sakaba_push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy sakaba_push_subscriptions_own_insert on public.sakaba_push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy sakaba_push_subscriptions_own_update on public.sakaba_push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sakaba_push_subscriptions_own_delete on public.sakaba_push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.sakaba_push_subscriptions to authenticated;
grant select, insert, update, delete on public.sakaba_push_subscriptions to service_role;

create table public.sakaba_push_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  actions_enabled boolean not null default true,
  deadlines_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.sakaba_push_preferences enable row level security;
create policy sakaba_push_preferences_own_select on public.sakaba_push_preferences
  for select to authenticated using (user_id = auth.uid());
create policy sakaba_push_preferences_own_insert on public.sakaba_push_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy sakaba_push_preferences_own_update on public.sakaba_push_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.sakaba_push_preferences to authenticated;
grant select, insert, update, delete on public.sakaba_push_preferences to service_role;

-- A unique key per device and event makes retries safe when the scheduler overlaps.
create table public.sakaba_push_deliveries (
  subscription_id uuid not null references public.sakaba_push_subscriptions(id) on delete cascade,
  event_key text not null,
  created_at timestamptz not null default now(),
  primary key (subscription_id, event_key)
);
create index sakaba_push_deliveries_created_idx on public.sakaba_push_deliveries (created_at);
alter table public.sakaba_push_deliveries enable row level security;
grant select, insert, delete on public.sakaba_push_deliveries to service_role;

-- Called only by the server with service_role. All recipients are active guild members.
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
