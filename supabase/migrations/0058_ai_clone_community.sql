-- 0058_ai_clone_community.sql
--
-- 「会」（BNI / 守成クラブ / テツジン会 等のコミュニティ）を実体として登録し、人物と
-- 多対多で紐付ける。これまで出会った場所は ai_clone_person.met_context（自由テキスト）
-- だけだったのを構造化し、「BNIの人一覧」照会や、カレンダーの会の予定→出会い登録の
-- 能動プロンプト（P2）の土台にする。met_context は会に当てはまらない出会い用に残す。

create table if not exists ai_clone_community (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  name text not null,                 -- 例: BNI / 守成クラブ / テツジン会
  name_normalized text,               -- マッチ用（スペース除去・小文字化）。カレンダー予定名との突合に使う
  kind text,                          -- 例会 / 勉強会 / 交流会 等（任意）
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_clone_community_tenant_idx on ai_clone_community(tenant_id);
create index if not exists ai_clone_community_norm_idx on ai_clone_community(tenant_id, name_normalized);

create trigger ai_clone_community_updated_at
  before update on ai_clone_community
  for each row execute function ai_clone_set_updated_at();

-- 人物 ⇄ 会（多対多）
create table if not exists ai_clone_person_communities (
  person_id uuid not null references ai_clone_person(id) on delete cascade,
  community_id uuid not null references ai_clone_community(id) on delete cascade,
  note text,                          -- 例: 「2026-06 BNI例会で名刺交換」
  created_at timestamptz not null default now(),
  primary key (person_id, community_id)
);
create index if not exists ai_clone_person_communities_comm_idx
  on ai_clone_person_communities(community_id);

alter table ai_clone_community enable row level security;
create policy ai_clone_community_select on ai_clone_community for select
  using (ai_clone_is_tenant_member(tenant_id));
create policy ai_clone_community_modify on ai_clone_community for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));

-- 紐付け表は親（community）のテナントで判定
alter table ai_clone_person_communities enable row level security;
create policy ai_clone_person_communities_select on ai_clone_person_communities for select
  using (
    exists (
      select 1 from ai_clone_community c
      where c.id = community_id and ai_clone_is_tenant_member(c.tenant_id)
    )
  );
create policy ai_clone_person_communities_modify on ai_clone_person_communities for all
  using (
    exists (
      select 1 from ai_clone_community c
      where c.id = community_id and ai_clone_is_tenant_member(c.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from ai_clone_community c
      where c.id = community_id and ai_clone_is_tenant_member(c.tenant_id)
    )
  );
