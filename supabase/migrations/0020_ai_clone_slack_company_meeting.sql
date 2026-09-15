-- ===================================================================
-- 0020: AI Clone — Slack 連携 + 会社マスタ + 議事録テーブル
-- 作成: 2026-05-12
--
-- 目的:
--   Slack DM → AI Clone のデータ取り込み先を Notion から Supabase に切替。
--   それに伴い、conversation.ts が依存する以下を Supabase 側で揃える:
--     1. tenant_members.slack_user_id（DM 送信者→tenant 解決）
--     2. ai_clone_company（会社マスタ。同一会社の複数人をマスタ参照可能に）
--     3. ai_clone_person への不足列追加（email/phone/ファネル日付/受注金額/名刺OCR/company FK）
--     4. ai_clone_meeting（議事録テーブル。会話ログとは粒度が違うため専用化）
--     5. meeting/company のリンクテーブル + RLS + updated_at trigger
--
-- 前提:
--   0013_ai_clone_schema.sql が適用済みであること。
--   既存テーブル ai_clone_tenant_members / ai_clone_person / ai_clone_tenants /
--   ai_clone_project / ai_clone_service を前提とする。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

-- ============================================================
-- 1. tenant_members に slack_user_id（DM 送信者→tenant 解決用）
-- ============================================================
-- 1人の Supabase ユーザーが複数テナントに所属することはあり得るが、
-- 1つの Slack user_id は1つのテナント・1人のユーザーに帰属する前提（UNIQUE）。
-- NULL 許容にして、Slack 未連携メンバーも tenant_members として保持できるようにする。
alter table ai_clone_tenant_members
  add column slack_user_id text;

create unique index ai_clone_tenant_members_slack_user_id_unique
  on ai_clone_tenant_members(slack_user_id)
  where slack_user_id is not null;

-- ============================================================
-- 2. ai_clone_company（会社マスタ）新設
-- ============================================================
-- 同一会社に複数の person が紐付くケースを想定し、表記揺れ防止のためマスタ化。
-- 名刺取り込み時は「既存マスタにファジー一致→候補があれば確認、無ければ新規作成」のUX。
create table ai_clone_company (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  name text not null,              -- 正式名称（例: GIA株式会社）
  hp text,                         -- ホームページURL
  industry text[],                 -- 業種（multi_select 相当）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_clone_company_tenant_id_idx on ai_clone_company(tenant_id);
create index ai_clone_company_tenant_name_idx on ai_clone_company(tenant_id, name);

-- ============================================================
-- 3. ai_clone_person に不足列を追加
-- ============================================================
-- email/phone: findPersonByEmail / 名刺取り込み（createPersonDetailed）に必要
-- business_card_ocr: 名刺 OCR の生テキスト保存
-- company_id: 会社マスタへの FK（既存 company_name (text) は当面残し、新規データは FK 優先）
-- ファネル系5列: updatePersonPipeline で更新する状態日付＋受注金額
alter table ai_clone_person
  add column email text,
  add column phone text,
  add column business_card_ocr text,
  add column company_id uuid references ai_clone_company(id) on delete set null,
  add column salon_proposal_date date,
  add column salon_join_date date,
  add column app_pitch_date date,
  add column app_deal_date date,
  add column deal_amount numeric;

create index ai_clone_person_tenant_email_idx
  on ai_clone_person(tenant_id, email)
  where email is not null;
create index ai_clone_person_company_id_idx
  on ai_clone_person(company_id)
  where company_id is not null;

-- 注: 既存 person.company_name (text) は互換のため残置。
--    新規データは company_id を優先利用。Phase 2 の移行スクリプトで text → FK 化を検討。

-- ============================================================
-- 4. ai_clone_meeting（議事録テーブル）新設
-- ============================================================
-- conversation_log（Slack/LINE の1往復メッセージ粒度）とは分離。
-- 議事録は「1会議＝1レコード（参加者複数・長文）」の粒度を専用化する。
create table ai_clone_meeting (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  title text not null,             -- 会議タイトル
  occurred_on date,                -- 開催日（YYYY-MM-DD）
  agenda text,                     -- 議題（場所/URL等のスナップショットも含む）
  minutes text,                    -- 議事録本文（長文。Notion 2000字制限なし）
  next_actions text,               -- ネクストアクション
  rating text,                     -- 評価: S/A/B/C（任意）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_clone_meeting_tenant_occurred_idx
  on ai_clone_meeting(tenant_id, occurred_on desc);

-- ============================================================
-- 5. リンクテーブル
-- ============================================================
-- meeting ⇄ person/project/service の多対多
-- company ⇄ project の多対多（会社単位での案件参照用）
create table ai_clone_meeting_persons (
  meeting_id uuid references ai_clone_meeting(id) on delete cascade,
  person_id uuid references ai_clone_person(id) on delete cascade,
  primary key (meeting_id, person_id)
);
create table ai_clone_meeting_projects (
  meeting_id uuid references ai_clone_meeting(id) on delete cascade,
  project_id uuid references ai_clone_project(id) on delete cascade,
  primary key (meeting_id, project_id)
);
create table ai_clone_meeting_services (
  meeting_id uuid references ai_clone_meeting(id) on delete cascade,
  service_id uuid references ai_clone_service(id) on delete cascade,
  primary key (meeting_id, service_id)
);
create table ai_clone_company_projects (
  company_id uuid references ai_clone_company(id) on delete cascade,
  project_id uuid references ai_clone_project(id) on delete cascade,
  primary key (company_id, project_id)
);

-- ============================================================
-- 6. RLS + updated_at trigger（新規テーブル分）
-- ============================================================
-- 既存パターン（0013_ai_clone_schema.sql）に揃える。
-- tenant_id を持つテーブルは ai_clone_is_tenant_member() による member 単位ガード。
-- リンクテーブルは結合元のRLSで実質的にカバーされるため、ここでは付与しない。

-- company
alter table ai_clone_company enable row level security;
create policy ai_clone_company_select on ai_clone_company for select
  using (ai_clone_is_tenant_member(tenant_id));
create policy ai_clone_company_modify on ai_clone_company for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));
create trigger ai_clone_company_set_updated_at
  before update on ai_clone_company
  for each row execute function ai_clone_set_updated_at();

-- meeting
alter table ai_clone_meeting enable row level security;
create policy ai_clone_meeting_select on ai_clone_meeting for select
  using (ai_clone_is_tenant_member(tenant_id));
create policy ai_clone_meeting_modify on ai_clone_meeting for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));
create trigger ai_clone_meeting_set_updated_at
  before update on ai_clone_meeting
  for each row execute function ai_clone_set_updated_at();

-- ============================================================
-- 完了
-- ============================================================
-- 次の作業（このファイル適用後に着手）:
--   * lib/ai-clone/supabase-db.ts を新規作成（Notion DB 関数を Supabase で再実装）
--   * conversation.ts の import を notion-db → supabase-db に差替、tenantId 引き回し
--   * app/api/slack/events/route.ts で event.user → tenant_members.slack_user_id 解決
--   * /clone/[slug]/settings に Slack user_id 登録 UI
