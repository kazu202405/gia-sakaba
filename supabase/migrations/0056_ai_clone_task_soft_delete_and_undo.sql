-- 0056_ai_clone_task_soft_delete_and_undo.sql
--
-- 右腕AI タスク操作の安全網（実機の誤削除フィードバック起点）。
--   C'  ソフト削除：cancel_task は物理削除でなく deleted_at を打つだけにする。
--       一覧・検索・配信は deleted_at IS NULL のものだけ見る。「○○戻して」で復元できる。
--   C   アンドゥ：直前の書き換え（完了/リスケ/削除/作成/優先度/リネーム）を1件保持し、
--       「さっきの取り消して」「間違えた」で元に戻す。テナントごとに最新1件だけ持つ。

-- --- C' ソフト削除用カラム -------------------------------------------------
alter table ai_clone_task
  add column if not exists deleted_at timestamptz;

-- 生きているタスクの絞り込みを速くする部分インデックス
create index if not exists idx_ai_clone_task_alive
  on ai_clone_task(tenant_id)
  where deleted_at is null;

-- --- C アンドゥ用テーブル（テナントごと最新1件） ----------------------------
create table if not exists ai_clone_undo (
  tenant_id uuid primary key references ai_clone_tenants(id) on delete cascade,
  -- payload 例: { "op": "delete", "taskId": "...", "before": { "status": "未着手",
  --              "dueDate": null, "priority": "高", "name": "..." }, "label": "..." }
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_clone_undo_updated_at
  before update on ai_clone_undo
  for each row execute function ai_clone_set_updated_at();

alter table ai_clone_undo enable row level security;
create policy ai_clone_undo_select on ai_clone_undo for select
  using (ai_clone_is_tenant_member(tenant_id));
create policy ai_clone_undo_modify on ai_clone_undo for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));
