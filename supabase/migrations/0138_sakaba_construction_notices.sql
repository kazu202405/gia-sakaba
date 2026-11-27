-- 0138: 建設・不動産の酒場の通知を、既存のおしらせとWeb Push配信につなぐ。
begin;

alter table sakaba.notifications drop constraint notifications_kind_check;
alter table sakaba.notifications add constraint notifications_kind_check check (kind in (
  'quest_applied', 'quest_updated', 'quest_withdrawn', 'intro_progress',
  'gathering_approved', 'gathering_declined', 'schedule_decided', 'consult_request', 'feedback_report',
  'member_joined', 'member_pending', 'profile_draft_waiting', 'profile_draft_applied', 'profile_draft_declined',
  'construction_reply', 'construction_connection_request', 'construction_intro_request', 'construction_intro_progress'
));

-- 通知には案件や相手の名前を保存しない。到着先の画面で改めて権限を判定する。
create function sakaba.construction_emit_notification(p_guild_id uuid, p_recipient uuid, p_kind text)
returns void
language sql
set search_path = ''
as $$
  insert into sakaba.notifications (guild_id, user_id, kind)
  select p_guild_id, p_recipient, p_kind
  where exists (select 1 from sakaba.guilds g where g.id = p_guild_id and g.slug = 'kensetsu-fudosan')
    and sakaba.member_gate_state(p_guild_id, p_recipient) = 'active'
$$;

create function sakaba.construction_notify_reply()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform sakaba.construction_emit_notification(p.guild_id, p.author_id, 'construction_reply')
  from sakaba.construction_posts p
  where p.guild_id = new.guild_id and p.id = new.post_id and p.author_id <> new.author_id;
  return new;
end;
$$;
create trigger construction_notify_reply
after insert on sakaba.construction_post_replies
for each row execute function sakaba.construction_notify_reply();

create function sakaba.construction_notify_connection()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' then
    perform sakaba.construction_emit_notification(new.guild_id,
      case when new.requested_by = new.user_low then new.user_high else new.user_low end,
      'construction_connection_request');
  end if;
  return new;
end;
$$;
create trigger construction_notify_connection
after insert on sakaba.construction_connections
for each row execute function sakaba.construction_notify_connection();

create function sakaba.construction_notify_intro()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_request sakaba.construction_introductions%rowtype;
begin
  select i.* into strict v_request
  from sakaba.construction_introductions i
  where i.guild_id = new.guild_id and i.id = new.introduction_id;
  case new.status
    when 'requested' then
      perform sakaba.construction_emit_notification(new.guild_id, v_request.introducer_id, 'construction_intro_request');
    when 'asking_target' then
      perform sakaba.construction_emit_notification(new.guild_id, v_request.target_id, 'construction_intro_request');
      perform sakaba.construction_emit_notification(new.guild_id, v_request.requester_id, 'construction_intro_progress');
    when 'declined_by_introducer' then
      perform sakaba.construction_emit_notification(new.guild_id, v_request.requester_id, 'construction_intro_progress');
    else
      perform sakaba.construction_emit_notification(new.guild_id, v_request.requester_id, 'construction_intro_progress');
      perform sakaba.construction_emit_notification(new.guild_id, v_request.introducer_id, 'construction_intro_progress');
  end case;
  return new;
end;
$$;
create trigger construction_notify_intro
after insert on sakaba.construction_intro_events
for each row execute function sakaba.construction_notify_intro();

revoke all on function sakaba.construction_emit_notification(uuid, uuid, text),
  sakaba.construction_notify_reply(), sakaba.construction_notify_connection(), sakaba.construction_notify_intro()
from public, anon, authenticated, service_role;

-- 0135の配信候補に、建設店の通知文とリンク先を追加する。
create or replace function public.sakaba_push_candidates()
 RETURNS TABLE(event_key text, user_id uuid, category text, body text, href text, occurred_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'sakaba'
AS $function$
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
        when 'construction_reply' then '案件に返信が届きました'
        when 'construction_connection_request' then 'つながりの申請が届きました'
        when 'construction_intro_request' then '紹介依頼が届きました'
        when 'construction_intro_progress' then '紹介依頼に返事が届きました'
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
        when n.kind = 'construction_reply' then '/guild/posts'
        when n.kind in ('construction_connection_request', 'construction_intro_request', 'construction_intro_progress') then '/guild/network'
        when n.quest_id is not null then '/guild/quests/' || n.quest_id::text
        else '/guild/notifications' end as href,
      n.created_at as occurred_at
    from sakaba.notifications n
    left join sakaba.quests q on q.id = n.quest_id
    left join sakaba.guild_profiles ap on ap.guild_id = n.guild_id and ap.user_id = n.actor_id
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
  -- 行き先は、その知らせ・期限のある店の道にする（/guild/requests → /guild/<店>/requests）
  select c.event_key, c.user_id, c.category, c.body,
    '/guild/' || g.slug || substr(c.href, length('/guild/')) as href,
    c.occurred_at
  from candidates c
  join sakaba.guilds g on g.id = c.guild_id
  join sakaba.guild_members gm on gm.guild_id = c.guild_id and gm.user_id = c.user_id and gm.suspended_at is null;
$function$
;

notify pgrst, 'reload schema';
commit;
