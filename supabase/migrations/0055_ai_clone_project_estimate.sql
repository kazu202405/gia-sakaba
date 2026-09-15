-- 0055_ai_clone_project_estimate.sql
--
-- 案件に「人数 × 単価 = 概算売上」を持たせる。
-- 売上を会計レベルで記帳するのでなく、案件ベースの概算で見る方針
-- （project_ai_clone_finance_altitude）。明細台帳(ai_clone_revenue)は当面残すが、
-- 売上ページは案件の概算ロールアップを主に見せる。

alter table ai_clone_project
  add column if not exists headcount integer,   -- 人数
  add column if not exists unit_price numeric;  -- 単価（円/人）
