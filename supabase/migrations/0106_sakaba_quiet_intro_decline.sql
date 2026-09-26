-- つながり申請（紹介の申請）を、断られたことが分からない形にする（2026-09-26 五島さん決定）。
-- ・申請には14日の期限。相手が「今回は見送る」を押しても申請した人には知らせず、期限までは「お返事待ち」、
--   期限が過ぎたら返事がなかった場合と同じく「取り下げました」に見せる。更新日時も見送りで動いたことが分からないようにする。
-- ・見送られた相手へ期限内に申請し直しても「お返事待ち」と同じ答えで断る。見送り済みでも申請した人は普通に取り下げられる。
-- ・承諾するときに200文字までのひとことを添えられる（承諾後に当事者2人だけに見える）。
-- 関数は 0094 の本体を写し、ここに書いた点だけを変えている。

alter table sakaba.intro_requests
  add column accept_message varchar(200) not null default '';

-- いまお返事待ちの申請は、今日から14日を期限にする
update sakaba.intro_requests
set expires_at = now() + interval '14 days'
where status = 'proposed' and expires_at is null;

-- 引数を1つ足すので、古い形（2引数）は消してから作る
drop function if exists public.sakaba_act_on_intro_request(uuid, text);

create or replace function public.sakaba_list_intro_requests(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ir.id, 'requester_id', ir.requester_id, 'target_id', ir.target_id,
    'quest_id', ir.quest_id, 'purpose', ir.purpose,
    'message', ir.message,
    'status', shown.status, 'outcome', ir.outcome,
    'created_at', ir.created_at, 'updated_at', shown.updated_at,
    'expires_at', ir.expires_at,
    'accept_message', case when ir.status in ('accepted', 'introduced') then ir.accept_message else '' end,
    'other_contact', case
      when ir.status in ('accepted', 'introduced')
        and v_user_id in (ir.requester_id, ir.target_id)
        and sakaba.is_active_member(v_guild_id, ir.requester_id)
        and sakaba.is_active_member(v_guild_id, ir.target_id)
      then jsonb_build_object(
        'email', case when other_pc.email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then other_pc.email else '' end,
        'line_url', case when other_pc.line_url ~* '^https?://' then other_pc.line_url else '' end,
        'website_url', case when other_pc.website_url ~* '^https?://' then other_pc.website_url else '' end
      ) else null end
  ) order by shown.updated_at desc), '[]'::jsonb) into v_result
  from sakaba.intro_requests ir
  -- 申請した人には、相手が見送ったことが分からないようにする（期限までは「お返事待ち」、期限後は「取り下げ」）
  cross join lateral (
    select
      case
        when ir.status in ('proposed', 'declined_by_target') and ir.expires_at is not null and ir.expires_at <= now() then 'expired'
        when ir.status = 'declined_by_target' and v_user_id = ir.requester_id then 'proposed'
        else ir.status
      end as status,
      case
        when ir.status = 'declined_by_target' and v_user_id = ir.requester_id then coalesce(ir.proposed_at, ir.created_at)
        else ir.updated_at
      end as updated_at
  ) shown
  left join sakaba.profile_contacts other_pc on other_pc.user_id = case
    when v_user_id = ir.requester_id then ir.target_id
    when v_user_id = ir.target_id then ir.requester_id
    else null end
  where ir.guild_id = v_guild_id
    and v_user_id in (ir.requester_id, ir.target_id);
  return v_result;
end;
$$;

create or replace function public.sakaba_create_intro_request(
  p_guild_slug text, p_target_id uuid, p_purpose text, p_message text default ''
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select g.id into v_guild_id from sakaba.guilds g where lower(g.slug) = lower(btrim(p_guild_slug));
  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if p_target_id is null or p_target_id = v_user_id or not exists (
    select 1 from sakaba.guild_members gm where gm.guild_id = v_guild_id
      and gm.user_id = p_target_id and gm.suspended_at is null and gm.accept_intro
  ) then raise exception 'target is not accepting introductions' using errcode = '22023'; end if;
  if p_purpose is null or p_purpose not in ('work', 'consult', 'collab', 'info') then
    raise exception 'invalid introduction purpose' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) > 400 then
    raise exception 'message is too long' using errcode = '22001';
  end if;

  -- 期限の過ぎた申請を片付けてから、同じ相手への申請がまだ生きていないかを見る。
  -- 見送られた申請も期限までは「お返事待ち」と同じに扱い、同じ答えで断る（見送りが分からないように）
  update sakaba.intro_requests set status = 'expired'
  where guild_id = v_guild_id and requester_id = v_user_id and target_id = p_target_id
    and status in ('proposed', 'declined_by_target') and expires_at is not null and expires_at <= now();
  if exists (
    select 1 from sakaba.intro_requests
    where guild_id = v_guild_id and requester_id = v_user_id and target_id = p_target_id
      and status in ('requested', 'reviewing', 'proposed', 'accepted', 'introduced', 'declined_by_target')
  ) then raise exception 'introduction already pending' using errcode = '23505'; end if;

  insert into sakaba.intro_requests
    (guild_id, requester_id, target_id, purpose, message, status, proposed_at, expires_at)
  values
    (v_guild_id, v_user_id, p_target_id, p_purpose, btrim(coalesce(p_message, '')), 'proposed', now(), now() + interval '14 days')
  returning id into v_id;

  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
  values (v_guild_id, p_target_id, 'intro_progress', v_user_id, v_id, 'proposed');
  return v_id;
end;
$$;

