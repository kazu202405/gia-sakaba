-- 売上導線診断のリニューアルで追加した列の冪等追補。
-- 0064 を未適用なら 0064 側で既に含まれるが、もし 0064 を先に適用済みだった場合に
-- company / ai_report 列が欠けるのを防ぐため、ここで IF NOT EXISTS で足す（両対応）。

alter table public.diagnosis_submissions
  add column if not exists company text;

alter table public.diagnosis_submissions
  add column if not exists ai_report jsonb;
