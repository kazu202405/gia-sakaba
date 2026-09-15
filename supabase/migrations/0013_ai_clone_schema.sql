-- ===================================================================
-- 0013: AI Clone Supabase Schema (v1)
-- 作成: 2026-05-11
--
-- 目的:
--   Notion招待方式を廃止し、Supabase + gia-next 自前UI（/clone/[slug]/...）
--   に AI Clone のデータ基盤を統合する。
--   詳細: contexts/projects/gia/ai_clone.md
--   UI構成: contexts/projects/gia/ai_clone_ui_plan.md
--
-- 構成:
--   4層22テーブル（Core OS 7 / Hub 3 / Memory 9 / Review 3）
--   + 20リンクテーブル + ai_clone_tenants + ai_clone_tenant_members + RLS
--
-- 下敷き:
--   system/react/gia-next/scripts/setup-ai-clone-notion.ts（Notion 22DB スキーマの正本）
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
--   （前提: 0010〜0012 が既に当たっていること）
-- ===================================================================
--
-- 設計判断（2026-05-11 確定）:
--   * テーブル prefix は ai_clone_ で統一（他機能と衝突回避）
--   * テーブル名に番号は付けない。SQL に番号概念は不要・並び替えに弱いため。
--     Notion時代の番号（01〜23・欠番11あり）は本ファイル内コメント -- 01_xxx で
--     のみ保持し、設計メモ（ai_clone_design.md）との突合性を確保
--   * カラム名は英語スネークケース。Notion 日本語カラム名は -- コメントで併記
--   * tenant_id を全テーブルに付与 → クライアントごと完全分離（RLSと併用）
--   * 多対多は中間リンクテーブル、多対1は親テーブル側の FK カラム
--   * Notion の formula 列は GENERATED ALWAYS AS で再現
--   * select 系カラムは CHECK 制約なしの text 自由運用（UI側で制御）。
--     強制したいものだけ後で ENUM 化を検討
--   * multi_select は text[]（検索が必要なら GIN index 追加）
--   * Notion の people 型は auth.users(id) への uuid 参照
--   * embedding 用カラムは Phase 2 で別 migration として追加（pgvector）
--   * コメントスタイルは既存 migration（0010_add_stripe_fields.sql 等）と統一
-- ============================================================

-- ============================================================
-- 共通基盤
-- ============================================================

