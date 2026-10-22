-- 複数の店の権限テスト（2026-10-22）。仕様：contexts/projects/gia/sakaba_multi_store_spec.md
--
-- 使い方：全 migration（0001〜0132）を当てた手元の PostgreSQL の複製に対して、psql で流す。本番では流さない。
--   psql -h localhost -p 55432 -U postgres -d <複製DB> -v ON_ERROR_STOP=1 -f multi_store_permissions.sql
-- 前提：Supabase の前提物のスタブ（anon/authenticated/service_role ロール・auth.users・
--   auth.uid() が current_setting('test.uid') を返す・storage）が用意されていること。
--   0080 の owner 付与は空のDBでは「管理者ユーザーが無い」で失敗するが、このテストは影響を受けない。
-- 全体を BEGIN〜ROLLBACK で囲むので、何も残らない。
-- 出力：PASS / FAIL の行。FAIL が1つでもあれば最後に例外で止まる。
--
-- 登場人物：G＝五島さん役（両店の owner）／A＝GIAの酒場だけの会員／K＝建設・不動産だけの会員／
--           M＝建設・不動産だけのマスター／N＝まだどこにも入っていない新人

begin;

create temp table results (name text, ok boolean, detail text);

select id as gia_id from sakaba.guilds where slug = 'gia' \gset
select id as ken_id from sakaba.guilds where slug = 'kensetsu-fudosan' \gset
select set_config('test.ken_id', :'ken_id', false);
select set_config('test.gia_id', :'gia_id', false);

\set u_g '11111111-1111-4111-8111-111111111111'
\set u_a '22222222-2222-4222-8222-222222222222'
\set u_k '33333333-3333-4333-8333-333333333333'
\set u_m '44444444-4444-4444-8444-444444444444'
\set u_n '55555555-5555-4555-8555-555555555555'

-- ---------- 人と所属（postgres＝管理者として直接入れる） ----------
insert into auth.users (id, email) values
  (:'u_g', 'g@example.test'), (:'u_a', 'a@example.test'), (:'u_k', 'k@example.test'),
  (:'u_m', 'm@example.test'), (:'u_n', 'n@example.test');
insert into sakaba.profiles (user_id, display_name) values
  (:'u_g', '五島役'), (:'u_a', 'Aさん'), (:'u_k', 'Kさん'), (:'u_m', 'Mさん'), (:'u_n', '新人N');
-- 招待（会員になった経路ぶんと、これから使うぶん。両店に）
insert into sakaba.invites (guild_id, code, created_by, max_uses) values
  (:'gia_id', 'GIA-USED-A', :'u_g', 1),
  (:'ken_id', 'KEN-USED-K', :'u_g', 1),
  (:'ken_id', 'KEN-USED-M', :'u_g', 1),
  (:'gia_id', 'GIA-INVITE-CODE-1', :'u_g', 1),
  (:'ken_id', 'KEN-INVITE-CODE-1', :'u_g', 1),
  (:'ken_id', 'KEN-INVITE-CODE-2', :'u_g', 1);
insert into sakaba.guild_members (guild_id, user_id, role, company_name, position, promises_agreed_at, joined_at, invite_id) values
  (:'gia_id', :'u_g', 'owner', 'GIA', 'ceo', now(), now() - interval '10 days', null),
  (:'gia_id', :'u_a', 'member', 'A社', 'ceo', now(), now(), (select id from sakaba.invites where code = 'GIA-USED-A')),
  (:'ken_id', :'u_g', 'owner', 'GIA', 'ceo', now(), now() - interval '5 days', null),
  (:'ken_id', :'u_k', 'member', 'K建設', 'ceo', now(), now(), (select id from sakaba.invites where code = 'KEN-USED-K')),
  (:'ken_id', :'u_m', 'master', 'M不動産', 'ceo', now(), now(), (select id from sakaba.invites where code = 'KEN-USED-M'));
