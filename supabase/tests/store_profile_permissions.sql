-- プロフィールを店ごとに分けたことの権限・分離テスト（2026-10-29）。仕様：contexts/projects/gia/sakaba_store_profile_spec.md
--
-- 使い方：全 migration（0001〜0136）を当てた手元の PostgreSQL の複製に対して、psql で流す。本番では流さない。
--   psql -h localhost -p 55432 -U postgres -d <複製DB> -v ON_ERROR_STOP=1 -f store_profile_permissions.sql
-- 前提・出力・終わり方は multi_store_permissions.sql と同じ（スタブ済みの複製・BEGIN〜ROLLBACK・FAIL があれば最後に例外）。
-- 移し替えそのものの照合（移す前後で一致）は 0134 の末尾が行う。ここでは、移した後の分離と、新しい入口を確かめる。
--
-- 登場人物：G＝両店の owner／A＝GIAだけの会員／K＝建設・不動産だけの会員／M＝建設・不動産のマスター／N＝まだどこにも入っていない新人

begin;

create temp table results (name text, ok boolean, detail text);

select id as gia_id from sakaba.guilds where slug = 'gia' \gset
select id as ken_id from sakaba.guilds where slug = 'kensetsu-fudosan' \gset

\set u_g '11111111-1111-4111-8111-111111111111'
\set u_a '22222222-2222-4222-8222-222222222222'
\set u_k '33333333-3333-4333-8333-333333333333'
\set u_m '44444444-4444-4444-8444-444444444444'
\set u_n '55555555-5555-4555-8555-555555555555'

-- ---------- 人と所属 ----------
insert into auth.users (id, email) values
  (:'u_g', 'g@example.test'), (:'u_a', 'a@example.test'), (:'u_k', 'k@example.test'),
  (:'u_m', 'm@example.test'), (:'u_n', 'n@example.test');
insert into sakaba.profiles (user_id, display_name) values
  (:'u_g', '五島役'), (:'u_a', 'Aさん'), (:'u_k', 'Kさん'), (:'u_m', 'Mさん'), (:'u_n', '新人N');
-- 今のGIA会員のプロフィール（移し替えの対象になる古い列。ここでは使われないことの確認にも使う）
update sakaba.profiles set bio = 'OLD-PROFILES-BIO', photo_url = 'https://example.test/g.jpg' where user_id = :'u_g';
insert into sakaba.invites (guild_id, code, created_by, max_uses) values
  (:'gia_id', 'GIA-USED-A', :'u_g', 1), (:'ken_id', 'KEN-USED-K', :'u_g', 1), (:'ken_id', 'KEN-USED-M', :'u_g', 1),
  (:'ken_id', 'KEN-JOIN-A', :'u_g', 1), (:'ken_id', 'KEN-JOIN-N', :'u_g', 1);
insert into sakaba.guild_members (guild_id, user_id, role, company_name, position, promises_agreed_at, joined_at, invite_id) values
  (:'gia_id', :'u_g', 'owner', 'GIA', 'ceo', now(), now() - interval '10 days', null),
  (:'gia_id', :'u_a', 'member', 'A社', 'ceo', now(), now(), (select id from sakaba.invites where code = 'GIA-USED-A')),
  (:'ken_id', :'u_g', 'owner', 'GIA', 'ceo', now(), now() - interval '5 days', null),
  (:'ken_id', :'u_k', 'member', 'K建設', 'ceo', now(), now(), (select id from sakaba.invites where code = 'KEN-USED-K')),
  (:'ken_id', :'u_m', 'master', 'M不動産', 'ceo', now(), now(), (select id from sakaba.invites where code = 'KEN-USED-M'));
update sakaba.invites set used_count = 1 where code in ('GIA-USED-A', 'KEN-USED-K', 'KEN-USED-M');

-- ---------- 判定の道具 ----------
create function pg_temp.hidden(p_name text, p_uid text, p_sql text) returns void language plpgsql as $f$
declare v_res text; v_state text;
begin
  perform set_config('test.uid', p_uid, true);
  set local role authenticated;
  begin
    execute 'select coalesce(x::text, ''null'') from (' || p_sql || ') t(x)' into v_res;
    reset role;
    insert into results values (p_name, coalesce(v_res, 'null') in ('null', '[]', '{}', '0', 'false'), '返った値=[' || left(coalesce(v_res, ''), 80) || ']');
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    reset role;
    insert into results values (p_name, v_state in ('42501', 'P0002', '22023', '28000'), 'エラー ' || v_state || ' ' || left(sqlerrm, 60));
  end;
end $f$;

-- 返った中身に、ある文字列が含まれる／含まれない
create function pg_temp.contains(p_name text, p_uid text, p_sql text, p_needle text, p_expect boolean) returns void language plpgsql as $f$
declare v_res text;
begin
  perform set_config('test.uid', p_uid, true);
  set local role authenticated;
  begin
    execute 'select coalesce(x::text, ''null'') from (' || p_sql || ') t(x)' into v_res;
    reset role;
    insert into results values (p_name, (position(p_needle in v_res) > 0) = p_expect, left(coalesce(v_res, ''), 140));
  exception when others then
    reset role;
    insert into results values (p_name, false, 'エラー ' || sqlstate || ' ' || left(sqlerrm, 80));
  end;
