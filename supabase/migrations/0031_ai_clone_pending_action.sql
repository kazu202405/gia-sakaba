-- 0031_ai_clone_pending_action.sql
--
-- AI Clone の対話状態保持テーブル。
--
-- 用途：
--   Slack/LINE/Web で bot が「田中が同名複数。1) 田中太郎 2) 田中一郎 → 番号で返信」
--   と聞いて、ユーザーの次の返信で確定するための短期 state（10分expire）。
--
-- 主な action_kind：
--   * log_conversation_disambiguate
--     payload = {
--       toolArgs: { person_names, summary, content, channel?, next_action?, importance? },
--       resolvedPersonIds: string[],            -- 既に解決済み（曖昧でなかった）人物
--       resolvedNames: string[],
--       newlyCreated: string[],
--       ambiguousName: string,                  -- 確認中の名前（1件のみ対応）
--       candidates: { id: string; name: string; companyHint: string }[]
--     }
--
-- expires_at を過ぎた pending は無視する（DELETE は遅延でOK）。

begin;

create table ai_clone_pending_action (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  channel text not null,             -- 'Slack' / 'LINE' / 'Web'
  external_user_id text not null,    -- slack_user_id / line_user_id / web user uuid
  action_kind text not null,         -- 'log_conversation_disambiguate' 等
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 「テナント × チャネル × ユーザー」で最新の有効 pending を引く想定
create index ai_clone_pending_action_lookup_idx
  on ai_clone_pending_action(tenant_id, channel, external_user_id, expires_at desc);

-- RLS：bot 経路は service_role キーで RLS を越える前提だが、
-- 将来 Web から member 権限で読む可能性に備えてポリシーは入れておく。
alter table ai_clone_pending_action enable row level security;

create policy ai_clone_pending_action_select on ai_clone_pending_action for select
  using (ai_clone_is_tenant_member(tenant_id));

create policy ai_clone_pending_action_modify on ai_clone_pending_action for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));

commit;
