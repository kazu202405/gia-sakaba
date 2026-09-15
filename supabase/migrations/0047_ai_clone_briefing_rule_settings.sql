-- 0047_ai_clone_briefing_rule_settings.sql
--
-- 夜の売上行動4ルールの「ON/OFF・日数しきい値・対象重要度」をテナントが設定できるようにする。
-- リマインド ＞ 配信ルール タブから編集。
--
-- 設計: RPC ai_clone_daily_sales_actions が本テーブルを参照してしきい値を適用する
--   （morning-briefing 側は無変更）。設定行が無いルールは RPC 内のデフォルトで動く。
--
-- 重要度フィルタが効くのは re_touch / promise_stale のみ。
--   stalled_deal / ask_referral は商談済・受注済が条件なので importance は不使用。

create table if not exists ai_clone_briefing_rule_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  rule_key text not null
    check (rule_key in ('re_touch', 'promise_stale', 'stalled_deal', 'ask_referral')),
  enabled boolean not null default true,
  threshold_days integer not null default 30,
  importance_levels text[] not null default array['S', 'A'],  -- re_touch / promise_stale のみ使用
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, rule_key)
);
create index on ai_clone_briefing_rule_settings(tenant_id);

create trigger ai_clone_briefing_rule_settings_updated_at
  before update on ai_clone_briefing_rule_settings
  for each row execute function ai_clone_set_updated_at();

alter table ai_clone_briefing_rule_settings enable row level security;
create policy ai_clone_briefing_rule_settings_select on ai_clone_briefing_rule_settings for select
  using (ai_clone_is_tenant_member(tenant_id));
create policy ai_clone_briefing_rule_settings_modify on ai_clone_briefing_rule_settings for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));

-- ───────────────────────────────────────────────
-- RPC を「設定参照版」に差し替え（0046 の固定しきい値→テナント設定）
-- ───────────────────────────────────────────────
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
  with cfg as (
    select rule_key, enabled, threshold_days, importance_levels
    from ai_clone_briefing_rule_settings
    where tenant_id = p_tenant_id
  ),
  touches as (
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
      p.id as person_id, p.name, 're_touch'::text as rule,
      (p_today - coalesce(lt.last_date, (p.created_at)::date))::integer as days,
      ('重要度' || coalesce(p.importance, '?') || '、'
        || (p_today - coalesce(lt.last_date, (p.created_at)::date))::text
        || '日連絡なし') as reason
    from ai_clone_person p
    left join last_touch lt on lt.person_id = p.id
    where p.tenant_id = p_tenant_id
      and coalesce((select enabled from cfg where rule_key = 're_touch'), true)
      and p.importance = any(
        coalesce((select importance_levels from cfg where rule_key = 're_touch'), array['S', 'A'])
      )
      and (p.next_action is null or trim(p.next_action) = '')
      and coalesce(lt.last_date, (p.created_at)::date)
          <= p_today - coalesce((select threshold_days from cfg where rule_key = 're_touch'), 30)
  ),
  -- ② 約束あり×停滞
  promise_stale as (
    select
      p.id as person_id, p.name, 'promise_stale'::text as rule,
      (p_today - coalesce(lt.last_date, (p.created_at)::date))::integer as days,
      ('約束「' || left(p.next_action, 24) || '」が'
        || (p_today - coalesce(lt.last_date, (p.created_at)::date))::text
        || '日停滞') as reason
    from ai_clone_person p
    left join last_touch lt on lt.person_id = p.id
    where p.tenant_id = p_tenant_id
      and coalesce((select enabled from cfg where rule_key = 'promise_stale'), true)
      and p.importance = any(
        coalesce((select importance_levels from cfg where rule_key = 'promise_stale'), array['S', 'A'])
      )
      and p.next_action is not null and trim(p.next_action) <> ''
      and coalesce(lt.last_date, (p.created_at)::date)
          <= p_today - coalesce((select threshold_days from cfg where rule_key = 'promise_stale'), 30)
  ),
  -- ③ 放置案件
  stalled as (
    select
      p.id as person_id, p.name, 'stalled_deal'::text as rule,
      (p_today - p.app_pitch_date)::integer as days,
      ('商談から' || (p_today - p.app_pitch_date)::text || '日、受注/失注の記録なし') as reason
    from ai_clone_person p
    where p.tenant_id = p_tenant_id
      and coalesce((select enabled from cfg where rule_key = 'stalled_deal'), true)
      and p.app_pitch_date is not null
      and p.app_deal_date is null
      and p.app_pitch_date
          <= p_today - coalesce((select threshold_days from cfg where rule_key = 'stalled_deal'), 14)
  ),
  -- ④ 紹介依頼
  ask_referral as (
    select
      p.id as person_id, p.name, 'ask_referral'::text as rule,
      (p_today - p.app_deal_date)::integer as days,
      ('受注から' || (p_today - p.app_deal_date)::text || '日、まだ紹介依頼の記録なし') as reason
    from ai_clone_person p
    left join referral_asks ra on ra.person_id = p.id
    where p.tenant_id = p_tenant_id
      and coalesce((select enabled from cfg where rule_key = 'ask_referral'), true)
      and p.app_deal_date is not null
      and p.app_deal_date
          >= p_today - coalesce((select threshold_days from cfg where rule_key = 'ask_referral'), 90)
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