update sakaba.invites set used_count = 1 where code in ('GIA-USED-A', 'KEN-USED-K', 'KEN-USED-M');
-- 招待状の下書き（建設・不動産の側）
insert into sakaba.prepared_invites (invite_id, display_name, company_name, position, introduction)
select id, 'ゲスト', 'ゲスト社', 'ceo', 'こんにちは' from sakaba.invites where code = 'KEN-INVITE-CODE-1';

-- ---------- 中身を作る（本物のRPCを通す＝本物の入口で作る） ----------
set local role authenticated;

select set_config('test.uid', :'u_k', true);
select public.sakaba_create_quest('kensetsu-fudosan', 'K店のクエスト', 'work', 'k', 'k', '大阪', null, null) as q_k \gset
select public.sakaba_create_project('kensetsu-fudosan', 'K店のプロジェクト', '', '', null, null) as p_k \gset
select public.sakaba_create_intro_request('kensetsu-fudosan', :'u_g', 'work', 'K店の依頼') as i_k \gset

select set_config('test.uid', :'u_a', true);
select public.sakaba_create_quest('gia', 'GIA店のクエスト', 'work', 'a', 'a', '東京', null, null) as q_a \gset
select public.sakaba_create_project('gia', 'GIA店のプロジェクト', '', '', null, null) as p_a \gset
select public.sakaba_create_intro_request('gia', :'u_g', 'work', 'A店の依頼') as i_a \gset

select set_config('test.uid', :'u_g', true);
select public.sakaba_apply_to_quest(:'q_k', 'Gが参加したい');
select public.sakaba_apply_to_quest(:'q_a', 'Gが参加したい');
select public.sakaba_rotate_my_share('gia') as share_g \gset

select set_config('test.uid', :'u_k', true);
select public.sakaba_rotate_my_share('kensetsu-fudosan') as share_k \gset

reset role;

-- ---------- 判定の道具 ----------
-- 「見えない」：エラー（権限・店なし・入力不正）で終わるか、空（null/[]/{}）が返ること。何か返ったら・何事もなく成功したら FAIL
create function pg_temp.hidden(p_name text, p_uid text, p_sql text) returns void language plpgsql as $f$
declare v_res text; v_state text;
begin
  perform set_config('test.uid', p_uid, true);
  set local role authenticated;
  begin
    execute 'select coalesce(x::text, ''null'') from (' || p_sql || ') t(x)' into v_res;
    reset role;
    insert into results values (p_name, v_res in ('null', '[]', '{}'), '返った値=[' || left(coalesce(v_res, ''), 80) || ']');
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    reset role;
    insert into results values (p_name, v_state in ('42501', 'P0002', '22023', '28000'), 'エラー ' || v_state || ' ' || left(sqlerrm, 60));
  end;
end $f$;

-- 「見える」：成功して、空でない中身が返ること
create function pg_temp.visible(p_name text, p_uid text, p_sql text) returns void language plpgsql as $f$
declare v_res text;
begin
  perform set_config('test.uid', p_uid, true);
  set local role authenticated;
  begin
    execute 'select coalesce(x::text, ''null'') from (' || p_sql || ') t(x)' into v_res;
    reset role;
    insert into results values (p_name, v_res not in ('null', '[]', '{}', ''), left(coalesce(v_res, ''), 80));
  exception when others then
    reset role;
    insert into results values (p_name, false, 'エラー ' || sqlstate || ' ' || left(sqlerrm, 80));
  end;
end $f$;

-- 返った jsonb の中に、ある文字列が含まれていること／いないこと
create function pg_temp.contains(p_name text, p_uid text, p_sql text, p_needle text, p_expect boolean) returns void language plpgsql as $f$
declare v_res text;
begin
  perform set_config('test.uid', p_uid, true);
  set local role authenticated;
  begin
    execute 'select coalesce(x::text, ''null'') from (' || p_sql || ') t(x)' into v_res;
    reset role;
    insert into results values (p_name, (position(p_needle in v_res) > 0) = p_expect, left(coalesce(v_res, ''), 100));
  exception when others then
    reset role;
    insert into results values (p_name, false, 'エラー ' || sqlstate || ' ' || left(sqlerrm, 80));
  end;
