-- 2店目の owner 付与SQL（supabase/manual/0132_grant_kensetsu_fudosan_owner.sql）の確かめ。手元の複製DBで流す。本番では流さない。
--   psql -h localhost -p 55432 -U postgres -d <複製DB> -v ON_ERROR_STOP=1 -f kensetsu_owner_grant.sql
-- 実行はファイルのあるフォルダから（\ir が相対で読む）。BEGIN〜ROLLBACK で何も残さない。
begin;
create temp table results (name text, ok boolean, detail text);

select id as gia_id from sakaba.guilds where slug = 'gia' \gset
select id as ken_id from sakaba.guilds where slug = 'kensetsu-fudosan' \gset

-- 前提：GIAの酒場の owner が1人（本番の五島さん役）
insert into auth.users (id, email) values ('11111111-1111-4111-8111-111111111111', 'g@example.test');
insert into sakaba.profiles (user_id, display_name) values ('11111111-1111-4111-8111-111111111111', '五島役');
insert into sakaba.guild_members (guild_id, user_id, role, company_name, position, promises_agreed_at, billing_status)
values (:'gia_id', '11111111-1111-4111-8111-111111111111', 'owner', 'GIA', 'ceo', now(), 'exempt');

-- 1回目
\ir ../manual/0132_grant_kensetsu_fudosan_owner.sql
select count(*) = 1 and bool_and(role = 'owner' and billing_status = 'exempt' and user_id = '11111111-1111-4111-8111-111111111111') as ok
from sakaba.guild_members where guild_id = :'ken_id' \gset
insert into results values ('1回目：K店に owner が1人（GIAの owner と同じ人・課金は免除）', :'ok', '');

-- 2回目（何度流しても同じ）
\ir ../manual/0132_grant_kensetsu_fudosan_owner.sql
select count(*) = 1 as ok from sakaba.guild_members where guild_id = :'ken_id' \gset
insert into results values ('2回目：増えない', :'ok', '');

-- GIAの酒場の側は変わっていない
select count(*) = 1 as ok from sakaba.guild_members where guild_id = :'gia_id' and role = 'owner' \gset
insert into results values ('GIAの酒場の owner は変わらず1人', :'ok', '');

-- owner が2人いるときは止まる（別の人を owner にしない）
delete from sakaba.guild_members where guild_id = :'ken_id';
insert into auth.users (id, email) values ('66666666-6666-4666-8666-666666666666', 'x@example.test');
insert into sakaba.profiles (user_id, display_name) values ('66666666-6666-4666-8666-666666666666', '二人目');
insert into sakaba.guild_members (guild_id, user_id, role, company_name, position, promises_agreed_at)
values (:'gia_id', '66666666-6666-4666-8666-666666666666', 'owner', 'X', 'ceo', now());
savepoint two_owners;
\set ON_ERROR_STOP 0
\ir ../manual/0132_grant_kensetsu_fudosan_owner.sql
\set ON_ERROR_STOP 1
rollback to savepoint two_owners;
select count(*) = 0 as ok from sakaba.guild_members where guild_id = :'ken_id' \gset
insert into results values ('GIAの owner が2人のときは、何も付与せず止まる', :'ok', '');

select case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by ok, name;
do $$ begin if exists (select 1 from results where not ok) then raise exception 'FAIL があります'; end if; end $$;
rollback;
