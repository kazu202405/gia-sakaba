-- 0043_ai_clone_daily_sales_actions.sql
--
-- 「翌日やるべき売上行動」の候補を DB 側で抽出する関数。
-- 前日19時(JST)の cron（旧：占いブリーフィング）の中身をこれに差し替える。
--
-- 思想（project_ai_clone_uridashi_hakkutsu_concept）:
--   右腕AI＝記憶AI。社長が売上を逃すのは"知らないから"でなく"忘れているから"。
--   毎日1本の配信で「忘れている売上行動」を3件思い出させる。
--
-- 3ルール（しきい値は運用で調整可）:
--   ① re_touch     重要度S/A × 最終接触30日超 → 近況うかがい
--   ② stalled_deal 商談済(app_pitch_date) × 受注未(app_deal_date null) × 14日超 → 進捗確認
--   ③ ask_referral 受注90日以内 × 受注後に「紹介依頼」活動の記録なし → 紹介のお願い
--
-- 最終接触日＝会話ログ occurred_at と活動ログ occurred_date の新しい方
-- （0041 の touches/last_touch パターンを踏襲。件数でなく候補リストを返す）。
--
-- セキュリティ: SECURITY INVOKER。cron は service_role で呼ぶ（RLS 越え）、
--   ダッシュボードから呼ぶ場合は呼出ユーザーの RLS が効く。

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
  -- ① 再接触
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
      and coalesce(lt.last_date, (p.created_at)::date) <= p_today - 30
  ),
  -- ② 放置案件
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
  -- ③ 紹介依頼
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
    union all select * from stalled
    union all select * from ask_referral
  )
  select person_id, name, rule, days, reason
  from unioned
  order by
    case rule when 'ask_referral' then 1 when 'stalled_deal' then 2 else 3 end,
    days desc
  limit 30;
$$;

grant execute on function ai_clone_daily_sales_actions(uuid, date) to authenticated, service_role;