end $f$;

-- ================= 1. A（GIAの酒場だけの会員）は、建設・不動産の酒場を見られない =================
select pg_temp.hidden('A→K店 自分の文脈', :'u_a', $q$select public.sakaba_get_my_context('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 名簿', :'u_a', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 クエスト一覧', :'u_a', $q$select public.sakaba_list_quests('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 紹介依頼', :'u_a', $q$select public.sakaba_list_intro_requests('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 知らせ', :'u_a', $q$select public.sakaba_list_my_notifications('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 招待一覧（管理者用）', :'u_a', $q$select public.sakaba_list_master_invites('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 招待状の下書き一覧', :'u_a', $q$select public.sakaba_list_prepared_invites('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 承認待ち会員', :'u_a', $q$select public.sakaba_list_pending_members('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 マスター紹介', :'u_a', $q$select public.sakaba_list_master_introductions('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 プロジェクト', :'u_a', $q$select public.sakaba_list_my_projects('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 名刺一覧', :'u_a', $q$select public.sakaba_list_business_cards('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 自分の招待', :'u_a', $q$select public.sakaba_get_my_member_invite('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 招待のつながり', :'u_a', $q$select public.sakaba_list_invite_network('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 相談一覧（管理者用）', :'u_a', $q$select public.sakaba_list_consult_requests('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 ご意見一覧（管理者用）', :'u_a', $q$select public.sakaba_list_feedback_reports('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 タスクの見え方', :'u_a', $q$select public.sakaba_list_task_visibility('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 プロフィール', :'u_a', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 クエストを作る', :'u_a', $q$select public.sakaba_create_quest('kensetsu-fudosan', 'のりこみ', 'work', 'x', 'x', 'x', null, null)$q$);
select pg_temp.hidden('A→K店 プロジェクトを作る', :'u_a', $q$select public.sakaba_create_project('kensetsu-fudosan', 'のりこみ', '', '', null, null)$q$);
select pg_temp.hidden('A→K店 紹介依頼を出す', :'u_a', format($q$select public.sakaba_create_intro_request('kensetsu-fudosan', %L, 'work', 'x')$q$, :'u_k'));
select pg_temp.hidden('A→K店 招待を作る（管理者用）', :'u_a', $q$select public.sakaba_create_master_invite('kensetsu-fudosan')$q$);
select pg_temp.hidden('A→K店 共有URLを作る', :'u_a', $q$select public.sakaba_rotate_my_share('kensetsu-fudosan')$q$);
-- 店の名前を言わずに、K店の「ID」だけで操作する抜け道
select pg_temp.hidden('A→K店のクエストに参加', :'u_a', format($q$select public.sakaba_apply_to_quest(%L, 'のりこみ')$q$, :'q_k'));
select pg_temp.hidden('A→K店のクエストの応募者', :'u_a', format($q$select public.sakaba_list_quest_applicants(%L)$q$, :'q_k'));
select pg_temp.hidden('A→K店のクエストを取り下げ', :'u_a', format($q$select public.sakaba_withdraw_quest(%L)$q$, :'q_k'));
select pg_temp.hidden('A→K店のプロジェクトの中身', :'u_a', format($q$select public.sakaba_get_project_pipeline(%L)$q$, :'p_k'));
select pg_temp.hidden('A→K店のプロジェクトを消す', :'u_a', format($q$select public.sakaba_delete_project(%L)$q$, :'p_k'));
select pg_temp.hidden('A→K店の紹介依頼に返事', :'u_a', format($q$select public.sakaba_act_on_intro_request(%L, 'accept', '')$q$, :'i_k'));
select pg_temp.hidden('A→K店のKさんの名刺', :'u_a', format($q$select public.sakaba_get_business_card(%L)$q$, :'u_k'));
select pg_temp.hidden('A→K店のKさんのつながり', :'u_a', format($q$select public.sakaba_get_member_link_info(%L, 'kensetsu-fudosan')$q$, :'u_k'));
select pg_temp.hidden('A→K店のKさんへの紹介文一覧', :'u_a', format($q$select public.sakaba_list_member_introductions('kensetsu-fudosan', %L)$q$, :'u_k'));
-- GIAの酒場の名簿・クエスト・知らせに K店の人・物が混ざっていないこと（店の取り違えが無いこと）
select pg_temp.contains('A→GIA店の名簿にKさんがいない', :'u_a', $q$select public.sakaba_list_members('gia')$q$, 'K建設', false);
select pg_temp.contains('A→GIA店のクエストにK店のものがない', :'u_a', $q$select public.sakaba_list_quests('gia')$q$, 'K店のクエスト', false);
select pg_temp.contains('A→GIA店のクエストに自店のものがある', :'u_a', $q$select public.sakaba_list_quests('gia')$q$, 'GIA店のクエスト', true);
select pg_temp.contains('A→GIA店のプロジェクトにK店のものがない', :'u_a', $q$select public.sakaba_list_my_projects('gia')$q$, 'K店のプロジェクト', false);

-- 表を直接読む：guild_id を持つ全テーブルについて、A から見える K店の行が 0（権限が無くて読めないのも「見えない」）
select set_config('test.uid', :'u_a', true);
set local role authenticated;
do $$
declare t record; v_n bigint;
begin
  for t in
    -- information_schema は「権限のある表」しか見せないので、権限の無い表が抜け落ちる。pg_catalog から数える
    select cl.relname as table_name from pg_class cl
    join pg_namespace ns on ns.oid = cl.relnamespace and ns.nspname = 'sakaba'
    join pg_attribute at on at.attrelid = cl.oid and at.attname = 'guild_id' and not at.attisdropped
    where cl.relkind = 'r' order by 1
  loop
    begin
      execute format('select count(*) from sakaba.%I where guild_id = %L', t.table_name, current_setting('test.ken_id')) into v_n;
      reset role;
      insert into results values ('A→K店の表 ' || t.table_name || '（直接読む）', v_n = 0, '見えた行=' || v_n);
      set local role authenticated;
    exception when insufficient_privilege then
      reset role;
      insert into results values ('A→K店の表 ' || t.table_name || '（直接読む）', true, '権限なし（読めない）');
      set local role authenticated;
    end;
  end loop;
  reset role;
end $$;
reset role;
insert into results
select 'A→K店の表を全部調べた（12表以上。抜け落ちなし）', count(*) >= 12, count(*)::text
from results where name like 'A→K店の表 %';

-- 対照：同じ読み方で、K店の会員 K からは K店の行が見える（上の「0」が、読み方の誤りで0になっているのではないこと）
select set_config('test.uid', :'u_k', true);
set local role authenticated;
select (select count(*) from sakaba.guild_members where guild_id = :'ken_id') >= 1
   and (select count(*) from sakaba.notifications where guild_id = :'ken_id') >= 1
   and (select count(*) from sakaba.projects where guild_id = :'ken_id') >= 1 as ok \gset
reset role;
insert into results values ('対照：K→K店の表は直接読むと行が見える', :'ok', '');

-- ================= 2. K（建設・不動産だけの会員）は、GIAの酒場を見られない（逆向き） =================
select pg_temp.hidden('K→GIA店 名簿', :'u_k', $q$select public.sakaba_list_members('gia')$q$);
select pg_temp.hidden('K→GIA店 クエスト一覧', :'u_k', $q$select public.sakaba_list_quests('gia')$q$);
select pg_temp.hidden('K→GIA店 紹介依頼', :'u_k', $q$select public.sakaba_list_intro_requests('gia')$q$);
select pg_temp.hidden('K→GIA店 知らせ', :'u_k', $q$select public.sakaba_list_my_notifications('gia')$q$);
select pg_temp.hidden('K→GIA店のクエストに参加', :'u_k', format($q$select public.sakaba_apply_to_quest(%L, 'のりこみ')$q$, :'q_a'));
select pg_temp.hidden('K→GIA店のプロジェクトの中身', :'u_k', format($q$select public.sakaba_get_project_pipeline(%L)$q$, :'p_a'));
select pg_temp.contains('K→K店のクエストに自店のものがある', :'u_k', $q$select public.sakaba_list_quests('kensetsu-fudosan')$q$, 'K店のクエスト', true);
select pg_temp.contains('K→K店のクエストにGIA店のものがない', :'u_k', $q$select public.sakaba_list_quests('kensetsu-fudosan')$q$, 'GIA店のクエスト', false);
select pg_temp.contains('K→K店の知らせは自店のクエストだけ', :'u_k', $q$select public.sakaba_list_my_notifications('kensetsu-fudosan')$q$, :'q_k', true);

-- ================= 3. M（建設・不動産のマスター）は、自分の店の管理だけ =================
select pg_temp.visible('M→K店 招待一覧（管理者用）が見える', :'u_m', $q$select public.sakaba_list_master_invites('kensetsu-fudosan')$q$);
select pg_temp.hidden('M→GIA店 招待一覧（管理者用）', :'u_m', $q$select public.sakaba_list_master_invites('gia')$q$);
select pg_temp.hidden('M→GIA店 招待を作る（管理者用）', :'u_m', $q$select public.sakaba_create_master_invite('gia')$q$);
select pg_temp.hidden('M→GIA店 承認待ち会員', :'u_m', $q$select public.sakaba_list_pending_members('gia')$q$);
select pg_temp.hidden('M→GIA店 名簿', :'u_m', $q$select public.sakaba_list_members('gia')$q$);

-- ================= 4. G（両店のowner）は両方見られる =================
select pg_temp.contains('G→GIA店の名簿にAさん', :'u_g', $q$select public.sakaba_list_members('gia')$q$, 'A社', true);
select pg_temp.contains('G→K店の名簿にKさん', :'u_g', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, 'K建設', true);
select pg_temp.contains('G→GIA店の名簿にKさんはいない', :'u_g', $q$select public.sakaba_list_members('gia')$q$, 'K建設', false);
select pg_temp.contains('G→K店の名簿にAさんはいない', :'u_g', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, 'A社', false);
select pg_temp.contains('G→GIA店のクエスト', :'u_g', $q$select public.sakaba_list_quests('gia')$q$, 'GIA店のクエスト', true);
select pg_temp.contains('G→K店のクエスト', :'u_g', $q$select public.sakaba_list_quests('kensetsu-fudosan')$q$, 'K店のクエスト', true);
select pg_temp.contains('G→K店の紹介依頼（Kさんから）', :'u_g', $q$select public.sakaba_list_intro_requests('kensetsu-fudosan')$q$, 'K店の依頼', true);
select pg_temp.contains('G→K店の紹介依頼にAさんの依頼は混ざらない', :'u_g', $q$select public.sakaba_list_intro_requests('kensetsu-fudosan')$q$, 'A店の依頼', false);
select pg_temp.contains('G→GIA店の紹介依頼にKさんの依頼は混ざらない', :'u_g', $q$select public.sakaba_list_intro_requests('gia')$q$, 'K店の依頼', false);
select pg_temp.visible('G→K店 招待一覧（管理者用）', :'u_g', $q$select public.sakaba_list_master_invites('kensetsu-fudosan')$q$);
select pg_temp.visible('G→GIA店 招待一覧（管理者用）', :'u_g', $q$select public.sakaba_list_master_invites('gia')$q$);

-- ================= 5. 招待は、招待した店に入る =================
select pg_temp.contains('招待の確認：K店の招待は K店を指す', :'u_n', $q$select public.sakaba_check_invite('KEN-INVITE-CODE-1')$q$, 'kensetsu-fudosan', true);
select pg_temp.contains('招待の確認：GIA店の招待は GIA店を指す', :'u_n', $q$select public.sakaba_check_invite('GIA-INVITE-CODE-1')$q$, '"slug": "gia"', true);

select set_config('test.uid', :'u_n', true);
set local role authenticated;
select public.sakaba_join_guild('KEN-INVITE-CODE-2', '新人N', 'N社', 'ceo', true, '', true, '', '') as joined \gset
reset role;
select (select count(*) from sakaba.guild_members where user_id = :'u_n' and guild_id = :'ken_id') = 1
   and (select count(*) from sakaba.guild_members where user_id = :'u_n' and guild_id = :'gia_id') = 0 as ok \gset
insert into results values ('K店の招待で入った人は K店だけの会員になる（GIA店には入らない）', :'ok', :'joined');
select pg_temp.hidden('N（K店の招待で入った）→GIA店の名簿', :'u_n', $q$select public.sakaba_list_members('gia')$q$);
select pg_temp.visible('N（K店の招待で入った）→K店の名簿', :'u_n', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$);

-- ================= 6. 店を受けるようにした2つの関数（0131） =================
select pg_temp.contains('招待状：店の指定なし（コードが鍵）', 'x', $q$select public.sakaba_get_prepared_invite('KEN-INVITE-CODE-1')$q$, 'ゲスト社', true);
select pg_temp.contains('招待状：正しい店を指定', 'x', $q$select public.sakaba_get_prepared_invite('KEN-INVITE-CODE-1', 'kensetsu-fudosan')$q$, 'ゲスト社', true);
select pg_temp.hidden('招待状：ちがう店を指定すると返さない', 'x', $q$select public.sakaba_get_prepared_invite('KEN-INVITE-CODE-1', 'gia')$q$);
select pg_temp.hidden('招待状：コードが違えば返さない', 'x', $q$select public.sakaba_get_prepared_invite('NOPE', 'kensetsu-fudosan')$q$);

select pg_temp.contains('共有URL：K店だけの人の共有URLが開ける（店の指定なし）', 'x', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_k'), 'Kさん', true);
select pg_temp.contains('共有URL：K店の人をK店として開ける', 'x', format($q$select public.sakaba_get_shared_profile(%L, 'kensetsu-fudosan')$q$, :'share_k'), 'Kさん', true);
select pg_temp.hidden('共有URL：K店の人をGIA店として開くと出ない', 'x', format($q$select public.sakaba_get_shared_profile(%L, 'gia')$q$, :'share_k'));
select pg_temp.contains('共有URL：GIA店の人（今まで通り）', 'x', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_g'), '五島役', true);
select pg_temp.hidden('共有URL：存在しない店を指定すると出ない', 'x', format($q$select public.sakaba_get_shared_profile(%L, 'nonexistent')$q$, :'share_k'));
select pg_temp.hidden('共有URL：形の違う文字列は出ない', 'x', $q$select public.sakaba_get_shared_profile('abc', 'gia')$q$);

-- 未ログイン（anon）でも呼べること（公開の関数）
set local role anon;
select (public.sakaba_get_prepared_invite('KEN-INVITE-CODE-1', 'kensetsu-fudosan') is not null) as ok \gset
reset role;
insert into results values ('未ログイン（anon）でも招待状が読める', :'ok', '');
set local role anon;
select (public.sakaba_get_shared_profile(:'share_k', 'kensetsu-fudosan') is not null) as ok \gset
reset role;
insert into results values ('未ログイン（anon）でも共有URLが読める', :'ok', '');

-- ================= 7. プッシュ通知の行き先は、知らせのある店の道 =================
insert into results
select 'プッシュの行き先：' || c.event_key, c.href like '/guild/kensetsu-fudosan/%', c.href
from public.sakaba_push_candidates() c
where c.user_id = :'u_k' and c.event_key like 'notice:%';
insert into results
select 'プッシュの行き先(GIA店)：' || c.event_key, c.href like '/guild/gia/%', c.href
from public.sakaba_push_candidates() c
where c.user_id = :'u_a' and c.event_key like 'notice:%';
select (select count(*) from public.sakaba_push_candidates() c where c.user_id in (:'u_k', :'u_a') and c.event_key like 'notice:%') >= 2 as ok \gset
insert into results values ('プッシュの候補が実際に2件以上できている（空振りで通らない）', :'ok', '');
select count(*) filter (where c.href !~ '^/guild/(gia|kensetsu-fudosan)/') = 0 as ok from public.sakaba_push_candidates() c \gset
insert into results values ('プッシュの行き先に店のない古い形が1つもない', :'ok', '');

-- ================= 8. 店の行（0132） =================
select (select name from sakaba.guilds where slug = 'kensetsu-fudosan') = '建設・不動産の酒場'
   and (select terms->>'quest' from sakaba.guilds where slug = 'kensetsu-fudosan') = '案件・探しもの'
   and (select count(*) from sakaba.guild_members where guild_id = :'ken_id' and role = 'owner') = 1 as ok \gset
insert into results values ('K店の行がある（名前・呼び名）', :'ok', '');

-- ================= 9. 入口の状態（画面の「この店の会員ではありません」の根拠＝sakaba_get_my_gate_status） =================
-- 画面（app/guild/[store]/layout.tsx）は 'none' のときだけ「会員ではありません」を出す。会員が 'none' で返ると全員が締め出されるので、会員は必ず 'active'
select pg_temp.contains('入口の状態：GIA店の会員Aは GIA店で active', :'u_a', $q$select public.sakaba_get_my_gate_status('gia')$q$, 'active', true);
select pg_temp.contains('入口の状態：GIA店の会員Aは K店で none', :'u_a', $q$select public.sakaba_get_my_gate_status('kensetsu-fudosan')$q$, 'none', true);
select pg_temp.contains('入口の状態：K店の会員Kは K店で active', :'u_k', $q$select public.sakaba_get_my_gate_status('kensetsu-fudosan')$q$, 'active', true);
select pg_temp.contains('入口の状態：K店の会員Kは GIA店で none', :'u_k', $q$select public.sakaba_get_my_gate_status('gia')$q$, 'none', true);
select pg_temp.contains('入口の状態：両店のownerは GIA店で active', :'u_g', $q$select public.sakaba_get_my_gate_status('gia')$q$, 'active', true);
select pg_temp.contains('入口の状態：両店のownerは K店で active', :'u_g', $q$select public.sakaba_get_my_gate_status('kensetsu-fudosan')$q$, 'active', true);
select pg_temp.contains('入口の状態：K店のマスターMは K店で active', :'u_m', $q$select public.sakaba_get_my_gate_status('kensetsu-fudosan')$q$, 'active', true);
select pg_temp.contains('入口の状態：K店の招待で入ったNは K店で active', :'u_n', $q$select public.sakaba_get_my_gate_status('kensetsu-fudosan')$q$, 'active', true);
select pg_temp.contains('入口の状態：K店の招待で入ったNは GIA店で none', :'u_n', $q$select public.sakaba_get_my_gate_status('gia')$q$, 'none', true);

-- ================= 結果 =================
select case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by ok, name;
select count(*) filter (where ok) as pass, count(*) filter (where not ok) as fail, count(*) as total from results;
do $$
begin
  if exists (select 1 from results where not ok) then
    raise exception 'FAIL があります（上の一覧を見てください）';
  end if;
end $$;

rollback;
