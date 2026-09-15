-- 0041_ai_clone_relationship_kpis.sql
--
-- ダッシュボードの人脈KPI（連絡した人・ご無沙汰の重要人物）を DB 側で集計する関数。
--
-- 背景:
--   旧実装は会話/活動の「人物リンクを全件 SELECT してアプリ側で数える」方式だった。
--   Supabase(PostgREST) は 1 回の SELECT で既定 1000 行までしか返さないため、
--   会話×人物リンクが 1000 行を超えると黙って切り捨てられ、KPI が静かに過小/過大に
--   なる危険があった。集計を DB 内に寄せることで行数上限の影響を受けなくする。
--
-- 返り値:
--   contacted_this_month … 今月（p_month_start 以上 p_month_next 未満）に
--                          会話 or 活動で接触した人物の実人数（重複なし）
--   stale_vip            … 重要度 S/A のうち、最終接触日（会話/活動の最新。
--                          無ければ登録日）が p_stale_before より前の人数
--
-- セキュリティ:
--   SECURITY INVOKER（既定）。呼び出しユーザーの権限で実行され、各テーブルの
--   RLS（ai_clone_is_tenant_member）が効く。p_tenant_id を詐称しても、メンバー
--   でないテナントの行は RLS で見えないため安全。
--
-- 日付の扱い:
--   occurred_at（timestamptz）は ::date でセッションTZ（Supabase 既定 UTC）の
--   日付に丸める。呼び出し側のダッシュボードも UTC ベースで月境界を計算しており整合。

create or replace function ai_clone_relationship_kpis(
  p_tenant_id uuid,
  p_month_start date,
  p_month_next date,
  p_stale_before date
)
returns table (contacted_this_month integer, stale_vip integer)
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
  contacted as (
    select count(distinct person_id) as cnt
    from touches
    where touch_date >= p_month_start and touch_date < p_month_next
  ),
  last_touch as (
    select person_id, max(touch_date) as last_date
    from touches
    group by person_id
  ),
  stale as (
    select count(*) as cnt
    from ai_clone_person p
    left join last_touch lt on lt.person_id = p.id
    where p.tenant_id = p_tenant_id
      and p.importance in ('S', 'A')
      and coalesce(lt.last_date, (p.created_at)::date) < p_stale_before
  )
  select
    coalesce((select cnt from contacted), 0)::integer,
    coalesce((select cnt from stale), 0)::integer;
$$;

grant execute on function ai_clone_relationship_kpis(uuid, date, date, date) to authenticated;
