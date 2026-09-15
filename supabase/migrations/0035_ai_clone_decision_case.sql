-- ===================================================================
-- 0035: 判断事例 (ai_clone_decision_case) と 事例⇄原則リンク追加
-- 作成: 2026-05-19
--
-- 目的:
--   /clone/[slug]/core-os/decision-principles に「事例ログ」サブタブを
--   追加し、判断事例を蓄積する基盤を作る。事例は「原則の素材」として
--   扱い、ある程度溜まったら AI が共通点を見つけて「原則化しませんか？」
--   と提案する流れを想定（Phase 5 で実装）。
--
-- 設計判断:
--   * 「事例」と「原則」を別テーブルに切り、M:N リンクで関連付ける
--     - 1つの事例が複数の原則の根拠になる
--     - 1つの原則は複数の事例から導かれる
--   * 短ログ（5項目）と長ログ（追加項目）を同じテーブルに、
--     capture_mode カラムで区別。最低5項目あれば short として保存可。
--   * AI が会話文から自動抽出した事例は ai_drafted=true / confirmed=false
--     で一旦置き、ユーザー confirm でだけ正本化される（学習資産に
--     架空の「らしき」抽出が混ざらないようガード）。
--   * 既存 ai_clone_decision_principle に auto_suggested と draft 列を
--     追加し、「AI が事例から提案した原則」「ユーザー確認待ち」を区別。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

-- ─── 既存 ai_clone_decision_principle 拡張 ────────────────────
alter table ai_clone_decision_principle
  add column if not exists auto_suggested boolean not null default false,
  add column if not exists draft boolean not null default false;

comment on column ai_clone_decision_principle.auto_suggested is
  'AI が事例から自動抽出して提案した原則かどうか（true=自動提案）。手動入力は false。';
comment on column ai_clone_decision_principle.draft is
  'ユーザー確認待ちかどうか（true=ドラフト）。AI 提案物は draft=true で作成し、ユーザーが confirm で false に。';

-- ─── 新規 ai_clone_decision_case（判断事例） ──────────────────
create table if not exists ai_clone_decision_case (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references ai_clone_tenants(id) on delete cascade,
  occurred_at  timestamptz not null default now(),

  -- ショート版（5項目、event のみ必須）
  event        text not null,
  insight      text,
  action       text,
  outcome      text,
  takeaway     text,

  -- ロング版（任意、AI 補完で埋める想定）
  intent        text,
  boundary      text,
  reflection    text,
  reusable_when text,
  emotion       text,

  -- 状態フラグ
  capture_mode text not null default 'short'
    check (capture_mode in ('short', 'long')),
  ai_drafted   boolean not null default false,
  confirmed    boolean not null default true,

  -- 関連付け（任意）
  related_person_ids         uuid[],
  related_project_id         uuid references ai_clone_project(id) on delete set null,
  source_conversation_log_id uuid references ai_clone_conversation_log(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table ai_clone_decision_case is
  '判断事例ログ。日々の出来事と判断・結果を短く記録し、AI が補完・原則化していくための素材。';
comment on column ai_clone_decision_case.event is
  '何があったか（必須）。短い1〜数行で OK。';
comment on column ai_clone_decision_case.insight is
  '本当は何が問題だと思ったか（表面ではなく本質）。';
comment on column ai_clone_decision_case.action is
  '実際に何と言った／何をしたか。';
comment on column ai_clone_decision_case.outcome is
  '相手や状況はどう変わったか。';
comment on column ai_clone_decision_case.takeaway is
  '一言での学び。原則化されると principle へ昇格。';
comment on column ai_clone_decision_case.intent is
  'なぜその対応にしたか（判断意図）。';
comment on column ai_clone_decision_case.boundary is
  'どこまで対応すべきだと思ったか。専門家・有料案件・本人課題などの線引き。';
comment on column ai_clone_decision_case.reflection is
  '今なら何を変えるか。';
comment on column ai_clone_decision_case.reusable_when is
  'どんな人・状況ならこの考え方を使えるか（汎化条件）。';
comment on column ai_clone_decision_case.emotion is
  'その時の自分の感情。参考情報として保持。AI 五島の応答では再現させない（CEO 判断は感情ノイズを除いた原則部分）。';
comment on column ai_clone_decision_case.capture_mode is
  'short=ショート版（5項目）/ long=ロング版（全項目）。';
comment on column ai_clone_decision_case.ai_drafted is
  'AI が会話文から自動抽出したものかどうか（true=AI 抽出）。';
comment on column ai_clone_decision_case.confirmed is
  'ユーザーが内容を確認したかどうか。false の事例は学習資産として使わない（誤抽出ガード）。';

create index if not exists ai_clone_decision_case_tenant_idx
  on ai_clone_decision_case (tenant_id, occurred_at desc);

-- RLS：テナント member のみ全操作可
alter table ai_clone_decision_case enable row level security;

create policy ai_clone_decision_case_all
  on ai_clone_decision_case
  for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));

-- updated_at 自動更新トリガー
create or replace function ai_clone_decision_case_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_clone_decision_case_touch on ai_clone_decision_case;
create trigger ai_clone_decision_case_touch
  before update on ai_clone_decision_case
  for each row execute function ai_clone_decision_case_touch_updated_at();

-- ─── 新規 ai_clone_case_principle_link（事例 ⇄ 原則 M:N） ────
create table if not exists ai_clone_case_principle_link (
  case_id      uuid not null references ai_clone_decision_case(id) on delete cascade,
  principle_id uuid not null references ai_clone_decision_principle(id) on delete cascade,
  -- 関係性の種類
  --   evidence : 既存原則の裏付け事例
  --   origin   : この事例から新規原則が生まれた
  --   refined  : この事例で既存原則が修正された
  relationship text not null default 'evidence'
    check (relationship in ('evidence', 'origin', 'refined')),
  created_at timestamptz not null default now(),
  primary key (case_id, principle_id)
);

comment on table ai_clone_case_principle_link is
  '事例 ⇄ 原則の多対多リンク。1事例が複数原則の根拠になる、1原則が複数事例から支えられる構造。';

create index if not exists ai_clone_case_principle_link_principle_idx
  on ai_clone_case_principle_link (principle_id);

alter table ai_clone_case_principle_link enable row level security;

-- 親テーブル両方が tenant member 制約を持つので、リンクはどちらかの
-- tenant_id を辿って判定する。case 側で判定。
create policy ai_clone_case_principle_link_all
  on ai_clone_case_principle_link
  for all
  using (
    exists (
      select 1 from ai_clone_decision_case c
      where c.id = ai_clone_case_principle_link.case_id
        and ai_clone_is_tenant_member(c.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from ai_clone_decision_case c
      where c.id = ai_clone_case_principle_link.case_id
        and ai_clone_is_tenant_member(c.tenant_id)
    )
  );
