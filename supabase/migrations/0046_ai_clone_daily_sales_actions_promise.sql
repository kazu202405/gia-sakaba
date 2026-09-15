-- 0046_ai_clone_daily_sales_actions_promise.sql
--
-- 「翌日やるべき売上行動」抽出 RPC（0043）を更新し、4ルール目「約束あり×停滞」を追加。
--
-- 背景: 名刺/人物の next_action（約束・次の接点）は記録されるだけで思い出されなかった。
--   日付のある約束は名刺登録時に期限タスク化（コード側）。日付の無い約束を、ここで
--   「重要度S/A × 最終接触30日超 × next_action あり」として夜配信に拾う。
--
-- 重複回避: 約束のある重要人物は promise_stale に集約し、re_touch からは
--   next_action が空の人だけに絞る（同一人物が2ルールに出ないように）。
--
-- 4ルール:
--   ① re_touch     重要度S/A × 最終接触30日超 × 約束なし
--   ② promise_stale 重要度S/A × 最終接触30日超 × 約束あり（next_action）
--   ③ stalled_deal 商談済 × 受注未 × 14日超
--   ④ ask_referral 受注90日以内 × 紹介依頼未

create or replace function ai_clone_daily_sales_actions(
  p_tenant_id uuid,
  p_today date
)
returns table (
  person_id uuid,
  name text,
  rule text,
  days integer,
  reason text
)
language sql
stable
security invoker
as $$
  with touches as (
    select pcl.person_id, (cl.occurred_at)::date as touch_date
    from ai_clone_person_conversation_logs pcl
    join ai_clone_conversation_log cl on cl.id = pcl.conversation_log_id
    where cl.tenant_id = p_tenant_id
    union all
    select pal.person_id, al.occurred_date as touch_date
    from ai_clone_person_activity_logs pal
    join ai_clone_activity_log al on al.id = pal.activity_log_id
    where al.tenant_id = p_tenant_id
  ),
  last_touch as (
    select person_id, max(touch_date) as last_date
    from touches
    group by person_id
  ),
  referral_asks as (
    select pal.person_id, max(al.occurred_date) as last_ask
    from ai_clone_person_activity_logs pal
    join ai_clone_activity_log al on al.id = pal.activity_log_id
    where al.tenant_id = p_tenant_id
      and al.activity_type = '紹介依頼'
    group by pal.person_id
  ),
  -- ① 再接触（約束なしの重要人物）
  re_touch as (
    select
      p.id as person_id,
      p.name,
      're_touch'::text as rule,
      (p_today - coalesce(lt.last_date, (p.created_at)::date))::integer as days,
      ('重要度' || coalesce(p.importance, '?') || '、'
        || (p_today - coalesce(lt.last_date, (p.created_at)::date))::text
        || '日連絡なし') as reason
    from ai_clone_person p
    left join last_touch lt on lt.person_id = p.id
    where p.tenant_id = p_tenant_id
      and p.importance in ('S', 'A')
      and (p.next_action is null or trim(p.next_action) = '')
      and coalesce(lt.last_date, (p.created_at)::date) <= p_today - 30
  ),
  -- ② 約束あり×停滞
  promise_stale as (
    select
      p.id as person_id,
      p.name,
      'promise_stale'::text as rule,
      (p_today - coalesce(lt.last_date, (p.created_at)::date))::integer as days,
      ('約束「' || left(p.next_action, 24) || '」が'
        || (p_today - coalesce(lt.last_date, (p.created_at)::date))::text
        || '日停滞') as reason
    from ai_clone_person p
    left join last_touch lt on lt.person_id = p.id
    where p.tenant_id = p_tenant_id
      and p.importance in ('S', 'A')
      and p.next_action is not null
      and trim(p.next_action) <> ''
      and coalesce(lt.last_date, (p.created_at)::date) <= p_today - 30
  ),
  -- ③ 放置案件
  stalled as (
    select
      p.id as person_id,
      p.name,
      'stalled_deal'::text as rule,
      (p_today - p.app_pitch_date)::integer as days,
      ('商談から' || (p_today - p.app_pitch_date)::text
        || '日、受注/失注の記録なし') as reason
    from ai_clone_person p
    where p.tenant_id = p_tenant_id
      and p.app_pitch_date is not null
      and p.app_deal_date is null
      and p.app_pitch_date <= p_today - 14
  ),
  -- ④ 紹介依頼
  ask_referral as (
    select
      p.id as person_id,
      p.name,
      'ask_referral'::text as rule,
      (p_today - p.app_deal_date)::integer as days,
      ('受注から' || (p_today - p.app_deal_date)::text
        || '日、まだ紹介依頼の記録なし') as reason
    from ai_clone_person p
    left join referral_asks ra on ra.person_id = p.id
    where p.tenant_id = p_tenant_id
      and p.app_deal_date is not null
      and p.app_deal_date >= p_today - 90
      and (ra.last_ask is null or ra.last_ask < p.app_deal_date)
  ),
  unioned as (
    select * from re_touch
    union all select * from promise_stale
    union all select * from stalled
    union all select * from ask_referral
  )
  select person_id, name, rule, days, reason
  from unioned
  order by
    case rule
      when 'ask_referral' then 1
      when 'promise_stale' then 2
      when 'stalled_deal' then 3
      else 4
    end,
    days desc
  limit 30;
$$;

grant execute on function ai_clone_daily_sales_actions(uuid, date) to authenticated, service_role;
