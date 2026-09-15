-- 0059_ai_clone_silent_people.sql
--
-- 「N日以上やりとりしていない人」（ご無沙汰リスト）をオンデマンドで返す RPC。
-- 既存の re_touch（0043 の ai_clone_daily_sales_actions）は
--   ・重要度 S/A 限定
--   ・売上行動3ルールに束ねられていて単独で呼べない
-- ため、「30日以上やりとりしてない人を出して」のような素朴な問い合わせに使えなかった。
-- これを汎用化した単独クエリとして用意する。
--
-- 最終接触日＝その人に紐づく【会話ログ occurred_at】と【活動ログ occurred_date】の "新しい方"。
--   どちらも無ければ人物の登録日(created_at)起点（＝一度も接触記録がない人もご無沙汰として拾う）。
-- last_contact が null の行は「接触記録なし（登録only）」を意味する。

create or replace function ai_clone_silent_people(
  p_tenant_id uuid,
  p_today date,
  p_days integer default 30,
  p_limit integer default 30
)
returns table (
  person_id uuid,
  name text,
  importance text,
  met_context text,
  next_action text,
  last_contact date,
  days integer
)
language sql
stable
as $$
  with conv as (
    select pcl.person_id, max((cl.occurred_at)::date) as d
    from ai_clone_person_conversation_logs pcl
    join ai_clone_conversation_log cl on cl.id = pcl.conversation_log_id
    where cl.tenant_id = p_tenant_id
    group by pcl.person_id
  ),
  act as (
    select pal.person_id, max(al.occurred_date) as d
    from ai_clone_person_activity_logs pal
    join ai_clone_activity_log al on al.id = pal.activity_log_id
    where al.tenant_id = p_tenant_id
    group by pal.person_id
  ),
  touched as (
    select
      p.id as person_id,
      greatest(
        coalesce(conv.d, date '1900-01-01'),
        coalesce(act.d,  date '1900-01-01')
      ) as last_d
    from ai_clone_person p
    left join conv on conv.person_id = p.id
    left join act  on act.person_id  = p.id
    where p.tenant_id = p_tenant_id
  )
  select
    p.id as person_id,
    p.name,
    p.importance,
    p.met_context,
    p.next_action,
    nullif(t.last_d, date '1900-01-01') as last_contact,
    (p_today - coalesce(nullif(t.last_d, date '1900-01-01'), (p.created_at)::date))::integer as days
  from ai_clone_person p
  join touched t on t.person_id = p.id
  where coalesce(nullif(t.last_d, date '1900-01-01'), (p.created_at)::date) <= p_today - p_days
  order by days desc
  limit p_limit;
$$;

grant execute on function ai_clone_silent_people(uuid, date, integer, integer) to authenticated, service_role;
