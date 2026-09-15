-- 売上ボトルネック診断（公開ツール /diagnosis）の回答・リード保存。
-- 送信は API ルート（app/api/diagnosis）が service_role で書き込む。
-- RLS 有効＋ポリシー無し ＝ anon / authenticated からは読めない・書けない
-- （service_role のみがバイパスして INSERT する）。個人情報を含むため公開読み取りはさせない。

create table if not exists public.diagnosis_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  company text,
  industry text,
  answers jsonb not null default '{}'::jsonb,   -- questionId -> points
  scores jsonb not null default '{}'::jsonb,     -- dimensionKey -> 0..100
  total integer not null default 0,
  grade text,
  bottleneck_key text,
  supply_gate boolean not null default false,
  worry text,
  ai_advice text,            -- 旧: 単一テキストアドバイス（後方互換で残置）
  ai_report jsonb            -- 新: { type, issues[], steps[] }（生成ボタンで作成）
);

create index if not exists idx_diagnosis_submissions_created_at
  on public.diagnosis_submissions (created_at desc);
create index if not exists idx_diagnosis_submissions_email
  on public.diagnosis_submissions (email);

alter table public.diagnosis_submissions enable row level security;
-- ポリシーは意図的に作らない（service_role 経由の API のみが読み書きする）。