end $f$;

-- 成功すること（エラーなら FAIL）／エラーになること
create function pg_temp.works(p_name text, p_uid text, p_sql text) returns void language plpgsql as $f$
begin
  perform set_config('test.uid', p_uid, true);
  set local role authenticated;
  begin
    execute p_sql;
    reset role;
    insert into results values (p_name, true, '');
  exception when others then
    reset role;
    insert into results values (p_name, false, 'エラー ' || sqlstate || ' ' || left(sqlerrm, 80));
  end;
end $f$;
create function pg_temp.fails(p_name text, p_uid text, p_sql text) returns void language plpgsql as $f$
begin
  perform set_config('test.uid', p_uid, true);
  set local role authenticated;
  begin
    execute p_sql;
    reset role;
    insert into results values (p_name, false, '通ってしまった');
  exception when others then
    reset role;
    insert into results values (p_name, true, 'エラー ' || sqlstate);
  end;
end $f$;

-- 真偽の式が true であること（見る人の権限で評価）
create function pg_temp.istrue(p_name text, p_uid text, p_sql text) returns void language plpgsql as $f$
declare v_res boolean;
begin
  perform set_config('test.uid', p_uid, true);
  set local role authenticated;
  begin
    execute 'select (' || p_sql || ')' into v_res;
    reset role;
    insert into results values (p_name, coalesce(v_res, false), coalesce(v_res::text, 'null'));
  exception when others then
    reset role;
    insert into results values (p_name, false, 'エラー ' || sqlstate || ' ' || left(sqlerrm, 80));
  end;
end $f$;

-- ================= 0. 移し替え・入口の基本 =================
select (select count(*) from sakaba.guild_members) = (select count(*) from sakaba.guild_profiles) as ok \gset
insert into results values ('会員の数だけ店ごとのプロフィールの行がある（トリガー）', :'ok', '');

-- 両方の店にいる G は、2店とも同じ名前で始まる（まだ何も店ごとに直していない）。古い profiles.bio は店の行には写らない（空）
select (select count(*) from sakaba.guild_profiles where user_id = :'u_g' and display_name = '五島役') = 2
   and (select count(*) from sakaba.guild_profiles where user_id = :'u_g' and bio = '') = 2 as ok \gset
insert into results values ('新しく入った店の行は名前だけ入って、ほかは空', :'ok', '');

-- ================= 1. 店ごとに別々に直せる =================
select set_config('test.uid', :'u_g', true);
set local role authenticated;
-- GIA店
select public.sakaba_update_my_profile_simple('gia', '五島GIA名', 'https://example.test/gia.jpg', 'GIA-HEAD', 'GIA-JOB', 'web', 'GIA-REGION', 'GIA-BIO', 'GIA-VALUES', 'GIA-LOOKING',
  array['work','values','connect'], true, 'GIA社', 'ceo', true, 'GIA-SOLVE', true, '', '', '', 'GIA-INDUSTRY', array['GIA-KW']);
select public.sakaba_update_personal_profile('gia', 'GIA-HOMETOWN', 'GIA-HOBBY', 'GIA-LIFE', 5::smallint, 6::smallint, null);
select public.sakaba_update_profile_extras('gia', 'ごとうぎあ');
-- 建設店（同じ関数に、価値観なども渡す＝建設店では書かれないはず）
select public.sakaba_update_my_profile_simple('kensetsu-fudosan', '五島建設名', 'https://example.test/ken.jpg', 'KEN-HEAD', 'KEN-JOB', 'build', 'KEN-REGION', 'KEN-BIO', 'KEN-VALUES', 'KEN-LOOKING',
  array['work','values','connect'], true, '建設社', 'ceo', true, 'KEN-SOLVE', true, '', '', '', 'KEN-INDUSTRY-TAG', array['KEN-KW']);
select public.sakaba_update_personal_profile('kensetsu-fudosan', 'KEN-HOMETOWN', 'KEN-HOBBY', 'KEN-LIFE', 7::smallint, 8::smallint, null);
select public.sakaba_update_store_profile_extras('kensetsu-fudosan', 'roof', array['大阪府','兵庫県'], array['屋根','雨漏り'], true, false);
reset role;

