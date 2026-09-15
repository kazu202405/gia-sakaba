-- ===================================================================
-- 0026: ai_clone_person の紹介関係を FK 化
-- 作成: 2026-05-14
--
-- 目的:
--   * これまで text フリー入力だった referred_by を、自テナント内の人物 ID
--     への参照（referred_by_person_id）に格上げする。
--   * 「誰が誰を紹介したか」をネットワークとして集計可能にする
--     （memory: AI Clone は紹介営業を仕組み化することが核）。
--
-- 設計:
--   * 既存 referred_by (text) / referred_to (text) はそのまま残す。
--     - FK 解決できない名前（外部の有名人・未登録の協力者）は text のまま残す
--       fallback として運用する。UI と Slack/LINE は FK 優先、空なら text。
--   * referred_to カラムは追加しない。「A が紹介した先」は
--     select * from ai_clone_person where referred_by_person_id = A.id
--     で逆引きできるため、denormalize しない（同期トリガーで事故るのを避ける）。
--   * 既存 text の referred_by は、テナント内で「ちょうど 1 人」の同名が
--     ヒットする場合のみ自動 backfill する。同名複数 / ヒットゼロは text のまま。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
--   （前提: 0013 以降が当たっていること）
-- ===================================================================

-- ----------------------------------------------------------------
-- 1) カラム追加 + index
-- ----------------------------------------------------------------
alter table ai_clone_person
  add column if not exists referred_by_person_id uuid
    references ai_clone_person(id) on delete set null;

create index if not exists ai_clone_person_referred_by_person_id_idx
  on ai_clone_person(tenant_id, referred_by_person_id);

-- ----------------------------------------------------------------
-- 2) 既存 text 値の backfill（同名 1 件マッチのみ採用）
-- ----------------------------------------------------------------
-- Postgres の max() は uuid を扱えないため、window function で各 target に対する
-- 候補数を数え、ちょうど 1 件マッチのものだけ採用する。
with candidates as (
  select
    t.id as target_id,
    s.id as source_id,
    count(*) over (partition by t.id) as match_count
  from ai_clone_person t
  join ai_clone_person s
    on s.tenant_id = t.tenant_id
   and s.id <> t.id
   and lower(trim(s.name)) = lower(trim(t.referred_by))
  where t.referred_by is not null
    and trim(t.referred_by) <> ''
    and t.referred_by_person_id is null
)
update ai_clone_person target
set referred_by_person_id = c.source_id
from candidates c
where target.id = c.target_id
  and c.match_count = 1;