-- テナント = クライアント1社（または自社利用1人）
create table if not exists ai_clone_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  plan text,                              -- assistant / partner / team / custom
  status text not null default 'active',  -- active / paused / terminated
  notion_legacy_parent_page_id text,      -- 旧Notion運用テナントの参照用
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- テナント-ユーザー権限（クライアント側で複数人が触る場合）
create table if not exists ai_clone_tenant_members (
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',    -- owner / admin / member / viewer
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- 共通: updated_at 自動更新
create or replace function ai_clone_set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- 共通: テナントメンバー判定（RLS で使う）
create or replace function ai_clone_is_tenant_member(_tenant_id uuid) returns boolean
language sql stable as $$
  select exists(
    select 1 from ai_clone_tenant_members
    where tenant_id = _tenant_id and user_id = auth.uid()
  );
$$;

-- ============================================================
-- Core OS (7) ─ 経営の正式情報
-- ============================================================

-- 01_ミッション・理念
create table ai_clone_mission (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  name text not null,                     -- 名称
  mission text,                           -- ミッション
  values_tags text[],                     -- 価値観 (multi_select)
  target_world text,                      -- 目指す世界
  not_doing text,                         -- やらないこと
  value_to_customer text,                 -- お客様に届けたい価値
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_mission(tenant_id);

-- 02_3年計画
create table ai_clone_three_year_plan (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  plan_name text not null,                -- 計画名
  ideal_state_in_3y text,                 -- 3年後の理想状態
  business_pillars text[],                -- 事業の柱
  revenue_model text,                     -- 収益モデル
  assets_to_build text,                   -- 作りたい資産
  work_style_to_quit text,                -- やめたい働き方
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_three_year_plan(tenant_id);

-- 03_単年計画・今年のKPI
create table ai_clone_annual_kpi (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  fiscal_year text not null,              -- 年度
  yearly_theme text,                      -- 今年の重点テーマ
  revenue_target numeric,                 -- 売上目標
  mrr_target numeric,                     -- 月額課金目標
  meeting_target integer,                 -- 商談数
  post_target integer,                    -- 投稿数
  seminar_target integer,                 -- セミナー数
  deal_target integer,                    -- 導入件数
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_annual_kpi(tenant_id);

-- 04_判断基準
create table ai_clone_decision_principle (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  name text not null,                     -- 判断名
  category text,                          -- 判断カテゴリ
  rule text,                              -- 判断ルール
  reason text,                            -- 理由
  priority text,                          -- 優先度: 高/中/低
  exception text,                         -- 例外条件
  related_values text[],                  -- 関連する価値観
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_decision_principle(tenant_id);

-- 05_口調・対応ルール
create table ai_clone_tone_rule (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  name text not null,                     -- ルール名
  base_tone text,                         -- 基本の口調
  politeness text,                        -- 丁寧さ
  ng_expressions text,                    -- NG表現
  reply_length text,                      -- 返信の長さ
  confirm_before_proposing text,          -- 提案前に必ず確認すること
  no_pushy_rule text,                     -- 押し売り感を出さないルール
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_tone_rule(tenant_id);

-- 06_NG判断・確認ルール
create table ai_clone_ng_rule (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  area_name text not null,                -- 領域名
  area text,                              -- 領域: 契約金額/法的判断/税務判断/医療・投資助言/クレーム対応/重大な約束/本人確認
  reason_not_for_ai text,                 -- AIに任せない理由
  escalation_target text,                 -- 必須エスカレ先
  confirmation_procedure text,            -- 確認手順
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_ng_rule(tenant_id);

-- 08_FAQ・返答案
create table ai_clone_faq (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  question text not null,                 -- 質問
  base_answer text,                       -- 基本回答
  supplement text,                        -- 補足
  caveat text,                            -- 注意点
  requires_final_check boolean default false, -- 最終確認が必要か
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_faq(tenant_id);

-- ============================================================
-- Hub (3) ─ 親エンティティ
-- ============================================================

-- 07_サービス・商品
create table ai_clone_service (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  name text not null,                     -- サービス名
  target_audience text,                   -- 対象者
  problem_solved text,                    -- 解決する悩み
  offering text,                          -- 提供内容
  pricing text,                           -- 料金
  onboarding_flow text,                   -- 導入の流れ
  faq_text text,                          -- よくある質問（自由記述）
  good_fit text,                          -- 提案に向く相手
  bad_fit text,                           -- 提案しない方がいい相手
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_service(tenant_id);

-- 09_人物
create table ai_clone_person (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  name text not null,                     -- 名前
  company_name text,                      -- 会社名
  position text,                          -- 役職
  relationship text,                      -- 関係性
  importance text,                        -- 重要度: S/A/B/C
  trust_level text,                       -- 信頼度
  temperature text,                       -- 温度感
  referred_by text,                       -- 紹介元
  referred_to text,                       -- 紹介先
  interests text[],                       -- 関心ごと
  challenges text,                        -- 課題
  caveats text,                           -- 注意点
  next_action text,                       -- 次のアクション
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_person(tenant_id);
create index on ai_clone_person(tenant_id, importance);

-- 10_案件
create table ai_clone_project (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  name text not null,                     -- 案件名
  status text,                            -- ステータス: リード/提案/受注/進行中/完了/失注
  proposal_amount numeric,                -- 提案金額
  contract_amount numeric,                -- 受注金額
  revenue_total numeric default 0,        -- 売上合計
  cost_total numeric default 0,           -- 原価・経費合計
  gross_profit numeric generated always as (coalesce(revenue_total,0) - coalesce(cost_total,0)) stored,
  gross_margin numeric generated always as (
    case when coalesce(revenue_total,0) > 0
      then (coalesce(revenue_total,0) - coalesce(cost_total,0)) / revenue_total
      else 0 end
  ) stored,
  hours_invested numeric default 0,       -- 投下時間
  hourly_rate numeric generated always as (
    case when coalesce(hours_invested,0) > 0
      then coalesce(revenue_total,0) / hours_invested
      else 0 end
  ) stored,
  next_action text,                       -- 次アクション
  pending_decision text,                  -- 判断待ち
  due_date date,                          -- 期限
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_project(tenant_id);
create index on ai_clone_project(tenant_id, status);

-- ============================================================
-- Memory (9) ─ 日々の蓄積
-- ============================================================

-- 12_会話ログ
create table ai_clone_conversation_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  occurred_at timestamptz not null,       -- 日時（Notionタイトル）
  speaker text,                           -- 発言者
  channel text,                           -- チャンネル: Slack/LINE/Email/対面/電話
  content text,                           -- 会話内容
  summary text,                           -- 要約
  usage_tags text[],                      -- 用途タグ
  importance text,                        -- 重要度: S/A/B/C
  next_action text,                       -- 次アクション
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_conversation_log(tenant_id, occurred_at desc);

-- 13_人物メモ（人物に紐づくメモ：多対1）
create table ai_clone_person_note (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  person_id uuid not null references ai_clone_person(id) on delete cascade,
  occurred_at timestamptz not null,       -- 日時
  content text,                           -- 内容
  interests text[],                       -- 関心ごと
  challenges text,                        -- 課題
  temperature text,                       -- 温度感
  caveats text,                           -- 注意点
  next_touch_date date,                   -- 次の接点
  applied boolean default false,          -- 反映状態
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_person_note(tenant_id, person_id, occurred_at desc);

-- 14_案件進捗ログ（案件に紐づく進捗：多対1）
create table ai_clone_project_progress_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  project_id uuid not null references ai_clone_project(id) on delete cascade,
  occurred_at timestamptz not null,       -- 日時
  content text,                           -- 進捗内容
  current_state text,                     -- 現在の状態
  challenges text,                        -- 課題
  next_action text,                       -- 次のアクション
  needs_decision text,                    -- 判断が必要なこと
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_project_progress_log(tenant_id, project_id, occurred_at desc);

-- 15_タスク
create table ai_clone_task (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  name text not null,                     -- タスク名
  due_date date,                          -- 期限
  priority text,                          -- 優先度: 高/中/低
  status text default '未着手',           -- ステータス: 未着手/進行中/完了/保留
  origin_log text,                        -- 発生元ログ
  purpose text,                           -- 目的
  assignee_user_id uuid references auth.users(id) on delete set null, -- 対応者
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_task(tenant_id, status, due_date);

-- 16_活動ログ
create table ai_clone_activity_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  occurred_date date not null,            -- 日付
  content text,                           -- 活動内容
  activity_type text,                     -- 活動種別: 初回面談/商談/紹介依頼/...
  duration_minutes numeric,               -- 所要時間
  travel_minutes numeric,                 -- 移動時間
  cost numeric,                           -- 費用
  outcome text,                           -- 結果
  next_action text,                       -- 次アクション
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_activity_log(tenant_id, occurred_date desc);

-- 17_経費
create table ai_clone_expense (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  occurred_date date not null,            -- 日付
  amount numeric not null,                -- 金額
  category text,                          -- カテゴリ: 交通費/会議費/...
  payee text,                             -- 支払先
  purpose text,                           -- 目的
  fixed_or_variable text,                 -- 固定/変動
  memo text,                              -- メモ
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_expense(tenant_id, occurred_date desc);

-- 18_売上
create table ai_clone_revenue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  occurred_date date not null,            -- 日付
  customer text,                          -- 顧客（自由記述・関連はリンクテーブル）
  amount numeric not null,                -- 売上金額
  expected_paid_date date,                -- 入金予定日
  payment_status text,                    -- 入金状態: 未入金/一部入金/入金済
  memo text,                              -- 備考
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_revenue(tenant_id, occurred_date desc);

-- 19_判断履歴
create table ai_clone_decision_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  occurred_at timestamptz not null,       -- 日時
  theme text,                             -- 判断テーマ
  conclusion text,                        -- 結論
  reasoning text,                         -- 判断理由
  values_emphasized text[],               -- 重視した価値観
  reusable_rule text,                     -- 次回使える判断ルール
  promote_to_core_os boolean default false, -- Core OS反映候補
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_decision_log(tenant_id, occurred_at desc);

-- 20_ナレッジ候補
create table ai_clone_knowledge_candidate (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  content text not null,                  -- 内容（タイトル）
  kind text,                              -- 種別: FAQ候補/営業トーク候補/...
  target_db text,                         -- 反映候補先
  priority text,                          -- 優先度: 高/中/低
  origin_log text,                        -- 元ログ
  review_status text default '未確認',    -- 確認状態: 未確認/確認中/反映済/却下
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_knowledge_candidate(tenant_id, review_status);

-- ============================================================
-- Review (3) ─ 整理・昇格
-- ============================================================

-- 21_更新待ちルール
create table ai_clone_pending_rule (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  proposed_change text not null,          -- 追加・変更したいルール
  rule_kind text,                         -- ルール種別: 判断基準/口調・NG/サービス情報/FAQ/その他
  reason text,                            -- 理由
  target_db text,                         -- 反映先DB
  origin_log text,                        -- 元ログ
  approval_status text default '申請中',  -- 承認状態: 申請中/承認/却下/保留
  approver_user_id uuid references auth.users(id) on delete set null, -- 承認者
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_pending_rule(tenant_id, approval_status);

-- 22_週次レビュー
create table ai_clone_weekly_review (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  period text not null,                   -- 対象期間（例: 2026-W19）
  key_decisions text,                     -- 今週の重要判断
  progressed_projects text,               -- 進んだ案件
  stuck_projects text,                    -- 止まっている案件
  new_decision_rules text,                -- 新しく見えた判断基準
  relationship_changes text,              -- 関係性の変化
  next_week_priorities text,              -- 来週の優先タスク
  promote_to_core_os text,                -- Core OSに反映すべきこと
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_weekly_review(tenant_id, period);

-- 23_月次レビュー
create table ai_clone_monthly_review (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  target_month text not null,             -- 対象月（例: 2026-05）
  revenue numeric,                        -- 売上
  expense numeric,                        -- 経費
  gross_profit numeric generated always as (coalesce(revenue,0) - coalesce(expense,0)) stored,
  top_people text,                        -- 時間を使った上位人物
  top_projects text,                      -- 時間を使った上位案件
  high_margin_projects text,              -- 利益率が高い案件
  low_margin_projects text,               -- 利益率が低い案件
  activities_to_reduce text,              -- 減らすべき活動
  activities_to_increase text,            -- 増やすべき活動
  improvement_actions text,               -- 来月の改善アクション
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_clone_monthly_review(tenant_id, target_month);

-- ============================================================
-- リンクテーブル（多対多リレーション）
-- ============================================================
-- 元 Notion での 33 本のリレーションを SQL の多対多リンクで表現
-- 命名規則: ai_clone_<left>_<right>s （アルファベット順）
-- 多対1（人物メモ→人物 / 進捗→案件）は上記テーブル側の FK で表現済み

create table ai_clone_kpi_weekly_reviews (
  kpi_id uuid references ai_clone_annual_kpi(id) on delete cascade,
  weekly_review_id uuid references ai_clone_weekly_review(id) on delete cascade,
  primary key (kpi_id, weekly_review_id)
);
create table ai_clone_kpi_monthly_reviews (
  kpi_id uuid references ai_clone_annual_kpi(id) on delete cascade,
  monthly_review_id uuid references ai_clone_monthly_review(id) on delete cascade,
  primary key (kpi_id, monthly_review_id)
);
create table ai_clone_decision_principle_logs (
  principle_id uuid references ai_clone_decision_principle(id) on delete cascade,
  decision_log_id uuid references ai_clone_decision_log(id) on delete cascade,
  primary key (principle_id, decision_log_id)
);
create table ai_clone_decision_principle_pending_rules (
  principle_id uuid references ai_clone_decision_principle(id) on delete cascade,
  pending_rule_id uuid references ai_clone_pending_rule(id) on delete cascade,
  primary key (principle_id, pending_rule_id)
);

-- サービス ⇄ 他
create table ai_clone_service_projects (
  service_id uuid references ai_clone_service(id) on delete cascade,
  project_id uuid references ai_clone_project(id) on delete cascade,
  primary key (service_id, project_id)
);
create table ai_clone_service_faqs (
  service_id uuid references ai_clone_service(id) on delete cascade,
  faq_id uuid references ai_clone_faq(id) on delete cascade,
  primary key (service_id, faq_id)
);
create table ai_clone_service_knowledge_candidates (
  service_id uuid references ai_clone_service(id) on delete cascade,
  knowledge_candidate_id uuid references ai_clone_knowledge_candidate(id) on delete cascade,
  primary key (service_id, knowledge_candidate_id)
);

-- 人物 ⇄ 案件・会話ログ・活動ログ・経費・タスク・判断履歴
create table ai_clone_person_projects (
  person_id uuid references ai_clone_person(id) on delete cascade,
  project_id uuid references ai_clone_project(id) on delete cascade,
  primary key (person_id, project_id)
);
create table ai_clone_person_conversation_logs (
  person_id uuid references ai_clone_person(id) on delete cascade,
  conversation_log_id uuid references ai_clone_conversation_log(id) on delete cascade,
  primary key (person_id, conversation_log_id)
);
create table ai_clone_person_activity_logs (
  person_id uuid references ai_clone_person(id) on delete cascade,
  activity_log_id uuid references ai_clone_activity_log(id) on delete cascade,
  primary key (person_id, activity_log_id)
);
create table ai_clone_person_expenses (
  person_id uuid references ai_clone_person(id) on delete cascade,
  expense_id uuid references ai_clone_expense(id) on delete cascade,
  primary key (person_id, expense_id)
);
create table ai_clone_person_tasks (
  person_id uuid references ai_clone_person(id) on delete cascade,
  task_id uuid references ai_clone_task(id) on delete cascade,
  primary key (person_id, task_id)
);
create table ai_clone_person_decision_logs (
  person_id uuid references ai_clone_person(id) on delete cascade,
  decision_log_id uuid references ai_clone_decision_log(id) on delete cascade,
  primary key (person_id, decision_log_id)
);

-- 案件 ⇄ 会話ログ・活動ログ・タスク・経費・売上・判断履歴
create table ai_clone_project_conversation_logs (
  project_id uuid references ai_clone_project(id) on delete cascade,
  conversation_log_id uuid references ai_clone_conversation_log(id) on delete cascade,
  primary key (project_id, conversation_log_id)
);
create table ai_clone_project_activity_logs (
  project_id uuid references ai_clone_project(id) on delete cascade,
  activity_log_id uuid references ai_clone_activity_log(id) on delete cascade,
  primary key (project_id, activity_log_id)
);
create table ai_clone_project_tasks (
  project_id uuid references ai_clone_project(id) on delete cascade,
  task_id uuid references ai_clone_task(id) on delete cascade,
  primary key (project_id, task_id)
);
create table ai_clone_project_expenses (
  project_id uuid references ai_clone_project(id) on delete cascade,
  expense_id uuid references ai_clone_expense(id) on delete cascade,
  primary key (project_id, expense_id)
);
create table ai_clone_project_revenues (
  project_id uuid references ai_clone_project(id) on delete cascade,
  revenue_id uuid references ai_clone_revenue(id) on delete cascade,
  primary key (project_id, revenue_id)
);
create table ai_clone_project_decision_logs (
  project_id uuid references ai_clone_project(id) on delete cascade,
  decision_log_id uuid references ai_clone_decision_log(id) on delete cascade,
  primary key (project_id, decision_log_id)
);

-- 会話ログ ⇄ サービス
create table ai_clone_service_conversation_logs (
  service_id uuid references ai_clone_service(id) on delete cascade,
  conversation_log_id uuid references ai_clone_conversation_log(id) on delete cascade,
  primary key (service_id, conversation_log_id)
);

-- 売上 ⇄ サービス
create table ai_clone_service_revenues (
  service_id uuid references ai_clone_service(id) on delete cascade,
  revenue_id uuid references ai_clone_revenue(id) on delete cascade,
  primary key (service_id, revenue_id)
);

-- 判断履歴 ⇄ KPI
create table ai_clone_kpi_decision_logs (
  kpi_id uuid references ai_clone_annual_kpi(id) on delete cascade,
  decision_log_id uuid references ai_clone_decision_log(id) on delete cascade,
  primary key (kpi_id, decision_log_id)
);

-- ============================================================
-- updated_at trigger を全テーブルに付与
-- ============================================================
do $$
declare
  t text;
  tables text[] := array[
    'ai_clone_tenants','ai_clone_mission','ai_clone_three_year_plan',
    'ai_clone_annual_kpi','ai_clone_decision_principle','ai_clone_tone_rule',
    'ai_clone_ng_rule','ai_clone_faq','ai_clone_service','ai_clone_person',
    'ai_clone_project','ai_clone_conversation_log','ai_clone_person_note',
    'ai_clone_project_progress_log','ai_clone_task','ai_clone_activity_log',
    'ai_clone_expense','ai_clone_revenue','ai_clone_decision_log',
    'ai_clone_knowledge_candidate','ai_clone_pending_rule',
    'ai_clone_weekly_review','ai_clone_monthly_review'
  ];
begin
  foreach t in array tables loop
    execute format(
      'create trigger %I_set_updated before update on %I for each row execute function ai_clone_set_updated_at();',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- ============================================================
-- RLS（Row Level Security）
-- ============================================================
-- 方針: tenant_id を持つ全テーブルで「自分が member のテナントだけ見える/書ける」
-- リンクテーブルは結合元テーブルの権限に従う（join 経由でしか到達できないので
-- 一旦シンプルに「member なら全許可」で、必要なら後で締める）

-- tenants 自体
alter table ai_clone_tenants enable row level security;
create policy ai_clone_tenants_select on ai_clone_tenants for select
  using (ai_clone_is_tenant_member(id));
create policy ai_clone_tenants_modify on ai_clone_tenants for all
  using (ai_clone_is_tenant_member(id))
  with check (ai_clone_is_tenant_member(id));

-- tenant_members は自分が見えるテナントだけ
alter table ai_clone_tenant_members enable row level security;
create policy ai_clone_tenant_members_self on ai_clone_tenant_members for select
  using (user_id = auth.uid() or ai_clone_is_tenant_member(tenant_id));

-- 残り22テーブル: tenant_id 列ベースで一律
do $$
declare
  t text;
  tables text[] := array[
    'ai_clone_mission','ai_clone_three_year_plan','ai_clone_annual_kpi',
    'ai_clone_decision_principle','ai_clone_tone_rule','ai_clone_ng_rule',
    'ai_clone_faq','ai_clone_service','ai_clone_person','ai_clone_project',
    'ai_clone_conversation_log','ai_clone_person_note',
    'ai_clone_project_progress_log','ai_clone_task','ai_clone_activity_log',
    'ai_clone_expense','ai_clone_revenue','ai_clone_decision_log',
    'ai_clone_knowledge_candidate','ai_clone_pending_rule',
    'ai_clone_weekly_review','ai_clone_monthly_review'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy %I on %I for select using (ai_clone_is_tenant_member(tenant_id));',
      t || '_select', t
    );
    execute format(
      'create policy %I on %I for all using (ai_clone_is_tenant_member(tenant_id)) with check (ai_clone_is_tenant_member(tenant_id));',
      t || '_modify', t
    );
  end loop;
end $$;

-- ============================================================
-- Phase 2 で追加予定（このファイルには含めない）
-- ============================================================
-- * pgvector 拡張: create extension if not exists vector;
-- * Memory 系テーブルに embedding vector(1536) カラム
-- * 全文検索インデックス (tsvector + GIN)
-- * 監査ログ用 audit_log テーブル
-- * 旧Notion との移行 view（並行運用期間用）
