-- 「売上アップに使える予算」レンジを診断回答に追加。任意・冪等。
alter table public.diagnosis_submissions add column if not exists budget_range text;