select pg_temp.contains('建設店で直しても GIA店の自己紹介は変わらない', :'u_g', $q$select public.sakaba_get_my_profile('gia')$q$, 'GIA-BIO', true);
select pg_temp.contains('GIA店の自己紹介に建設店の文は混ざらない', :'u_g', $q$select public.sakaba_get_my_profile('gia')$q$, 'KEN-', false);
select pg_temp.contains('建設店の自己紹介に GIA店の文は混ざらない', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, 'GIA-', false);
select pg_temp.contains('建設店の自己紹介は建設店の文', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, 'KEN-BIO', true);
select pg_temp.contains('店ごとに名前も別', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, '五島建設名', true);
select pg_temp.contains('店ごとに名前も別（GIA）', :'u_g', $q$select public.sakaba_get_my_profile('gia')$q$, '五島GIA名', true);
-- 建設店で出さない項目（価値観・解決したいこと・地域・職種）は、関数が返さない
select pg_temp.contains('建設店：価値観は返さない（自分の画面）', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, 'KEN-VALUES', false);
select pg_temp.contains('建設店：解決したいことは返さない', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, 'KEN-SOLVE', false);
select pg_temp.contains('建設店：職種は返さない', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, 'KEN-JOB', false);
select pg_temp.contains('建設店：地域（対応エリアに置きかえ）は返さない', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, 'KEN-REGION', false);
select pg_temp.contains('建設店：対応エリア・得意な工事・免許の印は返す', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, '"has_construction_license": true', true);
select pg_temp.contains('建設店：得意な工事', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, '雨漏り', true);
select pg_temp.contains('建設店：業種は選んだキー', :'u_g', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, '"industry": "roof"', true);
select pg_temp.contains('GIA店：業種は書いた文字（タグ）', :'u_g', $q$select public.sakaba_get_my_profile('gia')$q$, '"industry": "GIA-INDUSTRY"', true);
select pg_temp.contains('GIA店：対応エリアなど建設店の項目は空', :'u_g', $q$select public.sakaba_get_my_profile('gia')$q$, '"work_types": []', true);
select pg_temp.contains('GIA店：価値観は返す', :'u_g', $q$select public.sakaba_get_my_profile('gia')$q$, 'GIA-VALUES', true);
select pg_temp.contains('出身・趣味は建設店でも店ごと', :'u_g', $q$select public.sakaba_get_profile_extras('kensetsu-fudosan')$q$, 'KEN-HOBBY', true);
select pg_temp.contains('出身・趣味は GIA店では GIA店の分', :'u_g', $q$select public.sakaba_get_profile_extras('gia')$q$, 'GIA-HOBBY', true);
select pg_temp.contains('GIA店の extras に建設店の趣味は出ない', :'u_g', $q$select public.sakaba_get_profile_extras('gia')$q$, 'KEN-HOBBY', false);
select pg_temp.contains('誕生日：GIA店は出す', :'u_g', $q$select public.sakaba_get_profile_extras('gia')$q$, '"birth_month": 5', true);
select pg_temp.contains('誕生日：建設店は返さない', :'u_g', $q$select public.sakaba_get_profile_extras('kensetsu-fudosan')$q$, '"birth_month": 7', false);
select pg_temp.fails('GIA店では建設店だけの項目を書けない', :'u_g', $q$select public.sakaba_update_store_profile_extras('gia', 'roof', null, null, null, null)$q$);
select pg_temp.fails('GIA店では伝えたいことの写真を付けられない', :'u_g', $q$select public.sakaba_set_work_photos('gia', array[]::text[])$q$);

-- 書いたあとも profiles（人ごとの古い列）には書かれていない
select (select bio from sakaba.profiles where user_id = :'u_g') = 'OLD-PROFILES-BIO'
   and (select display_name from sakaba.profiles where user_id = :'u_g') = '五島役' as ok \gset
insert into results values ('更新関数は profiles の中身の列に書かない', :'ok', '');

-- ================= 2. 名簿・一覧：店の中だけ・店の名前で =================
select pg_temp.contains('名簿(建設)：Gは建設店の名前で出る', :'u_k', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, '五島建設名', true);
select pg_temp.contains('名簿(建設)：GIA店の名前は出ない', :'u_k', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, '五島GIA名', false);
select pg_temp.contains('名簿(建設)：GIA店の自己紹介は出ない', :'u_k', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, 'GIA-', false);
select pg_temp.contains('名簿(建設)：価値観・職種は出ない', :'u_k', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, 'KEN-VALUES', false);
select pg_temp.contains('名簿(建設)：職種は出ない', :'u_k', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, 'KEN-JOB', false);
select pg_temp.contains('名簿(建設)：得意な工事は出る', :'u_k', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, '屋根', true);
select pg_temp.contains('名簿(GIA)：Gは GIA店の名前で出る', :'u_a', $q$select public.sakaba_list_members('gia')$q$, '五島GIA名', true);
select pg_temp.contains('名簿(GIA)：建設店の名前・文は出ない', :'u_a', $q$select public.sakaba_list_members('gia')$q$, 'KEN', false);
select pg_temp.contains('名簿(GIA)：建設店の得意な工事は出ない', :'u_a', $q$select public.sakaba_list_members('gia')$q$, '雨漏り', false);
select pg_temp.hidden('A(GIAだけ)は建設店の名簿を読めない', :'u_a', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$);
select pg_temp.hidden('A(GIAだけ)は建設店の自己紹介を読めない', :'u_a', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$);
select pg_temp.hidden('K(建設だけ)は GIA店の名簿を読めない', :'u_k', $q$select public.sakaba_list_members('gia')$q$);
select pg_temp.hidden('K(建設だけ)は GIA店の extras を読めない', :'u_k', $q$select public.sakaba_get_profile_extras('gia')$q$);
-- 表を直接読んでも、他人の行は見えない
select pg_temp.istrue('表を直接：Kは自分の行だけ読める', :'u_k', $q$(select count(*) from sakaba.guild_profiles) = 1 and (select count(*) from sakaba.guild_profiles where user_id = auth.uid()) = 1$q$);
select pg_temp.istrue('表を直接：Aは建設店の行を読めない', :'u_a', $q$(select count(*) from sakaba.guild_profiles where guild_id = '$q$ || :'ken_id' || $q$') = 0$q$);
select pg_temp.istrue('表を直接：Gは自分の2行を読める', :'u_g', $q$(select count(*) from sakaba.guild_profiles) = 2$q$);

