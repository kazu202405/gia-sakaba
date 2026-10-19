-- 0130 ステータスの下書きを、手元のPostgreSQLで実測する（本番には流さない）。
--
-- 使い方：Supabase の入口（ロール anon/authenticated、auth.users、auth.uid()、public.applicants）を用意した
--   空のデータベースに supabase/migrations/0077〜0130 を順に流したうえで、このファイルを psql で流す。
--   auth.uid() は current_setting('test.uid') を返す前提（memory: reference_supabase_local_replica_testing）。
-- 作ったデータは最後に ROLLBACK で消える。1つでも期待と違えば例外で止まる。

\set ON_ERROR_STOP on
begin;

create function pg_temp.check_that(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end $$;
grant execute on function pg_temp.check_that(boolean, text) to public;

-- 実行すると必ず失敗するはずの文。失敗しなければ FAIL
create function pg_temp.must_fail(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'PASS: % (%)', p_label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % が成功してしまった', p_label;
end $$;
grant execute on function pg_temp.must_fail(text, text) to public;

-- 人（b1＝マスター / b2・b3＝会員 / b4＝会員でない人 / b5＝これから招待する人）
insert into auth.users (id) values
  ('00000000-0000-4000-8000-0000000000b1'), ('00000000-0000-4000-8000-0000000000b2'),
  ('00000000-0000-4000-8000-0000000000b3'), ('00000000-0000-4000-8000-0000000000b4'),
  ('00000000-0000-4000-8000-0000000000b5');
insert into sakaba.profiles (user_id, display_name) values
  ('00000000-0000-4000-8000-0000000000b1', 'マスター'), ('00000000-0000-4000-8000-0000000000b2', '会員A'),
  ('00000000-0000-4000-8000-0000000000b3', '会員B'), ('00000000-0000-4000-8000-0000000000b4', 'ゲストG');
insert into sakaba.invites (id, guild_id, code, created_by, max_uses) values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001', 'seed-code', '00000000-0000-4000-8000-0000000000a1', 10);
insert into sakaba.guild_members (guild_id, user_id, role, company_name, position, promises_agreed_at, invite_id) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', 'master', 'GIA', 'ceo', now(), '00000000-0000-4000-8000-0000000000c1'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b2', 'member', '会社A', 'ceo', now(), '00000000-0000-4000-8000-0000000000c1'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b3', 'member', '会社B', 'ceo', now(), '00000000-0000-4000-8000-0000000000c1');
-- 会員Aは「ひとこと」だけ、すでに自分で書いている
update sakaba.profiles set headline = '自分で書いたひとこと' where user_id = '00000000-0000-4000-8000-0000000000b2';

-- ===== マスター：会員Aあての下書きを書く =====
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b1', true);
select public.sakaba_save_member_profile_draft('gia', '00000000-0000-4000-8000-0000000000b2',
  p_headline => '下書きのひとこと', p_industry => '飲食', p_region => '大阪', p_job => '居酒屋オーナー',
  p_bio => '下書きの仕事内容', p_values_text => '下書きのおもい', p_looking_for => '下書きのさがしもの');
reset role;
select pg_temp.check_that((select count(*) = 1 from sakaba.notifications
  where user_id = '00000000-0000-4000-8000-0000000000b2' and kind = 'profile_draft_waiting'), '本人あてに「下書きが届きました」のおしらせが1件できる');

-- 書き直しても、待っている下書きは1つ・未読のおしらせは重ならない
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b1', true);
select public.sakaba_save_member_profile_draft('gia', '00000000-0000-4000-8000-0000000000b2',
  p_headline => '下書きのひとこと', p_industry => '飲食', p_region => '大阪', p_job => '居酒屋オーナー',
  p_bio => '書き直した仕事内容', p_values_text => '下書きのおもい', p_looking_for => '下書きのさがしもの');
reset role;
select pg_temp.check_that((select count(*) = 1 from sakaba.profile_drafts where member_user_id = '00000000-0000-4000-8000-0000000000b2' and state = 'waiting'), '待っている下書きは1つだけ（書き直しは上書き）');
select pg_temp.check_that((select bio = '書き直した仕事内容' from sakaba.profile_drafts where member_user_id = '00000000-0000-4000-8000-0000000000b2'), '書き直した内容になっている');
select pg_temp.check_that((select count(*) = 1 from sakaba.notifications where user_id = '00000000-0000-4000-8000-0000000000b2' and kind = 'profile_draft_waiting'), '未読のうちに書き直しても おしらせは重ならない');

create temp table did as select id from sakaba.profile_drafts where member_user_id = '00000000-0000-4000-8000-0000000000b2';
grant select on did to authenticated;

-- ===== 承認前は、本人と書いたマスター以外には読めない =====
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b3', true);  -- ほかの会員B
select pg_temp.must_fail($q$select * from sakaba.profile_drafts$q$, '会員Bは下書きの表を直接読めない');
select pg_temp.check_that(public.sakaba_get_my_profile_draft('gia') is null, '会員Bの「届いた下書き」は空（Aの下書きは見えない）');
select pg_temp.must_fail($q$select public.sakaba_get_member_profile_draft('gia', '00000000-0000-4000-8000-0000000000b2')$q$, '会員Bは書く側の読み出しを呼べない');
select pg_temp.must_fail($q$select public.sakaba_list_invite_profile_drafts('gia')$q$, '会員Bは入会前の下書き一覧を呼べない');
select pg_temp.must_fail($q$select public.sakaba_save_member_profile_draft('gia', '00000000-0000-4000-8000-0000000000b2', p_headline => 'のっとり')$q$, '会員Bは下書きを書けない');
-- 名鑑・メンバー画面（sakaba_list_members）に下書きの中身が出ない
select pg_temp.check_that(position('下書きの' in public.sakaba_list_members('gia')::text) = 0, '名鑑（メンバー一覧）に下書きの中身が出ない');
-- 会員でない人・ログインしていない人
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b4', true);
select pg_temp.must_fail($q$select public.sakaba_get_my_profile_draft('gia')$q$, '会員でない人は「届いた下書き」を読めない');
select pg_temp.must_fail($q$select * from sakaba.profile_drafts$q$, '会員でない人は表を直接読めない');
reset role;
set local role anon;
select set_config('test.uid', '', true);
select pg_temp.must_fail($q$select public.sakaba_get_my_profile_draft('gia')$q$, 'ログインしていない人は読めない');
select pg_temp.must_fail($q$select * from sakaba.profile_drafts$q$, 'ログインしていない人は表を直接読めない');
reset role;

-- ===== 本人以外は「載せる」を呼べない（マスターでも） =====
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b1', true);
select pg_temp.must_fail(format($q$select public.sakaba_decide_my_profile_draft(%L, 'apply')$q$, (select id from did)), 'マスターが「載せる」を呼ぶと失敗する');
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b3', true);
select pg_temp.must_fail(format($q$select public.sakaba_decide_my_profile_draft(%L, 'apply')$q$, (select id from did)), '会員Bが「載せる」を呼ぶと失敗する');
select pg_temp.must_fail(format($q$select public.sakaba_decide_my_profile_draft(%L, 'decline')$q$, (select id from did)), '会員Bが「いらない」を呼んでも失敗する');
reset role;
select pg_temp.check_that((select state = 'waiting' and headline = '下書きのひとこと' from sakaba.profile_drafts where member_user_id = '00000000-0000-4000-8000-0000000000b2'), '失敗したあとも下書きは待ったまま・中身も無事');
select pg_temp.check_that((select headline = '自分で書いたひとこと' and bio = '' from sakaba.profiles where user_id = '00000000-0000-4000-8000-0000000000b2'), 'プロフィールは変わっていない');

-- ===== 書く側の読み出し：書いたマスターだけ =====
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b1', true);
select pg_temp.check_that((public.sakaba_get_member_profile_draft('gia', '00000000-0000-4000-8000-0000000000b2')->>'state') = 'waiting', '書いたマスターには待っている下書きが見える');

-- ===== 本人Aが「このまま載せる」：書いてある「ひとこと」は上書きされない =====
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b2', true);
select pg_temp.check_that((public.sakaba_get_my_profile_draft('gia')->'filled') ? 'headline', '本人には「ひとことは すでに書いてある」と分かる');
select pg_temp.check_that((public.sakaba_decide_my_profile_draft((public.sakaba_get_my_profile_draft('gia')->>'id')::uuid, 'apply')->'skipped') ? 'headline', '「載せる」の結果で ひとことは入れなかったと返る');
reset role;
select pg_temp.check_that((select headline = '自分で書いたひとこと' from sakaba.profiles where user_id = '00000000-0000-4000-8000-0000000000b2'), '本人が書いたひとことは上書きされない');
select pg_temp.check_that((select job = '居酒屋オーナー' and region = '大阪' and bio = '書き直した仕事内容' and values_text = '下書きのおもい' and looking_for = '下書きのさがしもの' from sakaba.profiles where user_id = '00000000-0000-4000-8000-0000000000b2'), '空いていた項目には下書きが入る');
select pg_temp.check_that((select count(*) = 1 from sakaba.profile_tags pt join sakaba.tags t on t.id = pt.tag_id where pt.user_id = '00000000-0000-4000-8000-0000000000b2' and t.kind = 'industry' and t.name = '飲食'), '業種のタグも入る');
select pg_temp.check_that((select state = 'applied' and decided_at is not null and bio = '' from sakaba.profile_drafts where member_user_id = '00000000-0000-4000-8000-0000000000b2'), '返事のあと、下書きは「載せた」になり中身は消える');
select pg_temp.check_that((select count(*) = 1 from sakaba.notifications where user_id = '00000000-0000-4000-8000-0000000000b1' and kind = 'profile_draft_applied' and actor_id = '00000000-0000-4000-8000-0000000000b2'), '書いたマスターに「載せた」が届く');
-- 2度目は失敗（二重押し）
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b2', true);
select pg_temp.must_fail(format($q$select public.sakaba_decide_my_profile_draft(%L, 'apply')$q$, (select id from did)), '返事が済んだ下書きに もう一度返事はできない');
select pg_temp.check_that(public.sakaba_get_my_profile_draft('gia') is null, '返事のあとは「届いた下書き」が空');
reset role;

-- ===== 「いらない」：何も載らない =====
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b1', true);
select public.sakaba_save_member_profile_draft('gia', '00000000-0000-4000-8000-0000000000b3', p_industry => '下書きの業種', p_job => '下書きの職業');
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b3', true);
select public.sakaba_decide_my_profile_draft((public.sakaba_get_my_profile_draft('gia')->>'id')::uuid, 'decline');
reset role;
select pg_temp.check_that((select job = '' from sakaba.profiles where user_id = '00000000-0000-4000-8000-0000000000b3'), '「いらない」を選ぶと、何も載らない');
select pg_temp.check_that((select count(*) = 1 from sakaba.notifications where user_id = '00000000-0000-4000-8000-0000000000b1' and kind = 'profile_draft_declined'), '書いたマスターに「いらない」が届く');

-- ===== A：これから招待する人 =====
create temp table made(id uuid, code text);
grant all on made to authenticated, anon;
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b1', true);
insert into made select (r->>'id')::uuid, r->>'code' from (select public.sakaba_create_prepared_invite('gia', '新規さん', '新規社', 'ceo', '') as r) s;
select public.sakaba_save_invite_profile_draft((select id from made), p_job => '招待時の職業', p_bio => '招待時の仕事内容');
select pg_temp.check_that(jsonb_array_length(public.sakaba_list_invite_profile_drafts('gia')) = 1, 'マスターは自分が書いた入会前の下書きを一覧で読める');
reset role;
-- 入会前は、招待リンクを知っていても下書きは読めない（招待コードの読み出しに出ない）
set local role anon;
select pg_temp.check_that(position('招待時' in coalesce(public.sakaba_get_prepared_invite((select code from made))::text, '')) = 0, '入会前は招待リンクを知っていても下書きは見えない');
reset role;
-- 新規さんが入会する（トリガーで本人にひもづき、おしらせが届く）
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b5', true);
select public.sakaba_join_prepared_guild((select code from made), '新規さん', '新規社', 'ceo', true, '', true, false);
select pg_temp.check_that((public.sakaba_get_my_profile_draft('gia')->'fields'->>'job') = '招待時の職業', '入会すると、招待時の下書きが本人に届く');
reset role;
select pg_temp.check_that((select count(*) = 1 from sakaba.notifications where user_id = '00000000-0000-4000-8000-0000000000b5' and kind = 'profile_draft_waiting'), '入会した本人に「下書きが届きました」のおしらせが出る');
select pg_temp.check_that(not exists (select 1 from sakaba.profiles where user_id = '00000000-0000-4000-8000-0000000000b5' and (job <> '' or bio <> '')), '承認するまでは、プロフィールに載らない');
-- 他の会員には見えない
set local role authenticated;
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b3', true);
select pg_temp.check_that(public.sakaba_get_my_profile_draft('gia') is null, '会員Bには新規さんの下書きが見えない');
-- 「なおしてから載せる」＝ edited：DBには中身を書かず済みにするだけ（本人が編集画面で保存した前提）
select set_config('test.uid', '00000000-0000-4000-8000-0000000000b5', true);
select public.sakaba_decide_my_profile_draft((public.sakaba_get_my_profile_draft('gia')->>'id')::uuid, 'edited');
reset role;
select pg_temp.check_that((select job = '' from sakaba.profiles where user_id = '00000000-0000-4000-8000-0000000000b5'), 'edited はDBに中身を書かない（本人の保存だけが書く）');
select pg_temp.check_that((select state = 'applied' from sakaba.profile_drafts where invite_id = (select id from made)), 'edited で済みになる');

rollback;
\echo 全部 PASS
