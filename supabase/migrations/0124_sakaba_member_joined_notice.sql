-- 新しいメンバーが入会したら、オーナー（五島さんだけ）におしらせとプッシュ通知を送る（2026-10-01 五島さん）。
-- ・入会の経路が複数あるため（招待・集まりのゲスト・下書き招待）、関数ごとに足さず、
--   sakaba.guild_members への INSERT（role = 'member'）のトリガーで1か所にする
-- ・おしらせの行ができると、既存の Webhook（notifications の INSERT）→ /api/guild/push/dispatch →
--   sakaba_push_candidates の流れでプッシュされる（0116 と同じ）
-- ・通知を作れなくても入会は止めない（例外は握って警告だけ残す）
-- ・sakaba_push_candidates は 0117 の本文をそのまま写し、member_joined の3行だけを足した（手で打ち直していない）

alter table sakaba.notifications drop constraint notifications_kind_check;
alter table sakaba.notifications add constraint notifications_kind_check check (kind in (
  'quest_applied', 'quest_updated', 'quest_withdrawn', 'intro_progress',
  'gathering_approved', 'gathering_declined', 'schedule_decided', 'consult_request', 'feedback_report',
  'member_joined'
));

create or replace function sakaba.notify_owner_member_joined()
returns trigger language plpgsql security definer
set search_path = pg_catalog, sakaba as $$
begin
  begin
    insert into sakaba.notifications (guild_id, user_id, kind, actor_id)
    select new.guild_id, gm.user_id, 'member_joined', new.user_id
    from sakaba.guild_members gm
    where gm.guild_id = new.guild_id and gm.role = 'owner' and gm.suspended_at is null and gm.user_id <> new.user_id;
  exception when others then
    raise warning 'member_joined notice failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function sakaba.notify_owner_member_joined() from public;

create trigger guild_members_notify_owner_joined
after insert on sakaba.guild_members
for each row when (new.role = 'member')
execute function sakaba.notify_owner_member_joined();

-- ---------- プッシュ通知の候補（0117 から写した） ----------

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
        else 'しょうかいについておしらせがあります'
      end as body,
      case when n.intro_request_id is not null then '/guild/requests'
        when n.kind = 'quest_applied' and q.members_only and qa.approved_at is null then '/guild/master'
        when n.kind = 'quest_applied' then '/guild/quests/' || n.quest_id::text || '/applicants'
        when n.kind = 'consult_request' then '/guild/master#master-consults-title'
        when n.kind = 'feedback_report' then '/guild/master#master-feedback-title'
        when n.kind = 'member_joined' then '/guild/members/' || n.actor_id::text
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
