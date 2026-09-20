-- ============================================================================
-- 0078: GIAの酒場 access helpers, read policies and public read RPCs
--
-- Profiles and quests contain fields with different visibility rules. They are
-- not granted for direct cross-user SELECT; public RPCs return redacted rows.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Internal authorization helpers
-- --------------------------------------------------------------------------

create or replace function sakaba.is_active_member(
  p_guild_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, sakaba
as $$
  select p_user_id is not null and exists (
    select 1
    from sakaba.guild_members gm
    where gm.guild_id = p_guild_id
      and gm.user_id = p_user_id
      and gm.suspended_at is null
  );
$$;

create or replace function sakaba.is_guild_master(
  p_guild_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, sakaba
as $$
  select p_user_id is not null and exists (
    select 1
    from sakaba.guild_members gm
    where gm.guild_id = p_guild_id
      and gm.user_id = p_user_id
      and gm.role in ('owner', 'master')
      and gm.suspended_at is null
  );
$$;

create or replace function sakaba.is_paid_member(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select p_user_id is not null and exists (
    select 1
    from public.applicants a
    where a.id = p_user_id
      and a.plan is not null
  );
$$;

create or replace function sakaba.can_access_project(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, sakaba
as $$
  select p_user_id is not null and exists (
    select 1
    from sakaba.projects p
    where p.id = p_project_id
      and (
        p.owner_id = p_user_id
        or exists (
          select 1
          from sakaba.project_members pm
          where pm.project_id = p.id
            and pm.user_id = p_user_id
        )
      )
  );
$$;

revoke all on function sakaba.is_active_member(uuid, uuid) from public;
revoke all on function sakaba.is_guild_master(uuid, uuid) from public;
revoke all on function sakaba.is_paid_member(uuid) from public;
revoke all on function sakaba.can_access_project(uuid, uuid) from public;

grant execute on function sakaba.is_active_member(uuid, uuid) to authenticated;
grant execute on function sakaba.is_guild_master(uuid, uuid) to authenticated;
grant execute on function sakaba.is_paid_member(uuid) to authenticated;
grant execute on function sakaba.can_access_project(uuid, uuid) to authenticated;

-- --------------------------------------------------------------------------
-- Read policies
-- --------------------------------------------------------------------------

create policy guilds_member_read
on sakaba.guilds for select to authenticated
using (sakaba.is_active_member(id));

-- Another member's profile must go through sakaba_list_members(), which applies
-- visible_groups and show_company before returning data.
create policy profiles_self_read
on sakaba.profiles for select to authenticated
using (user_id = auth.uid());

create policy profile_contacts_self_read
on sakaba.profile_contacts for select to authenticated
using (user_id = auth.uid());

create policy profile_tags_self_read
on sakaba.profile_tags for select to authenticated
using (user_id = auth.uid());

create policy guild_members_self_read
on sakaba.guild_members for select to authenticated
using (user_id = auth.uid());

create policy quest_applications_visible_read
on sakaba.quest_applications for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from sakaba.quests q
    where q.id = quest_id
      and (
        q.creator_id = auth.uid()
        or sakaba.is_guild_master(q.guild_id)
      )
  )
);

create policy intro_requests_visible_read
on sakaba.intro_requests for select to authenticated
using (
  requester_id = auth.uid()
  or (
    target_id = auth.uid()
    and status in ('proposed', 'accepted', 'introduced')
  )
  or sakaba.is_guild_master(guild_id)
);

create policy intro_request_notes_master_read
on sakaba.intro_request_notes for select to authenticated
using (
  exists (
    select 1
    from sakaba.intro_requests ir
    where ir.id = intro_request_id
      and sakaba.is_guild_master(ir.guild_id)
  )
);

create policy parties_member_read
on sakaba.parties for select to authenticated
using (sakaba.is_active_member(guild_id));

create policy party_members_member_read
on sakaba.party_members for select to authenticated
using (
  exists (
    select 1
    from sakaba.parties p
    where p.id = party_id
      and sakaba.is_active_member(p.guild_id)
  )
);

create policy projects_participant_read
on sakaba.projects for select to authenticated
using (sakaba.can_access_project(id));

create policy project_members_participant_read
on sakaba.project_members for select to authenticated
using (sakaba.can_access_project(project_id));

create policy project_tasks_participant_read
on sakaba.project_tasks for select to authenticated
using (sakaba.can_access_project(project_id));

create policy project_steps_participant_read
on sakaba.project_steps for select to authenticated
using (sakaba.can_access_project(project_id));

create policy project_contacts_participant_read
on sakaba.project_contacts for select to authenticated
using (sakaba.can_access_project(project_id));

create policy project_step_records_participant_read
on sakaba.project_step_records for select to authenticated
using (sakaba.can_access_project(project_id));

create policy notifications_self_read
on sakaba.notifications for select to authenticated
using (user_id = auth.uid());

-- Only tables whose complete rows are safe for the matching policy are granted
-- here. profiles and quests are intentionally read through redacting RPCs.
grant select on sakaba.guilds to authenticated;
grant select on sakaba.profile_contacts to authenticated;
grant select on sakaba.profile_tags to authenticated;
grant select on sakaba.guild_members to authenticated;
grant select on sakaba.quest_applications to authenticated;
grant select on sakaba.intro_requests to authenticated;
grant select on sakaba.intro_request_notes to authenticated;
grant select on sakaba.parties to authenticated;
grant select on sakaba.party_members to authenticated;
grant select on sakaba.projects to authenticated;
grant select on sakaba.project_members to authenticated;
grant select on sakaba.project_tasks to authenticated;
grant select on sakaba.project_steps to authenticated;
grant select on sakaba.project_contacts to authenticated;
grant select on sakaba.project_step_records to authenticated;
grant select on sakaba.notifications to authenticated;

-- --------------------------------------------------------------------------
-- Public-schema RPCs (callable through the default Supabase Data API schema)
-- --------------------------------------------------------------------------

create or replace function public.sakaba_get_my_context(p_guild_slug text default 'gia')
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild sakaba.guilds%rowtype;
  v_member sakaba.guild_members%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select g.* into v_guild
  from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));

  if not found then
    raise exception 'guild not found' using errcode = 'P0002';
  end if;

  select gm.* into v_member
  from sakaba.guild_members gm
  where gm.guild_id = v_guild.id
    and gm.user_id = v_user_id
    and gm.suspended_at is null;

  if not found then
    raise exception 'guild membership required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'guild', jsonb_build_object(
      'id', v_guild.id,
      'slug', v_guild.slug,
      'name', v_guild.name,
      'terms', v_guild.terms
    ),
    'membership', jsonb_build_object(
      'role', v_member.role,
      'visible_groups', v_member.visible_groups,
      'accept_intro', v_member.accept_intro,
      'show_company', v_member.show_company,
      'gathering_approved_at', v_member.gathering_approved_at,
      'show_achievements', v_member.show_achievements,
      'members_seen_at', v_member.members_seen_at,
      'quests_seen_at', v_member.quests_seen_at,
      'joined_at', v_member.joined_at
    ),
    'is_paid', sakaba.is_paid_member(v_user_id)
  );
