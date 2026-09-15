-- 0044_ai_clone_dated_reminder.sql
--
-- リマインドの「日付管理」軸（記念日・特定日・繰り返し）。
-- 「期限管理」軸は既存 ai_clone_task をそのまま使う。UI は /clone/<slug>/tasks を
-- 「リマインド」ページにして2タブ（やること＝task / 記念日＝この表）で切替。
--
-- 設計（project_ai_clone_uridashi_hakkutsu_concept）:
--   タスク＝期限に向かう一回性（完了で消える）。
--   記念日＝消えない・繰り返す。「明日その日が来ます」と前夜に思い出させる。
--
-- recurrence:
--   none      … base_date 当日1回
--   yearly    … 毎年その月日（誕生日・周年）
--   monthly   … 毎月その日（定例）
--   milestone … base_date から指定月数の節目だけ（例 {1,3,4,6,12}）。サービス開始◯ヶ月

create table if not exists ai_clone_dated_reminder (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  title text not null,
  base_date date not null,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'yearly', 'monthly', 'milestone')),
  milestone_months integer[] not null default '{}',  -- recurrence='milestone' のときの節目（月数）
  person_id uuid references ai_clone_person(id) on delete set null,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_dated_reminder(tenant_id);
create index on ai_clone_dated_reminder(tenant_id, active);

create trigger ai_clone_dated_reminder_updated_at
  before update on ai_clone_dated_reminder
  for each row execute function ai_clone_set_updated_at();

alter table ai_clone_dated_reminder enable row level security;
create policy ai_clone_dated_reminder_select on ai_clone_dated_reminder for select
  using (ai_clone_is_tenant_member(tenant_id));
create policy ai_clone_dated_reminder_modify on ai_clone_dated_reminder for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));
