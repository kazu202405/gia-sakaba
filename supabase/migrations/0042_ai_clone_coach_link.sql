-- 紹介コーチ ⇄ 右腕AI（22DB）連携トグル
--
-- 4,980円会員（= ai_clone_tenants の owner）が、紹介コーチに
-- 自分の右腕AIのデータ（人物・会話ログ・タスク等の Memory 層）を
-- 読み込ませるかどうかを本人が切り替えられるようにする。
--
-- 方針（2026-05-31 決定）:
--   - デフォルト ON（払った人は「覚えてる右腕」が目当て。OFF はプライバシー用の逃げ道）
--   - Phase 1 は「読むだけ」。コーチが会話ログ/名刺を書き込むのは Phase 2 で追加。
--
-- 参照先: lib/coach/tenant-context.ts（読み込み）/ app/api/coach/link（トグル更新）

alter table ai_clone_tenants
  add column if not exists coach_link_enabled boolean not null default true;

comment on column ai_clone_tenants.coach_link_enabled is
  '紹介コーチが本テナントの右腕AIデータ（Memory層）を読み込むか。owner本人が切替。default true。';