-- ================= 3. 店の名前を引く入口（member_display） =================
select pg_temp.contains('member_display：店の中の人は店の名前', :'u_k', format($q$select display_name from sakaba.member_display(%L, %L)$q$, :'ken_id', :'u_g'), '五島建設名', true);
select pg_temp.hidden('member_display：その店にいない人は何も返さない', :'u_k', format($q$select display_name from sakaba.member_display(%L, %L)$q$, :'gia_id', :'u_k'));

-- 知らせ・招待など、名前だけ引く関数も店の名前で出る
select set_config('test.uid', :'u_g', true);
set local role authenticated;
select public.sakaba_rotate_my_share('gia') as share_gia \gset
select public.sakaba_rotate_my_share('kensetsu-fudosan') as share_ken \gset
select public.sakaba_update_my_share('gia', true, true, true, true, true, true);
select public.sakaba_update_my_share('kensetsu-fudosan', true, true, true, true, true, true);
reset role;
select pg_temp.contains('招待の確認：招いた人の名前は招いた店の名前（建設）', :'u_n', $q$select public.sakaba_check_invite('KEN-JOIN-A')$q$, '五島建設名', true);
select pg_temp.contains('招待の確認：招いた人の名前は招いた店の名前（GIAの名前は出ない）', :'u_n', $q$select public.sakaba_check_invite('KEN-JOIN-A')$q$, '五島GIA名', false);
select pg_temp.contains('招待の履歴(建設マスター)：建設店の名前', :'u_m', $q$select public.sakaba_list_master_invites('kensetsu-fudosan')$q$, '五島建設名', true);
select pg_temp.contains('招待の履歴(建設マスター)：GIA店の名前は出ない', :'u_m', $q$select public.sakaba_list_master_invites('kensetsu-fudosan')$q$, '五島GIA名', false);
select pg_temp.contains('招待のつながり(GIAのowner)：GIA店の名前', :'u_g', $q$select public.sakaba_list_invite_network('gia')$q$, '五島GIA名', true);
select pg_temp.contains('招待のつながり(GIAのowner)：建設店の名前は出ない', :'u_g', $q$select public.sakaba_list_invite_network('gia')$q$, '五島建設名', false);

