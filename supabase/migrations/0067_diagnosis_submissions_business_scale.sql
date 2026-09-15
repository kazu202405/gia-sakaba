-- 事業規模（売上・利益レンジ）を診断回答に追加。
-- 予算に応じた打ち手の出し分け（AI文言）＋セグメント分析用。任意項目。冪等。

alter table public.diagnosis_submissions add column if not exists revenue_range text;
alter table public.diagnosis_submissions add column if not exists profit_range text;
