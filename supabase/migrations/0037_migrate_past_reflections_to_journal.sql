-- 0037_migrate_past_reflections_to_journal.sql
--
-- 1 回限りのデータ移動 migration。
--
-- 背景：
--   Phase 1（migration 0036）以前は、Slack で送られた「振り返り」の本文は
--   ai_clone_knowledge_candidate に kind='Learning候補'、content 先頭が
--   "[YYYY-MM-DD] 振り返り\n# 要約\n...\n\n# 本文\n..." の形で保存されていた。
--
--   Phase 1 以降、本文は ai_clone_journal に切り出される。本 migration は
--   過去の振り返り本文を journal に移し、ノイズになっていた knowledge_candidate
--   側を削除する。
--
-- 対象範囲：
--   * kind = 'Learning候補'
--   * content の先頭が "[YYYY-MM-DD] 振り返り" にマッチするもの
--   * "[YYYY-MM-DD] 学び: ..." / "[YYYY-MM-DD] 仮説: ..." 等のハイライト由来は
--     対象外（knowledge_candidate に残す＝本来のナレッジ候補）
--
-- 同テナント × 同日に複数レコードがあれば、created_at 順に
-- 「--- HH:MM」区切りで content を結合し、ai_clone_journal の
-- (tenant_id, entry_date) UNIQUE 制約に乗せる。
--
-- 冪等性：対象 0 件なら何もしない。再実行しても問題ない。
--
-- 安全策：journal に conflict（既存エントリあり）した日付の kc 行は削除しない
-- ことで、過去ジャーナルとの誤マージを防ぐ。
--
-- 実装メモ：Supabase SQL Editor は statement 間で接続が変わることがあり、
-- 通常の TEMP TABLE は他文から見えない。1 つの DO ブロックに全処理を
-- まとめて、ブロック内のローカル context で temp table を作成→使用→破棄する。

do $$
declare
  v_target_rows int;
  v_target_days int;
  v_inserted int;
  v_deleted int;
  v_journal_total int;
begin
  -- 1. 移行対象の抽出（パース込み）
  create temp table tmp_reflections as
  with parsed as (
    select
      kc.id as kc_id,
      kc.tenant_id,
      kc.created_at,
      -- entry_date：origin_log が空でなければそちらを優先、なければ content 先頭の [YYYY-MM-DD]
      coalesce(
        nullif(kc.origin_log, ''),
        (regexp_match(kc.content, '^\[(\d{4}-\d{2}-\d{2})\]'))[1]
      )::date as entry_date,
      -- summary：「# 要約\n」と「\n\n# 本文」の間。# 本文 がなければ # 要約 から末尾まで。
      case
        when kc.content ~ '\n# 本文' then
          nullif(trim((regexp_match(kc.content, '# 要約\n(.*?)\n\n# 本文'))[1]), '')
        when kc.content ~ '# 要約' then
          nullif(trim((regexp_match(kc.content, '# 要約\n(.*)'))[1]), '')
        else null
      end as summary,
      -- raw_text：「# 本文\n」以降。なければ「[YYYY-MM-DD] 振り返り\n」を剥がした残り。
      case
        when kc.content ~ '\n# 本文' then
          trim((regexp_match(kc.content, '# 本文\n(.*)'))[1])
        else
          trim(regexp_replace(kc.content, '^\[\d{4}-\d{2}-\d{2}\] 振り返り\n?', ''))
      end as raw_text
    from ai_clone_knowledge_candidate kc
    where kc.kind = 'Learning候補'
      and kc.content ~ '^\[\d{4}-\d{2}-\d{2}\] 振り返り'
  )
  select * from parsed where entry_date is not null;

  select count(*) into v_target_rows from tmp_reflections;
  select count(distinct (tenant_id::text || '|' || entry_date::text))
    into v_target_days from tmp_reflections;
  raise notice '[0037] 移行対象：% 行 / % 日分', v_target_rows, v_target_days;

  -- 2. 同テナント×同日のレコードを 1 ジャーナルに集約して INSERT
  --    2 件目以降は upsertJournalEntry と同じ「--- HH:MM」区切りで追記。
  with formatted as (
    select
      tenant_id,
      entry_date,
      created_at,
      summary,
      case
        when row_number() over (partition by tenant_id, entry_date order by created_at) = 1
          then raw_text
        else
          E'\n\n--- '
            || to_char(created_at at time zone 'Asia/Tokyo', 'HH24:MI')
            || E'\n'
            || raw_text
      end as chunk
    from tmp_reflections
  )
  insert into ai_clone_journal (tenant_id, entry_date, content, summary, created_at, updated_at)
  select
    tenant_id,
    entry_date,
    string_agg(chunk, '' order by created_at) as content,
    -- 同日複数の summary があれば最新（created_at 最大）の方を採用
    (array_agg(summary order by created_at desc) filter (where summary is not null))[1] as summary,
    min(created_at) as created_at,
    max(created_at) as updated_at
  from formatted
  group by tenant_id, entry_date
  -- 既に journal にその日付のエントリがある場合は安全側でスキップ
  on conflict (tenant_id, entry_date) do nothing;
  get diagnostics v_inserted = row_count;

  -- 3. 削除：journal にエントリが存在する日付の kc 行だけ消す（安全策）
  delete from ai_clone_knowledge_candidate kc
  where kc.id in (
    select t.kc_id from tmp_reflections t
    where exists (
      select 1 from ai_clone_journal j
      where j.tenant_id = t.tenant_id and j.entry_date = t.entry_date
    )
  );
  get diagnostics v_deleted = row_count;

  -- 4. 後片付け
  drop table tmp_reflections;

  select count(*) into v_journal_total from ai_clone_journal;
  raise notice
    '[0037] 完了 - 新規挿入: % 行 / 削除: % 行 / journal 総件数: % 行',
    v_inserted, v_deleted, v_journal_total;
end $$;
