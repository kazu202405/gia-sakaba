-- 0050_ai_clone_coach_message.sql
--
-- 紹介コーチの会話履歴（4,980円以上＝owner テナントを持つ会員）。
-- 「1本の連続した会話」を時系列で保持。AI が過去の相談を踏まえて応答できるようにする。
-- スレッド分割（複数の部屋）はしない方針：右腕は1人・関係は1本という思想に合わせる。
--
-- 990円会員は端末ローカル保存（このテーブルは使わない）。

create table if not exists ai_clone_coach_message (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index on ai_clone_coach_message(tenant_id, created_at);

alter table ai_clone_coach_message enable row level security;
create policy ai_clone_coach_message_select on ai_clone_coach_message for select
  using (ai_clone_is_tenant_member(tenant_id));
create policy ai_clone_coach_message_modify on ai_clone_coach_message for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));
