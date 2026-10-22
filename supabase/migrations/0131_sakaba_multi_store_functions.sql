-- 酒場を複数の店に分ける（段階1）：店を決め打ちしていた関数を、店を受けるようにする（2026-10-22）。
-- 仕様：contexts/projects/gia/sakaba_multi_store_spec.md
--
-- ・sakaba_get_prepared_invite（0111）：g.slug = 'gia' の決め打ちをやめ、店の引数 p_guild_slug を任意で受ける。
--   指定なし＝招待コードが指す店のまま（コードそのものが鍵）。指定あり＝その店の招待だけ返す
-- ・sakaba_get_shared_profile（0121）：lower(g.slug) = 'gia' の決め打ちをやめ、p_guild_slug を任意で受ける。
--   指定なし＝本人が最初に入った（抜けていない）店。URLは人ごと1本のまま（店ごとには増やさない）
-- ・sakaba_push_candidates（0130）：行き先を /guild/<店>/… にする（古い /guild/… も転送されるが、通知は最初から正しい店へ）
-- ・本文は 0111 / 0121 / 0130 の最新の定義をそのまま写し、変えたのは上の点だけ
-- ・引数が増えるので、古い版（引数が少ないもの）は消す。残すと同じ名前が2つになり、呼び出しが曖昧になる

drop function if exists public.sakaba_get_prepared_invite(text);
drop function if exists public.sakaba_get_shared_profile(text);

create or replace function public.sakaba_get_prepared_invite(p_code text, p_guild_slug text default null)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_result jsonb;
begin
  if nullif(btrim(coalesce(p_code, '')), '') is null then return null; end if;
  select jsonb_build_object(
    'display_name', p.display_name, 'company_name', p.company_name,
    'position', p.position, 'introduction', p.introduction
  ) into v_result
  from sakaba.invites i
  join sakaba.prepared_invites p on p.invite_id = i.id
  join sakaba.guilds g on g.id = i.guild_id
  where lower(i.code) = lower(btrim(p_code))
    and (nullif(btrim(coalesce(p_guild_slug, '')), '') is null or lower(g.slug) = lower(btrim(p_guild_slug)))
    and i.revoked_at is null and (i.expires_at is null or i.expires_at >= now())
    and i.used_count < i.max_uses;
  return v_result;
end;
$$;

create or replace function public.sakaba_get_shared_profile(p_token text, p_guild_slug text default null)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_share sakaba.profile_shares;
  v_guild_id uuid;
  v_member sakaba.guild_members;
  v_profile sakaba.profiles;
  v_industry text;
  v_keywords jsonb;
  v_intros jsonb := '[]'::jsonb;
  v_card jsonb := null;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into v_share from sakaba.profile_shares where token = p_token and enabled;
  if not found then return null; end if;
  -- 店の指定があればその店。なければ本人が最初に入った（まだ抜けていない）店
  if nullif(btrim(coalesce(p_guild_slug, '')), '') is not null then
    select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  else
    select gm.guild_id into v_guild_id from sakaba.guild_members gm
    where gm.user_id = v_share.user_id and gm.suspended_at is null
    order by gm.joined_at, gm.guild_id limit 1;
  end if;
  if v_guild_id is null then return null; end if;
  select * into v_member from sakaba.guild_members gm
  where gm.guild_id = v_guild_id and gm.user_id = v_share.user_id and gm.suspended_at is null;
  if not found then return null; end if;
  select * into v_profile from sakaba.profiles p where p.user_id = v_share.user_id;
  if not found then return null; end if;

  select t.name into v_industry
  from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
  where pt.user_id = v_share.user_id and t.kind = 'industry' and t.is_active
  limit 1;

  if v_share.show_profile then
    select coalesce(jsonb_agg(t.name order by t.name), '[]'::jsonb) into v_keywords
    from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
    where pt.user_id = v_share.user_id and t.kind = 'keyword' and t.is_active;
  end if;

  if v_share.show_card and v_profile.business_card_agreed_at is not null
     and (v_profile.business_card_front is not null or v_profile.business_card_back is not null) then
    v_card := jsonb_build_object('front', v_profile.business_card_front, 'back', v_profile.business_card_back);
  end if;

  if v_share.show_intros then
    select coalesce(jsonb_agg(jsonb_build_object(
      'body', x.body,
      'created_at', x.created_at,
      'author_name', case when v_share.show_intro_authors then x.author_name else null end
    ) order by x.updated_at desc), '[]'::jsonb) into v_intros
    from (
      select mi.body, mi.created_at, mi.updated_at, ap.display_name as author_name
      from sakaba.member_introductions mi
      join sakaba.profiles ap on ap.user_id = mi.author_id
      join sakaba.guild_members agm on agm.guild_id = mi.guild_id and agm.user_id = mi.author_id and agm.suspended_at is null
      where mi.guild_id = v_guild_id and mi.target_id = v_share.user_id
      order by mi.updated_at desc
      limit 20
    ) x;
  end if;

  return jsonb_build_object(
    'display_name', v_profile.display_name,
    'photo_url', v_profile.photo_url,
    'headline', v_profile.headline,
    'job', v_profile.job,
    'job_icon', v_profile.job_icon,
    'region', v_profile.region,
    'industry', v_industry,
    'company_name', case when v_member.show_company then v_member.company_name else null end,
    'position', case when v_member.show_company then v_member.position else null end,
    'bio', case when v_share.show_profile then v_profile.bio else null end,
    'values_text', case when v_share.show_profile then v_profile.values_text else null end,
    'looking_for', case when v_share.show_profile then v_profile.looking_for else null end,
    'keywords', case when v_share.show_profile then v_keywords else null end,
    'hobbies', case when v_share.show_personal then v_profile.hobbies else null end,
    'life_story', case when v_share.show_personal then v_profile.life_story else null end,
    'business_card', v_card,
    'introductions', case when v_share.show_intros then v_intros else null end
  );
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
  -- 行き先は、その知らせ・期限のある店の道にする（/guild/requests → /guild/<店>/requests）
  select c.event_key, c.user_id, c.category, c.body,
    '/guild/' || g.slug || substr(c.href, length('/guild/')) as href,
    c.occurred_at
  from candidates c
  join sakaba.guilds g on g.id = c.guild_id
  join sakaba.guild_members gm on gm.guild_id = c.guild_id and gm.user_id = c.user_id and gm.suspended_at is null;
$$;

revoke all on function public.sakaba_get_prepared_invite(text, text) from public, anon, authenticated;
grant execute on function public.sakaba_get_prepared_invite(text, text) to anon, authenticated;
revoke all on function public.sakaba_get_shared_profile(text, text) from public;
grant execute on function public.sakaba_get_shared_profile(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