end;
$$;

create or replace function public.sakaba_list_members(p_guild_slug text default 'gia')
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select g.id into v_guild_id
  from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));

  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(member_json order by joined_at, display_name), '[]'::jsonb)
  into v_result
  from (
    select
      gm.joined_at,
      p.display_name,
      jsonb_build_object(
        'id', p.user_id,
        'display_name', p.display_name,
        'photo_url', p.photo_url,
        'headline', p.headline,
        'industry', coalesce((
          select t.name
          from sakaba.profile_tags pt
          join sakaba.tags t on t.id = pt.tag_id
          where pt.user_id = p.user_id and t.kind = 'industry' and t.is_active
          order by t.sort_order, t.name
          limit 1
        ), ''),
        'job', p.job,
        'job_icon', p.job_icon,
        'region', p.region,
        'bio', case when 'work' = any(gm.visible_groups) then p.bio else '' end,
        'can_help_with', case when 'work' = any(gm.visible_groups) then p.can_help_with else '' end,
        'keywords', case when 'work' = any(gm.visible_groups) then coalesce((
          select to_jsonb(array_agg(t.name order by t.sort_order, t.name))
          from sakaba.profile_tags pt
          join sakaba.tags t on t.id = pt.tag_id
          where pt.user_id = p.user_id and t.kind = 'keyword' and t.is_active
        ), '[]'::jsonb) else '[]'::jsonb end,
        'strengths', p.strengths,
        'values_text', case when 'values' = any(gm.visible_groups) then p.values_text else '' end,
        'vision', case when 'values' = any(gm.visible_groups) then p.vision else '' end,
        'social_issue', case when 'values' = any(gm.visible_groups) then p.social_issue else '' end,
        'looking_for', case when 'connect' = any(gm.visible_groups) then p.looking_for else '' end,
        'want_to_meet', case when 'connect' = any(gm.visible_groups) then p.want_to_meet else '' end,
        'role', gm.role,
        'visible_groups', gm.visible_groups,
        'accept_intro', gm.accept_intro,
        'company_name', case when gm.show_company or p.user_id = v_user_id then gm.company_name else '' end,
        'position', case when gm.show_company or p.user_id = v_user_id then gm.position else 'other' end,
        'show_company', gm.show_company,
        'gathering_approved_at', case
          when p.user_id = v_user_id or sakaba.is_guild_master(v_guild_id, v_user_id)
            then gm.gathering_approved_at
          else null
        end,
        'want_to_solve', gm.want_to_solve,
        'joined_at', gm.joined_at
      ) as member_json
    from sakaba.guild_members gm
    join sakaba.profiles p on p.user_id = gm.user_id
    where gm.guild_id = v_guild_id
      and gm.suspended_at is null
  ) members;

  return v_result;