-- ================= 4. 共有URL：店ごとに1本 =================
select pg_temp.contains('共有URL：GIA店のURLは GIA店の中身', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_gia'), 'GIA-BIO', true);
select pg_temp.contains('共有URL：GIA店のURLに建設店の中身は出ない', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_gia'), 'KEN-', false);
select pg_temp.contains('共有URL：建設店のURLは建設店の中身', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_ken'), 'KEN-BIO', true);
select pg_temp.contains('共有URL：建設店のURLに GIA店の中身は出ない', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_ken'), 'GIA-', false);
select pg_temp.contains('共有URL：建設店のURLに価値観は出ない', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_ken'), 'KEN-VALUES', false);
select pg_temp.contains('共有URL：建設店のURLに得意な工事が出る', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_ken'), '雨漏り', true);
select pg_temp.hidden('共有URL：GIA店のURLを建設店の指定で開いても出ない', :'u_n', format($q$select public.sakaba_get_shared_profile(%L, 'kensetsu-fudosan')$q$, :'share_gia'));
select pg_temp.contains('共有URL：店の指定が合っていれば出る', :'u_n', format($q$select public.sakaba_get_shared_profile(%L, 'gia')$q$, :'share_gia'), 'GIA-BIO', true);
-- 公開ページの見た目を決める店の名前（0136）
select pg_temp.contains('共有URL：GIA店のURLは店の名前 gia を返す', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_gia'), '"guild_slug": "gia"', true);
select pg_temp.contains('共有URL：建設店のURLは店の名前 kensetsu-fudosan を返す', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_ken'), '"guild_slug": "kensetsu-fudosan"', true);
select (:'share_gia' <> :'share_ken') as ok \gset
insert into results values ('共有URL：店ごとに別のtoken', :'ok', '');
-- 片方の店のURLを作り直しても、もう片方は変わらない
select set_config('test.uid', :'u_g', true);
set local role authenticated;
select public.sakaba_rotate_my_share('kensetsu-fudosan') as share_ken2 \gset
reset role;
select pg_temp.hidden('共有URL：作り直すと建設店の古いURLは使えない', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_ken'));
select pg_temp.contains('共有URL：建設店を作り直しても GIA店のURLは同じ', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_gia'), 'GIA-BIO', true);
select pg_temp.contains('共有URL：建設店の新しいURLは出る', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_ken2'), 'KEN-BIO', true);
-- 共有の設定（URLを止める）も店ごと
select set_config('test.uid', :'u_g', true);
set local role authenticated;
select public.sakaba_update_my_share('kensetsu-fudosan', false, null, null, null, null, null);
reset role;
select pg_temp.hidden('共有URL：建設店を止めても', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_ken2'));
select pg_temp.contains('共有URL：GIA店は止まらない', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_gia'), 'GIA-BIO', true);
select pg_temp.contains('メンバー間のURL情報：建設店の中ではその店のURL', :'u_k', format($q$select public.sakaba_get_member_link_info(%L, 'kensetsu-fudosan')$q$, :'u_g'), 'share_token', true);
select pg_temp.hidden('メンバー間のURL情報：K(建設だけ)は GIA店のURL情報を引けない', :'u_k', format($q$select public.sakaba_get_member_link_info(%L, 'gia')$q$, :'u_g'));

-- ================= 5. 連絡先：店ごと =================
select set_config('test.uid', :'u_g', true);
set local role authenticated;
select public.sakaba_save_my_contact_items('[{"kind":"email","value":"gia@example.test","visibility":"members"}]'::jsonb, 'gia');
select public.sakaba_save_my_contact_items('[{"kind":"line","value":"https://line.example.test/ken","visibility":"members"}]'::jsonb, 'kensetsu-fudosan');
reset role;
select pg_temp.contains('連絡先：建設店のメンバーは建設店の連絡先を見る', :'u_k', format($q$select public.sakaba_get_contact_items(array[%L]::uuid[], 'kensetsu-fudosan')$q$, :'u_g'), 'line.example.test/ken', true);
select pg_temp.contains('連絡先：建設店の画面に GIA店の連絡先は出ない', :'u_k', format($q$select public.sakaba_get_contact_items(array[%L]::uuid[], 'kensetsu-fudosan')$q$, :'u_g'), 'gia@example.test', false);
select pg_temp.contains('連絡先：GIA店のメンバーは GIA店の連絡先を見る', :'u_a', format($q$select public.sakaba_get_contact_items(array[%L]::uuid[], 'gia')$q$, :'u_g'), 'gia@example.test', true);
select pg_temp.contains('連絡先：GIA店の画面に建設店の連絡先は出ない', :'u_a', format($q$select public.sakaba_get_contact_items(array[%L]::uuid[], 'gia')$q$, :'u_g'), 'line.example.test', false);
select pg_temp.hidden('連絡先：A(GIAだけ)は建設店の連絡先を引けない', :'u_a', format($q$select public.sakaba_get_contact_items(array[%L]::uuid[], 'kensetsu-fudosan')$q$, :'u_g'));
select pg_temp.hidden('連絡先：K(建設だけ)は GIA店の連絡先を引けない', :'u_k', format($q$select public.sakaba_get_contact_items(array[%L]::uuid[], 'gia')$q$, :'u_g'));
select pg_temp.hidden('連絡先：A(GIAだけ)は建設店の連絡先を保存できない', :'u_a', $q$select public.sakaba_save_my_contact_items('[]'::jsonb, 'kensetsu-fudosan')$q$);
select pg_temp.contains('連絡先(自分の画面)：建設店の extras に GIA店のメールは出ない', :'u_k', $q$select public.sakaba_get_profile_extras('kensetsu-fudosan')$q$, 'gia@example.test', false);

-- ================= 6. 名刺：店ごと・置き場所に店 =================
-- 保存場所に画像を置く（実際はアプリがアップロードする。ここでは行だけ）
insert into storage.buckets (id, name, public) values ('sakaba-business-cards', 'sakaba-business-cards', false), ('sakaba-work-photos', 'sakaba-work-photos', false)
  on conflict (id) do nothing;
select format('%s/%s/front-1000.jpg', :'u_g', :'ken_id') as card_ken \gset
select format('%s/%s/front-1000.jpg', :'u_g', :'gia_id') as card_gia \gset
select format('%s/front-0999.jpg', :'u_g') as card_legacy \gset
insert into storage.objects (bucket_id, name, owner) values
  ('sakaba-business-cards', :'card_ken', :'u_g'), ('sakaba-business-cards', :'card_gia', :'u_g'), ('sakaba-business-cards', :'card_legacy', :'u_g');
select set_config('test.uid', :'u_g', true);
set local role authenticated;
select public.sakaba_set_business_card(:'card_ken', null, true, 'kensetsu-fudosan');
select public.sakaba_set_business_card(:'card_gia', null, true, 'gia');
reset role;
select pg_temp.istrue('名刺：建設店の会員Kは G の建設店の名刺を読める（保存場所の決まり）', :'u_k', format($q$sakaba.can_read_business_card(%L)$q$, :'card_ken'));
select pg_temp.istrue('名刺：K(建設だけ)は G の GIA店の名刺を読めない（同じ人でも店が違う）', :'u_k', format($q$not sakaba.can_read_business_card(%L)$q$, :'card_gia'));
select pg_temp.istrue('名刺：A(GIAだけ)は G の GIA店の名刺を読める', :'u_a', format($q$sakaba.can_read_business_card(%L)$q$, :'card_gia'));
select pg_temp.istrue('名刺：A(GIAだけ)は G の建設店の名刺を読めない', :'u_a', format($q$not sakaba.can_read_business_card(%L)$q$, :'card_ken'));
select pg_temp.istrue('名刺：持ち主は自分の名刺を読める', :'u_g', format($q$sakaba.can_read_business_card(%L) and sakaba.can_read_business_card(%L)$q$, :'card_ken', :'card_gia'));
select pg_temp.istrue('名刺：保存場所の表を直接読んでもAは建設店の名刺が見えない', :'u_a', format($q$(select count(*) from storage.objects where bucket_id = 'sakaba-business-cards' and name = %L) = 0$q$, :'card_ken'));
select pg_temp.istrue('名刺：保存場所の表を直接読んでKは建設店の名刺が見える', :'u_k', format($q$(select count(*) from storage.objects where bucket_id = 'sakaba-business-cards' and name = %L) = 1$q$, :'card_ken'));
select pg_temp.istrue('名刺：移す前の置き場所のままの画像は、載っていない店では読めない', :'u_k', format($q$not sakaba.can_read_business_card(%L)$q$, :'card_legacy'));
select pg_temp.contains('名刺の取得：建設店の画面では建設店の名刺', :'u_k', format($q$select public.sakaba_get_business_card(%L, 'kensetsu-fudosan')$q$, :'u_g'), :'card_ken', true);
select pg_temp.hidden('名刺の取得：K(建設だけ)は GIA店の名刺を引けない', :'u_k', format($q$select public.sakaba_get_business_card(%L, 'gia')$q$, :'u_g'));
select pg_temp.hidden('名刺の一覧：A(GIAだけ)は建設店の名刺一覧を引けない', :'u_a', $q$select public.sakaba_list_business_cards('kensetsu-fudosan')$q$);
select pg_temp.contains('名刺の一覧：GIA店の一覧に建設店の名刺は出ない', :'u_a', $q$select public.sakaba_list_business_cards('gia')$q$, :'card_ken', false);
select pg_temp.contains('名刺の一覧：建設店の一覧に GIA店の名刺は出ない', :'u_k', $q$select public.sakaba_list_business_cards('kensetsu-fudosan')$q$, :'card_gia', false);
-- 名刺を載せられるのは、その店の置き場所の画像だけ
select pg_temp.fails('名刺：他人の画像は載せられない', :'u_k', format($q$select public.sakaba_set_business_card(%L, null, true, 'kensetsu-fudosan')$q$, :'card_ken'));
select pg_temp.fails('名刺：別の店の置き場所の画像は載せられない', :'u_g', format($q$select public.sakaba_set_business_card(%L, null, true, 'kensetsu-fudosan')$q$, :'card_gia'));
-- 保存場所への書き込み：自分の店の置き場所だけ
select pg_temp.works('名刺の保存場所：自分が入っている店の置き場所には置ける', :'u_k', format($q$insert into storage.objects (bucket_id, name, owner) values ('sakaba-business-cards', %L, %L)$q$, format('%s/%s/front-2000.jpg', :'u_k', :'ken_id'), :'u_k'));
select pg_temp.fails('名刺の保存場所：入っていない店の置き場所には置けない', :'u_k', format($q$insert into storage.objects (bucket_id, name, owner) values ('sakaba-business-cards', %L, %L)$q$, format('%s/%s/front-2001.jpg', :'u_k', :'gia_id'), :'u_k'));
select pg_temp.fails('名刺の保存場所：店のない昔の置き場所には新しく置けない', :'u_k', format($q$insert into storage.objects (bucket_id, name, owner) values ('sakaba-business-cards', %L, %L)$q$, format('%s/front-2002.jpg', :'u_k'), :'u_k'));
select pg_temp.fails('名刺の保存場所：他人のフォルダには置けない', :'u_k', format($q$insert into storage.objects (bucket_id, name, owner) values ('sakaba-business-cards', %L, %L)$q$, format('%s/%s/front-2003.jpg', :'u_g', :'ken_id'), :'u_k'));
select pg_temp.works('伝えたいことの写真の保存場所：自分の店の置き場所には置ける', :'u_k', format($q$insert into storage.objects (bucket_id, name, owner) values ('sakaba-work-photos', %L, %L)$q$, format('%s/%s/new.jpg', :'u_k', :'ken_id'), :'u_k'));
select pg_temp.fails('伝えたいことの写真の保存場所：入っていない店には置けない', :'u_k', format($q$insert into storage.objects (bucket_id, name, owner) values ('sakaba-work-photos', %L, %L)$q$, format('%s/%s/new2.jpg', :'u_k', :'gia_id'), :'u_k'));

-- ================= 7. 伝えたいことの写真（建設店・任意3枚まで） =================
select format('%s/%s/p1.jpg', :'u_k', :'ken_id') as wp1 \gset
select format('%s/%s/p2.jpg', :'u_k', :'ken_id') as wp2 \gset
select format('%s/%s/p3.jpg', :'u_k', :'ken_id') as wp3 \gset
select format('%s/%s/p4.jpg', :'u_k', :'ken_id') as wp4 \gset
select format('%s/%s/pg.jpg', :'u_k', :'gia_id') as wp_gia \gset
insert into storage.objects (bucket_id, name, owner) values
  ('sakaba-work-photos', :'wp1', :'u_k'), ('sakaba-work-photos', :'wp2', :'u_k'), ('sakaba-work-photos', :'wp3', :'u_k'),
  ('sakaba-work-photos', :'wp4', :'u_k'), ('sakaba-work-photos', :'wp_gia', :'u_k');
select pg_temp.works('写真：3枚までは付けられる', :'u_k', format($q$select public.sakaba_set_work_photos('kensetsu-fudosan', array[%L,%L,%L])$q$, :'wp1', :'wp2', :'wp3'));
select pg_temp.fails('写真：4枚は付けられない', :'u_k', format($q$select public.sakaba_set_work_photos('kensetsu-fudosan', array[%L,%L,%L,%L])$q$, :'wp1', :'wp2', :'wp3', :'wp4'));
select pg_temp.fails('写真：他の店の置き場所の写真は付けられない', :'u_k', format($q$select public.sakaba_set_work_photos('kensetsu-fudosan', array[%L])$q$, :'wp_gia'));
select pg_temp.fails('写真：他人の写真は付けられない', :'u_g', format($q$select public.sakaba_set_work_photos('kensetsu-fudosan', array[%L])$q$, :'wp1'));
select pg_temp.istrue('写真：同じ店のメンバー(G)は読める', :'u_g', format($q$sakaba.can_read_work_photo(%L)$q$, :'wp1'));
select pg_temp.istrue('写真：A(GIAだけ)は読めない', :'u_a', format($q$not sakaba.can_read_work_photo(%L)$q$, :'wp1'));
select pg_temp.istrue('写真：保存場所の表を直接読んでもAには見えない', :'u_a', format($q$(select count(*) from storage.objects where bucket_id = 'sakaba-work-photos' and name = %L) = 0$q$, :'wp1'));
select pg_temp.istrue('写真：保存場所の表を直接読むとMには見える', :'u_m', format($q$(select count(*) from storage.objects where bucket_id = 'sakaba-work-photos' and name = %L) = 1$q$, :'wp1'));
select pg_temp.contains('写真：名簿に出る(建設)', :'u_m', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, :'wp1', true);
select pg_temp.contains('写真：自分の画面に出る', :'u_k', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, :'wp2', true);
select pg_temp.istrue('写真：未登録の画像(p4)は、同じ店の会員にも読めない', :'u_m', format($q$not sakaba.can_read_work_photo(%L)$q$, :'wp4'));
select pg_temp.works('写真：付け替え・外せる', :'u_k', format($q$select public.sakaba_set_work_photos('kensetsu-fudosan', array[%L])$q$, :'wp3'));
select (select count(*) from sakaba.guild_profile_photos where user_id = :'u_k') = 1 as ok \gset
insert into results values ('写真：外した分は表から消える', :'ok', '');

-- ================= 8. 管理者の下書き：その店の行だけ変わる =================
select set_config('test.uid', :'u_m', true);
set local role authenticated;
select public.sakaba_save_member_profile_draft('kensetsu-fudosan', :'u_k'::uuid, 'DRAFT-HEAD', 'ignored-industry', 'DRAFT-REGION', 'DRAFT-JOB', 'DRAFT-BIO', 'DRAFT-VALUES', 'DRAFT-LOOKING');
reset role;
select id as draft_id from sakaba.profile_drafts where member_user_id = :'u_k' \gset
select set_config('test.uid', :'u_k', true);
set local role authenticated;
select public.sakaba_decide_my_profile_draft(:'draft_id', 'apply') as decided \gset
reset role;
select pg_temp.contains('下書き：載せた項目が建設店の行に入る(headline)', :'u_k', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, 'DRAFT-HEAD', true);
select pg_temp.contains('下書き：載せた項目が建設店の行に入る(bio)', :'u_k', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, 'DRAFT-BIO', true);
select pg_temp.contains('下書き：建設店で出さない項目(価値観)は載らない', :'u_k', $q$select public.sakaba_get_my_profile('kensetsu-fudosan')$q$, 'DRAFT-VALUES', false);
select (select count(*) from sakaba.guild_profiles where user_id = :'u_k' and values_text <> '' and region <> '' and job <> '') = 0 as ok \gset
insert into results values ('下書き：建設店で出さない列(価値観・地域・職種)は行にも入らない', :'ok', '');
-- G の下書き：両店にいる人は、下書きを出した店の行だけ変わる
select set_config('test.uid', :'u_m', true);
set local role authenticated;
select public.sakaba_save_member_profile_draft('kensetsu-fudosan', :'u_g'::uuid, '', '', '', '', 'DRAFT-G-BIO-IGNORED', '', '');
reset role;
select id as draft_g from sakaba.profile_drafts where member_user_id = :'u_g' \gset
select (select bio from sakaba.guild_profiles where guild_id = :'ken_id' and user_id = :'u_g') as ken_bio_before \gset
select (select bio from sakaba.guild_profiles where guild_id = :'gia_id' and user_id = :'u_g') as gia_bio_before \gset
select set_config('test.uid', :'u_g', true);
set local role authenticated;
select public.sakaba_decide_my_profile_draft(:'draft_g', 'apply');
reset role;
select (select bio from sakaba.guild_profiles where guild_id = :'gia_id' and user_id = :'u_g') = :'gia_bio_before' as ok \gset
insert into results values ('下書き：建設店の下書きを載せても GIA店の行は変わらない', :'ok', '');
select (select bio from sakaba.guild_profiles where guild_id = :'ken_id' and user_id = :'u_g') = :'ken_bio_before' as ok \gset
insert into results values ('下書き：既に書いてある項目は上書きしない(建設店のbio)', :'ok', '');

-- ================= 9. 新しい店に入ったとき =================
select set_config('test.uid', :'u_a', true);
set local role authenticated;
select public.sakaba_update_my_profile_simple('gia', 'A別名', 'https://example.test/a.jpg', 'A-HEAD', '', 'web', '', 'A-BIO', '', '', array['work'], true, 'A社', 'ceo', true, '', true, '', '', '', '', '{}');
select public.sakaba_update_profile_extras('gia', 'えーかな');
select public.sakaba_join_guild('KEN-JOIN-A', '建設で入力した別の名前', 'A建設社', 'ceo', true, '', true, '', '') as a_joined \gset
reset role;
select (select display_name from sakaba.guild_profiles where guild_id = :'ken_id' and user_id = :'u_a') = 'A別名'
   and (select name_kana from sakaba.guild_profiles where guild_id = :'ken_id' and user_id = :'u_a') = 'えーかな'
   and (select photo_url from sakaba.guild_profiles where guild_id = :'ken_id' and user_id = :'u_a') = 'https://example.test/a.jpg'
   and (select bio from sakaba.guild_profiles where guild_id = :'ken_id' and user_id = :'u_a') = ''
   and (select headline from sakaba.guild_profiles where guild_id = :'ken_id' and user_id = :'u_a') = '' as ok \gset
insert into results values ('2つ目の店に入る：名前・ふりがな・写真だけ前の店から写る（ほかは空）', :'ok', '');
select (select display_name from sakaba.profiles where user_id = :'u_a') = 'Aさん' as ok \gset
insert into results values ('2つ目の店に入っても profiles の名前は書き換えない', :'ok', '');
select pg_temp.contains('新しい店：Aは建設店の名簿に、写した名前で出る', :'u_k', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, 'A別名', true);
select pg_temp.contains('新しい店：Aの GIA店の自己紹介は建設店の名簿に出ない', :'u_k', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, 'A-BIO', false);
-- N は入会画面で入れた名前が使われる
select set_config('test.uid', :'u_n', true);
set local role authenticated;
select public.sakaba_join_guild('KEN-JOIN-N', 'N入会名', 'N社', 'ceo', true, '', true, '', '') as n_joined \gset
reset role;
select (select display_name from sakaba.guild_profiles where guild_id = :'ken_id' and user_id = :'u_n') = 'N入会名' as ok \gset
insert into results values ('どの店にもいなかった人は、入会画面で入れた名前が店の行の名前になる', :'ok', '');

-- ================= 10. 画面側の名前の元：古い列は読まれていない =================
-- profiles の古い名前を壊しても、画面に出る名前は店の行のまま
update sakaba.profiles set display_name = 'BROKEN-OLD-NAME', bio = 'BROKEN-OLD-BIO', photo_url = 'https://broken.example.test/x.jpg';
select pg_temp.contains('古い profiles の名前を変えても名簿の名前は変わらない(GIA)', :'u_a', $q$select public.sakaba_list_members('gia')$q$, 'BROKEN', false);
select pg_temp.contains('古い profiles の名前を変えても名簿の名前は変わらない(建設)', :'u_k', $q$select public.sakaba_list_members('kensetsu-fudosan')$q$, 'BROKEN', false);
select pg_temp.contains('古い profiles を変えても共有URLの中身は変わらない', :'u_n', format($q$select public.sakaba_get_shared_profile(%L)$q$, :'share_gia'), 'BROKEN', false);
select pg_temp.contains('古い profiles を変えても自分の画面は変わらない', :'u_g', $q$select public.sakaba_get_my_profile('gia')$q$, 'BROKEN', false);
select pg_temp.contains('古い profiles を変えても招待の確認の名前は変わらない', :'u_n', $q$select public.sakaba_check_invite('KEN-USED-K')$q$, 'BROKEN', false);

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
