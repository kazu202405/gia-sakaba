-- Return the signed-in member's complete profile for My Page and editing.
-- Unlike the directory RPC, hidden groups are not redacted from their owner.
create or replace function public.sakaba_get_my_profile(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'id', p.user_id, 'display_name', p.display_name,
    'photo_url', p.photo_url, 'headline', p.headline,
    'industry', coalesce((
      select t.name from sakaba.profile_tags pt
      join sakaba.tags t on t.id = pt.tag_id
      where pt.user_id = p.user_id and t.kind = 'industry' and t.is_active
      order by t.sort_order, t.name limit 1
    ), ''),
    'job', p.job, 'job_icon', p.job_icon, 'region', p.region,
    'bio', p.bio, 'can_help_with', p.can_help_with,
    'keywords', coalesce((
      select jsonb_agg(t.name order by t.sort_order, t.name)
      from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id
      where pt.user_id = p.user_id and t.kind = 'keyword' and t.is_active
    ), '[]'::jsonb),
    'strengths', p.strengths, 'values_text', p.values_text,
    'vision', p.vision, 'social_issue', p.social_issue,
    'looking_for', p.looking_for, 'want_to_meet', p.want_to_meet,
    'role', gm.role, 'visible_groups', gm.visible_groups,
    'accept_intro', gm.accept_intro, 'company_name', gm.company_name,
    'position', gm.position, 'show_company', gm.show_company,
    'gathering_approved_at', gm.gathering_approved_at,
    'want_to_solve', gm.want_to_solve, 'joined_at', gm.joined_at,
    'show_achievements', gm.show_achievements,
    'contact', jsonb_build_object(
      'email', coalesce(pc.email, ''),
      'line_url', coalesce(pc.line_url, ''),
      'website_url', coalesce(pc.website_url, '')
    )
  ) into v_result
  from sakaba.guilds g
  join sakaba.guild_members gm on gm.guild_id = g.id
  join sakaba.profiles p on p.user_id = gm.user_id
  left join sakaba.profile_contacts pc on pc.user_id = p.user_id
  where lower(g.slug) = lower(btrim(p_guild_slug))
    and gm.user_id = v_user_id and gm.suspended_at is null;
  if v_result is null then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  return v_result;
end;
$$;

revoke all on function public.sakaba_get_my_profile(text) from public;
grant execute on function public.sakaba_get_my_profile(text) to authenticated;

notify pgrst, 'reload schema';