end;
$$;

create or replace function public.sakaba_list_quests(p_guild_slug text default 'gia')
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_is_paid boolean;
  v_is_master boolean;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select g.id into v_guild_id
  from sakaba.guilds g
  where lower(g.slug) = lower(btrim(p_guild_slug));

  if v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;

  v_is_paid := sakaba.is_paid_member(v_user_id);
  v_is_master := sakaba.is_guild_master(v_guild_id, v_user_id);

  select coalesce(jsonb_agg(quest_json order by is_urgent desc, created_at desc), '[]'::jsonb)
  into v_result
  from (
    select
      q.is_urgent,
      q.created_at,
      jsonb_build_object(
        'id', q.id,
        'creator_id', q.creator_id,
        'title', q.title,
        'category', q.category,
        'summary', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.summary else '' end,
        'body', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.body else '' end,
        'region', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.region else '' end,
        'deadline', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.deadline else null end,
        'member_limit', case when not q.members_only or v_is_paid or q.creator_id = v_user_id then q.member_limit else null end,
        'is_urgent', q.is_urgent,
        'members_only', q.members_only,
        'status', q.status,
        'created_at', q.created_at,
        'applicant_count', (
          select count(*)
          from sakaba.quest_applications qa
          where qa.quest_id = q.id and qa.status = 'applied'
        ),
        'my_application', (
          select jsonb_build_object(
            'quest_id', qa.quest_id,
            'user_id', qa.user_id,
            'message', qa.message,
            'status', qa.status,
            'approved_at', qa.approved_at,
            'created_at', qa.created_at
          )
          from sakaba.quest_applications qa
          where qa.quest_id = q.id and qa.user_id = v_user_id
        )
      ) as quest_json
    from sakaba.quests q
    where q.guild_id = v_guild_id
      and (q.status <> 'withdrawn' or q.creator_id = v_user_id or v_is_master)
  ) quests;

  return v_result;
end;
$$;

revoke all on function public.sakaba_get_my_context(text) from public;
revoke all on function public.sakaba_list_members(text) from public;
revoke all on function public.sakaba_list_quests(text) from public;

grant execute on function public.sakaba_get_my_context(text) to authenticated;
grant execute on function public.sakaba_list_members(text) to authenticated;
grant execute on function public.sakaba_list_quests(text) to authenticated;

notify pgrst, 'reload schema';
