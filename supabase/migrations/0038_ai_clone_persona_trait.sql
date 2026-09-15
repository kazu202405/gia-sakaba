-- 0038_ai_clone_persona_trait.sql
--
-- Core OS 拡張：振り返りから滲み出る「本人の傾向（クセ）」を蓄積するテーブル。
--
-- 用途:
--   * 振り返り送信時、AI が「五島さんはこういう人かも」を 1〜2 件抽出して
--     status='candidate' で INSERT。
--   * /clone/<slug>/core-os/persona-traits で承認/却下/編集。
--   * 採択（status='adopted'）されたものは AI Clone のシステムプロンプトに
--     「## あなたの傾向」セクションとして category 別に注入される。
--
-- 設計判断:
--   * Core OS の他テーブル（decision_principle/ng_rule/tone_rule）が「明示的に
--     決めたルール」なのに対し、persona_trait は「観察から滲み出た傾向」を扱う。
--     明示型と観察型を別テーブルにすることで、AI Clone への注入時に
--     「## あなたのルール」と「## あなたの傾向」をセクション分けできる。
--   * source_journal_id で抽出元日記にトレース可（後から検証可能）。
--   * adopted_at は採択された瞬間を残す。「最近採択されたもの」をシステム
--     プロンプトで重く扱う等の将来拡張に備える。

begin;

create table ai_clone_persona_trait (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  -- 8 カテゴリ固定。新カテゴリ追加時は CHECK 制約を migration で更新する。
  category text not null check (category in (
    '価値観', '判断軸', '学びクセ', '好み',
    '息抜き', '心理パターン', '仕事スタイル', '関係性パターン'
  )),
  -- 1 行で言い切る本人特性（例：「数字より関係性を優先する」）
  trait text not null,
  -- 補足説明（具体例・出典の文脈など。省略可）
  detail text,
  -- 候補（AI 抽出直後）／採択（システムプロンプトに反映）／却下（不採用）
  status text not null default 'candidate'
    check (status in ('candidate', 'adopted', 'dismissed')),
  -- 抽出元の日記。日記が消えても trait は残せるよう ON DELETE SET NULL。
  source_journal_id uuid references ai_clone_journal(id) on delete set null,
  -- 採択された瞬間（後から「最近採択された傾向」を重く扱う等に使える）
  adopted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 一覧表示：ステータス別に新しい順
create index ai_clone_persona_trait_tenant_status_idx
  on ai_clone_persona_trait(tenant_id, status, created_at desc);

-- AI Clone のシステムプロンプト構築時：採択済みを category 順に引く
create index ai_clone_persona_trait_adopted_idx
  on ai_clone_persona_trait(tenant_id, status, category)
  where status = 'adopted';

-- updated_at の自動更新
create or replace function ai_clone_persona_trait_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  -- status が adopted に変わった瞬間、adopted_at を打刻（既に adopted なら維持）
  if new.status = 'adopted' and (old.status is null or old.status <> 'adopted') then
    new.adopted_at := now();
  end if;
  return new;
end;
$$;

create trigger ai_clone_persona_trait_touch_updated_at_trg
  before update on ai_clone_persona_trait
  for each row execute function ai_clone_persona_trait_touch_updated_at();

-- INSERT 時にも、もし最初から status='adopted' なら adopted_at を打刻
create or replace function ai_clone_persona_trait_set_adopted_at_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'adopted' and new.adopted_at is null then
    new.adopted_at := now();
  end if;
  return new;
end;
$$;

create trigger ai_clone_persona_trait_set_adopted_at_insert_trg
  before insert on ai_clone_persona_trait
  for each row execute function ai_clone_persona_trait_set_adopted_at_on_insert();

-- RLS: tenant_member のみ。bot 経路（handleReflection から）は service_role で越える。
alter table ai_clone_persona_trait enable row level security;

create policy ai_clone_persona_trait_select on ai_clone_persona_trait for select
  using (ai_clone_is_tenant_member(tenant_id));

create policy ai_clone_persona_trait_modify on ai_clone_persona_trait for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));

commit;
