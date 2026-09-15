-- 0036_ai_clone_journal.sql
--
-- 振り返り＝日記用の専用テーブル。
--
-- 目的:
--   Slack/LINE/Web で「振り返り: ...」と送られたテキストを、知識化キュー
--   （ai_clone_knowledge_candidate）に混ぜず、日付ごとに日記として
--   時系列で振り返れる場所に独立して持つ。
--
-- 設計判断:
--   * (tenant_id, entry_date) UNIQUE。同日複数回投稿は同レコードに追記する。
--     content は時刻区切りで末尾追加（履歴消失しない）。
--   * summary は最新版で上書き。同日要約は最新で十分というユースケース前提。
--   * mood / weather のような追加メタは入れない。Phase 1 は最小スコープ。
--   * 「ハイライト」や「Action」は引き続き既存テーブル
--     （decision_log / task / knowledge_candidate）に分配する。journal は本文専用。

begin;

create table ai_clone_journal (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  entry_date date not null,
  content text not null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1テナント1日1レコードを強制（UPSERT のキー）
create unique index ai_clone_journal_tenant_date_uniq
  on ai_clone_journal(tenant_id, entry_date);

-- 月次タイムラインで「新しい日順に並べる」のを高速化
create index ai_clone_journal_tenant_date_desc_idx
  on ai_clone_journal(tenant_id, entry_date desc);

-- updated_at の自動更新トリガー
create or replace function ai_clone_journal_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger ai_clone_journal_touch_updated_at_trg
  before update on ai_clone_journal
  for each row execute function ai_clone_journal_touch_updated_at();

-- RLS：tenant_member のみ読み書き可。bot 経路は service_role で越える。
alter table ai_clone_journal enable row level security;

create policy ai_clone_journal_select on ai_clone_journal for select
  using (ai_clone_is_tenant_member(tenant_id));

create policy ai_clone_journal_modify on ai_clone_journal for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));

commit;