create or replace function public.sakaba_request_quest_applicant_intro(
  p_quest_id uuid, p_applicant_id uuid
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_quest sakaba.quests%rowtype;
  v_request_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_quest from sakaba.quests where id = p_quest_id for update;
  if not found or v_quest.creator_id <> v_user_id
    or not sakaba.is_active_member(v_quest.guild_id, v_user_id) then
    raise exception 'only the creator can request an applicant introduction' using errcode = '42501';
  end if;
  if v_quest.members_only or v_quest.category not in ('work', 'consult', 'collab', 'info')
    or v_quest.status not in ('open', 'in_progress') then
    raise exception 'this quest cannot request an introduction' using errcode = '22023';
  end if;
  if not exists (
    select 1 from sakaba.quest_applications qa
    join sakaba.guild_members gm on gm.guild_id = v_quest.guild_id and gm.user_id = qa.user_id
    where qa.quest_id = p_quest_id and qa.user_id = p_applicant_id
      and qa.status = 'applied' and gm.suspended_at is null and gm.accept_intro
  ) then raise exception 'applicant is unavailable for introduction' using errcode = '22023'; end if;

  -- 期限の過ぎた申請を片付けてから、同じ相手への申請がまだ生きていないかを見る。
  -- 見送られた申請も期限までは「お返事待ち」と同じに扱い、同じ答えで断る（見送りが分からないように）
  update sakaba.intro_requests set status = 'expired'
  where guild_id = v_quest.guild_id and requester_id = v_user_id and target_id = p_applicant_id
    and status in ('proposed', 'declined_by_target') and expires_at is not null and expires_at <= now();
  if exists (
    select 1 from sakaba.intro_requests
    where guild_id = v_quest.guild_id and requester_id = v_user_id and target_id = p_applicant_id
      and status in ('requested', 'reviewing', 'proposed', 'accepted', 'introduced', 'declined_by_target')
  ) then raise exception 'introduction already pending' using errcode = '23505'; end if;

  insert into sakaba.intro_requests
    (guild_id, requester_id, target_id, quest_id, purpose, message, status, proposed_at, expires_at)
  values
    (v_quest.guild_id, v_user_id, p_applicant_id, p_quest_id, v_quest.category, '', 'proposed', now(), now() + interval '14 days')
  returning id into v_request_id;
  insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
  values (v_quest.guild_id, p_applicant_id, 'intro_progress', v_user_id, v_request_id, 'proposed');
  return v_request_id;
end;
$$;

create or replace function public.sakaba_act_on_intro_request(p_request_id uuid, p_action text, p_message text default '')
returns text language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_request sakaba.intro_requests%rowtype;
  v_next_status text;
  v_notify_user uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_request from sakaba.intro_requests where id = p_request_id for update;
  if not found or not sakaba.is_active_member(v_request.guild_id, v_user_id) then
    raise exception 'introduction not found' using errcode = '42501';
  end if;
  -- 期限が過ぎていれば、どの操作もできない（「取り下げ」として片付ける）
  if v_request.status in ('proposed', 'declined_by_target') and v_request.expires_at is not null and v_request.expires_at <= now() then
    update sakaba.intro_requests set status = 'expired' where id = p_request_id;
    raise exception 'action not allowed in this state' using errcode = '42501';
  end if;
  if p_action = 'accept' and char_length(btrim(coalesce(p_message, ''))) > 200 then
    raise exception 'message is too long' using errcode = '22001';
  end if;

  if p_action = 'accept' and (
    not sakaba.is_active_member(v_request.guild_id, v_request.requester_id)
    or not sakaba.is_active_member(v_request.guild_id, v_request.target_id)
  ) then raise exception 'both members must be active' using errcode = '42501'; end if;

  -- 申請した人は、相手が見送った申請も普通に取り下げられる（見送り済みなら相手には知らせない）
  if p_action = 'cancel' and v_request.requester_id = v_user_id and v_request.status in ('proposed', 'declined_by_target') then
    v_next_status := 'cancelled';
    v_notify_user := case when v_request.status = 'proposed' then v_request.target_id else null end;
  elsif p_action = 'accept' and v_request.target_id = v_user_id and v_request.status = 'proposed' then
    v_next_status := 'accepted'; v_notify_user := v_request.requester_id;
  elsif p_action = 'decline_target' and v_request.target_id = v_user_id and v_request.status = 'proposed' then
    -- 見送りは申請した人に知らせない。期限までは「お返事待ち」、期限後は「取り下げ」に見える
    v_next_status := 'declined_by_target'; v_notify_user := null;
  else
    raise exception 'action not allowed in this state' using errcode = '42501';
  end if;

  update sakaba.intro_requests
  set status = v_next_status,
      accept_message = case when v_next_status = 'accepted' then btrim(coalesce(p_message, '')) else accept_message end
  where id = p_request_id;
  if v_notify_user is not null then
    insert into sakaba.notifications (guild_id, user_id, kind, actor_id, intro_request_id, intro_status)
    values (v_request.guild_id, v_notify_user, 'intro_progress', v_user_id, p_request_id, v_next_status);
  end if;
  return v_next_status;
end;
$$;

revoke all on function public.sakaba_list_intro_requests(text) from public;
revoke all on function public.sakaba_create_intro_request(text, uuid, text, text) from public;
revoke all on function public.sakaba_act_on_intro_request(uuid, text, text) from public, anon;
revoke all on function public.sakaba_request_quest_applicant_intro(uuid, uuid) from public;
grant execute on function public.sakaba_list_intro_requests(text) to authenticated;
grant execute on function public.sakaba_create_intro_request(text, uuid, text, text) to authenticated;
grant execute on function public.sakaba_act_on_intro_request(uuid, text, text) to authenticated;
grant execute on function public.sakaba_request_quest_applicant_intro(uuid, uuid) to authenticated;
notify pgrst, 'reload schema';
