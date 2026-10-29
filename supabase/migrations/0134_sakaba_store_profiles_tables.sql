-- プロフィールを店ごとに分ける（1/2：表と移し替え）（2026-10-29）。
-- 仕様：contexts/projects/gia/sakaba_store_profile_spec.md
--
-- ・店×人で1行の新しい表 sakaba.guild_profiles を作り、今の sakaba.profiles の中身の列を写す
-- ・連絡先・タグ・共有URLは guild_id を足して店ごとの行にする（その人が入っている店の数だけ写す）
-- ・名刺は「GIAの店（入っていなければ最初に入った店）」の行にだけ移す。画像の置き場所は動かさない
--   （読めるかは、パスではなく guild_profiles の行に載っているかで決める。0135）
-- ・どの店でどの項目を出すかは guilds.profile_fields の1か所（コード側 lib/guild/stores.ts と stores.test.ts が照合する）
-- ・古い列（profiles の中身）はここでは消さない。数日問題がなければ別の migration で消す
-- ・移したあと、GIAの店の全員の中身が移す前と一致しなければ、全体を巻き戻して止める
-- ・関数の切り替えは 0135。0134 と 0135 は続けて同じ日に当てる（間は古い関数が動かない）

begin;

-- ================= 1. 店ごとの「出す項目」 =================
alter table sakaba.guilds add column profile_fields text[] not null default '{}';

-- 項目の名前（lib/guild/store-profile.ts の PROFILE_FIELDS と同じ。stores.test.ts が照合する）
-- 名前・ふりがな・顔写真・連絡先・名刺はどの店でも出すので、ここには入れない
update sakaba.guilds set profile_fields = array[
  'headline', 'job', 'industry', 'region', 'bio', 'can_help_with', 'strengths', 'values_text', 'vision',
  'social_issue', 'looking_for', 'want_to_meet', 'want_to_solve', 'hometown', 'hobbies', 'life_story', 'birthday'
] where slug = 'gia';
update sakaba.guilds set profile_fields = array[
  'headline', 'industry_choice', 'work_areas', 'work_types', 'licenses', 'bio', 'work_photos', 'looking_for',
  'hometown', 'hobbies', 'life_story'
] where slug = 'kensetsu-fudosan';

create function sakaba.guild_has_field(p_guild_id uuid, p_field text)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select coalesce((select p_field = any (g.profile_fields) from sakaba.guilds g where g.id = p_guild_id), false);
$$;
revoke all on function sakaba.guild_has_field(uuid, text) from public, anon;
grant execute on function sakaba.guild_has_field(uuid, text) to authenticated;

-- ================= 2. 店ごとのプロフィール =================
create table sakaba.guild_profiles (
  guild_id uuid not null,
  user_id uuid not null,
  display_name varchar(30) not null,
  photo_url text,
  headline text not null default '',
  job text not null default '',
  job_icon text not null default 'other',
  region text not null default '',
  bio text not null default '',
  can_help_with text not null default '',
  strengths varchar(200) not null default '',
  values_text text not null default '',
  vision text not null default '',
  social_issue text not null default '',
  looking_for text not null default '',
  want_to_meet text not null default '',
  name_kana varchar(60) not null default '',
  hometown varchar(80) not null default '',
  hobbies varchar(300) not null default '',
  life_story varchar(1200) not null default '',
  birth_month smallint,
  birth_day smallint,
  birth_year smallint,
  business_card_front text,
  business_card_back text,
  business_card_agreed_at timestamptz,
  -- 建設・不動産の店で出す項目（どの店の行にも持つが、使うのはその店だけ。空でよい）
  industry text not null default '',
  work_areas text[] not null default '{}',
  work_types text[] not null default '{}',
  has_construction_license boolean not null default false,
  has_real_estate_license boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guild_profiles_pkey primary key (guild_id, user_id),
  constraint guild_profiles_member_fkey foreign key (guild_id, user_id)
    references sakaba.guild_members (guild_id, user_id) on delete cascade,
  constraint guild_profiles_display_name_not_blank check (btrim(display_name::text) <> ''),
  constraint guild_profiles_job_icon_check check (job_icon = any (array['web', 'tax', 'build', 'food', 'marketing', 'realestate', 'legal',
    'design', 'teach', 'health', 'owner', 'retail', 'maker', 'beauty', 'finance', 'logistics', 'care', 'hr', 'farm', 'other'])),
  constraint guild_profiles_birthday_parts_check check (
    case
      when birth_month is null then birth_day is null and birth_year is null
      when birth_day is null then false
      when birth_month < 1 or birth_month > 12 then false
      when birth_day < 1 or birth_day > 31 then false
      when birth_year is not null and (birth_year < 1900 or birth_year > 2100) then false
      else birth_day::numeric <= extract(day from (make_date(coalesce(birth_year::integer, 2000), birth_month::integer, 1) + interval '1 month - 1 day'))
    end),
  constraint guild_profiles_industry_length check (char_length(industry) <= 40),
  constraint guild_profiles_work_areas_size check (cardinality(work_areas) <= 47),
  constraint guild_profiles_work_types_size check (cardinality(work_types) <= 30)
);
create index guild_profiles_user_idx on sakaba.guild_profiles (user_id);

create trigger guild_profiles_set_updated_at before update on sakaba.guild_profiles
  for each row execute function sakaba.set_updated_at();

alter table sakaba.guild_profiles enable row level security;
-- 自分の行だけ読める。ほかの人のプロフィールは関数（持ち主の権限）を通す。書き込みも関数だけ
create policy guild_profiles_self_read on sakaba.guild_profiles for select to authenticated
  using (user_id = auth.uid());
grant select on sakaba.guild_profiles to authenticated;

-- 伝えたいことに添える写真（任意・1人1店3枚まで）
create table sakaba.guild_profile_photos (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null,
  user_id uuid not null,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint guild_profile_photos_profile_fkey foreign key (guild_id, user_id)
    references sakaba.guild_profiles (guild_id, user_id) on delete cascade,
  constraint guild_profile_photos_path_unique unique (storage_path)
);
create index guild_profile_photos_owner_idx on sakaba.guild_profile_photos (guild_id, user_id, sort_order);
alter table sakaba.guild_profile_photos enable row level security;
create policy guild_profile_photos_self_read on sakaba.guild_profile_photos for select to authenticated
  using (user_id = auth.uid());
grant select on sakaba.guild_profile_photos to authenticated;

create function sakaba.limit_profile_photos() returns trigger language plpgsql
set search_path = pg_catalog, sakaba as $$
begin
  if (select count(*) from sakaba.guild_profile_photos p
      where p.guild_id = new.guild_id and p.user_id = new.user_id and p.id <> new.id) >= 3 then
    raise exception 'at most 3 photos per profile' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger guild_profile_photos_limit before insert on sakaba.guild_profile_photos
  for each row execute function sakaba.limit_profile_photos();

-- 伝えたいことの写真の置き場所（非公開）。「<本人のid>/<店のid>/<ファイル名>.<jpg|png|webp>」
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sakaba-work-photos', 'sakaba-work-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create function sakaba.work_photo_owner(p_name text)
returns uuid language sql immutable set search_path = pg_catalog as $$
  select case when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9-]+\.(jpg|png|webp)$'
    then split_part(p_name, '/', 1)::uuid else null end;
$$;
create function sakaba.work_photo_guild(p_name text)
returns uuid language sql immutable set search_path = pg_catalog as $$
  select case when sakaba.work_photo_owner(p_name) is not null then split_part(p_name, '/', 2)::uuid else null end;
$$;
-- 読めるか：本人か、その写真が載っている店の行があり、見る人がその店の在籍中の会員か
create function sakaba.can_read_work_photo(p_name text)
returns boolean language sql stable security definer
set search_path = pg_catalog, sakaba as $$
  select sakaba.work_photo_owner(p_name) = auth.uid()
    or exists (
      select 1 from sakaba.guild_profile_photos ph
      where ph.storage_path = p_name and sakaba.is_active_member(ph.guild_id, auth.uid())
    );
$$;
revoke all on function sakaba.work_photo_owner(text) from public, anon;
revoke all on function sakaba.work_photo_guild(text) from public, anon;
revoke all on function sakaba.can_read_work_photo(text) from public, anon;
grant execute on function sakaba.work_photo_owner(text) to authenticated;
grant execute on function sakaba.work_photo_guild(text) to authenticated;
grant execute on function sakaba.can_read_work_photo(text) to authenticated;

create policy sakaba_work_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'sakaba-work-photos' and coalesce(sakaba.can_read_work_photo(name), false));
create policy sakaba_work_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'sakaba-work-photos' and sakaba.work_photo_owner(name) = auth.uid()
    and sakaba.is_active_member(sakaba.work_photo_guild(name), auth.uid()));
create policy sakaba_work_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'sakaba-work-photos' and sakaba.work_photo_owner(name) = auth.uid())
  with check (bucket_id = 'sakaba-work-photos' and sakaba.work_photo_owner(name) = auth.uid());
create policy sakaba_work_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'sakaba-work-photos' and sakaba.work_photo_owner(name) = auth.uid());

-- ================= 3. 移す前の控え（照合用・この migration の中だけ） =================
create temp table _old_profiles on commit drop as select * from sakaba.profiles;
create temp table _old_profile_tags on commit drop as select * from sakaba.profile_tags;
create temp table _old_profile_contacts on commit drop as select * from sakaba.profile_contacts;
create temp table _old_profile_contact_items on commit drop as select * from sakaba.profile_contact_items;
create temp table _old_profile_shares on commit drop as select * from sakaba.profile_shares;

-- 「主の店」＝GIAの店に入っていればGIA、そうでなければ最初に入った店（名刺と共有URLをそのまま残す先）
create temp table _primary_store on commit drop as
select distinct on (gm.user_id) gm.user_id, gm.guild_id
from sakaba.guild_members gm
join sakaba.guilds g on g.id = gm.guild_id
order by gm.user_id, (g.slug <> 'gia'), gm.joined_at, gm.guild_id;

-- ================= 4. プロフィールを店の数だけ写す =================
insert into sakaba.guild_profiles (
  guild_id, user_id, display_name, photo_url, headline, job, job_icon, region, bio, can_help_with, strengths,
  values_text, vision, social_issue, looking_for, want_to_meet, name_kana, hometown, hobbies, life_story,
  birth_month, birth_day, birth_year, business_card_front, business_card_back, business_card_agreed_at,
  created_at, updated_at
)
select gm.guild_id, gm.user_id, p.display_name, p.photo_url, p.headline, p.job, p.job_icon, p.region, p.bio,
  p.can_help_with, p.strengths, p.values_text, p.vision, p.social_issue, p.looking_for, p.want_to_meet,
  p.name_kana, p.hometown, p.hobbies, p.life_story, p.birth_month, p.birth_day, p.birth_year,
  case when ps.guild_id = gm.guild_id then p.business_card_front end,
  case when ps.guild_id = gm.guild_id then p.business_card_back end,
  case when ps.guild_id = gm.guild_id then p.business_card_agreed_at end,
  p.created_at, p.updated_at
from sakaba.guild_members gm
join sakaba.profiles p on p.user_id = gm.user_id
join _primary_store ps on ps.user_id = gm.user_id;

-- ================= 5. タグ・連絡先・共有URLを店ごとに =================
-- タグ
alter table sakaba.profile_tags add column guild_id uuid;
alter table sakaba.profile_tags drop constraint profile_tags_pkey;
alter table sakaba.profile_tags drop constraint profile_tags_user_id_fkey;
insert into sakaba.profile_tags (guild_id, user_id, tag_id)
select gm.guild_id, pt.user_id, pt.tag_id
from sakaba.profile_tags pt join sakaba.guild_members gm on gm.user_id = pt.user_id
where pt.guild_id is null;
delete from sakaba.profile_tags where guild_id is null;
alter table sakaba.profile_tags alter column guild_id set not null;
alter table sakaba.profile_tags add constraint profile_tags_pkey primary key (guild_id, user_id, tag_id);
alter table sakaba.profile_tags add constraint profile_tags_member_fkey foreign key (guild_id, user_id)
  references sakaba.guild_members (guild_id, user_id) on delete cascade;

-- 連絡先（まとめ）
alter table sakaba.profile_contacts add column guild_id uuid;
alter table sakaba.profile_contacts drop constraint profile_contacts_pkey;
alter table sakaba.profile_contacts drop constraint profile_contacts_user_id_fkey;
insert into sakaba.profile_contacts (guild_id, user_id, email, line_url, website_url, updated_at, website_visibility, email_visibility, line_visibility)
select gm.guild_id, pc.user_id, pc.email, pc.line_url, pc.website_url, pc.updated_at, pc.website_visibility, pc.email_visibility, pc.line_visibility
from sakaba.profile_contacts pc join sakaba.guild_members gm on gm.user_id = pc.user_id
where pc.guild_id is null;
delete from sakaba.profile_contacts where guild_id is null;
alter table sakaba.profile_contacts alter column guild_id set not null;
alter table sakaba.profile_contacts add constraint profile_contacts_pkey primary key (guild_id, user_id);
alter table sakaba.profile_contacts add constraint profile_contacts_member_fkey foreign key (guild_id, user_id)
  references sakaba.guild_members (guild_id, user_id) on delete cascade;

-- 連絡先（1件ずつ）
alter table sakaba.profile_contact_items add column guild_id uuid;
insert into sakaba.profile_contact_items (guild_id, user_id, kind, label, value, visibility, sort_order, created_at, updated_at)
select gm.guild_id, i.user_id, i.kind, i.label, i.value, i.visibility, i.sort_order, i.created_at, i.updated_at
from sakaba.profile_contact_items i join sakaba.guild_members gm on gm.user_id = i.user_id
where i.guild_id is null;
delete from sakaba.profile_contact_items where guild_id is null;
alter table sakaba.profile_contact_items alter column guild_id set not null;
alter table sakaba.profile_contact_items drop constraint profile_contact_items_user_id_fkey;
alter table sakaba.profile_contact_items add constraint profile_contact_items_member_fkey foreign key (guild_id, user_id)
  references sakaba.guild_members (guild_id, user_id) on delete cascade;
drop index sakaba.profile_contact_items_user_idx;
create index profile_contact_items_owner_idx on sakaba.profile_contact_items (guild_id, user_id, sort_order);

-- 共有URL：今のURL（token）は主の店のものとして残す。ほかの店には、同じ設定で新しいURLを作る
alter table sakaba.profile_shares add column guild_id uuid;
alter table sakaba.profile_shares drop constraint profile_shares_pkey;
alter table sakaba.profile_shares drop constraint profile_shares_user_id_fkey;
update sakaba.profile_shares s set guild_id = ps.guild_id from _primary_store ps where ps.user_id = s.user_id;
insert into sakaba.profile_shares (guild_id, user_id, token, enabled, show_profile, show_personal, show_card, show_intros,
  show_intro_authors, created_at, rotated_at, updated_at, acknowledged_at, nudge_declined_at)
select gm.guild_id, s.user_id, sakaba.new_share_token(), s.enabled, s.show_profile, s.show_personal, s.show_card, s.show_intros,
  s.show_intro_authors, s.created_at, s.rotated_at, s.updated_at, s.acknowledged_at, s.nudge_declined_at
from sakaba.profile_shares s
join sakaba.guild_members gm on gm.user_id = s.user_id and gm.guild_id <> s.guild_id
where s.guild_id is not null;
-- 入会している店が無い人の行は、行き先が無いので消さずに残せない（主キーが店になるため）。数を知らせる
do $$
declare n integer;
begin
  select count(*) into n from sakaba.profile_shares where guild_id is null;
  if n > 0 then raise notice '共有URLのうち、どの店にも入っていない人の分 % 件は、店が決まらないため移しません（古い表の控えは _old では残りません）', n; end if;
end $$;
delete from sakaba.profile_shares where guild_id is null;
alter table sakaba.profile_shares alter column guild_id set not null;
alter table sakaba.profile_shares add constraint profile_shares_pkey primary key (guild_id, user_id);
alter table sakaba.profile_shares add constraint profile_shares_member_fkey foreign key (guild_id, user_id)
  references sakaba.guild_members (guild_id, user_id) on delete cascade;

-- ================= 6. 新しく店に入ったとき =================
-- guild_members に行が増えたら、その店のプロフィールの行を作る。名前・ふりがな・写真だけ、ほかの店の行から写す（ほかは空）。
-- どの店にもまだいない人は、profiles に入っている名前（入会画面で入れた名前）を使う。
-- 入口が増えても（招待・owner付与・ゲストから入会）、行が作られないことが無いよう、関数ではなくトリガーに置く
create function sakaba.create_guild_profile_on_member() returns trigger language plpgsql security definer
set search_path = pg_catalog, sakaba as $$
declare
  v_prev sakaba.guild_profiles%rowtype;
  v_name text;
begin
  select gp.* into v_prev from sakaba.guild_profiles gp
  where gp.user_id = new.user_id and gp.guild_id <> new.guild_id
  order by gp.created_at, gp.guild_id limit 1;
  if found then
    insert into sakaba.guild_profiles (guild_id, user_id, display_name, name_kana, photo_url, job_icon)
    values (new.guild_id, new.user_id, v_prev.display_name, v_prev.name_kana, v_prev.photo_url, 'other')
    on conflict (guild_id, user_id) do nothing;
  else
    select p.display_name into v_name from sakaba.profiles p where p.user_id = new.user_id;
    insert into sakaba.guild_profiles (guild_id, user_id, display_name)
    values (new.guild_id, new.user_id, coalesce(nullif(btrim(v_name), ''), '名前未設定'))
    on conflict (guild_id, user_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger guild_members_create_profile after insert on sakaba.guild_members
  for each row execute function sakaba.create_guild_profile_on_member();

-- ================= 7. 照合（一致しなければ全体を巻き戻す） =================
do $$
declare
  v_gia uuid;
  n_members integer;
  n_profiles integer;
  n_bad integer;
begin
  select id into v_gia from sakaba.guilds where slug = 'gia';

  select count(*) into n_members from sakaba.guild_members;
  select count(*) into n_profiles from sakaba.guild_profiles;
  if n_members <> n_profiles then
    raise exception '[0134] 店の会員 % 人に対して、店ごとのプロフィールが % 行です', n_members, n_profiles;
  end if;

  -- 中身の列が、移す前の profiles と全部一致する（全店・全員。名刺は主の店だけ）
  select count(*) into n_bad
  from sakaba.guild_profiles gp
  join _old_profiles o on o.user_id = gp.user_id
  join _primary_store ps on ps.user_id = gp.user_id
  where (gp.display_name, gp.photo_url, gp.headline, gp.job, gp.job_icon, gp.region, gp.bio, gp.can_help_with, gp.strengths,
         gp.values_text, gp.vision, gp.social_issue, gp.looking_for, gp.want_to_meet, gp.name_kana, gp.hometown, gp.hobbies,
         gp.life_story, gp.birth_month, gp.birth_day, gp.birth_year)
     is distinct from
        (o.display_name, o.photo_url, o.headline, o.job, o.job_icon, o.region, o.bio, o.can_help_with, o.strengths,
         o.values_text, o.vision, o.social_issue, o.looking_for, o.want_to_meet, o.name_kana, o.hometown, o.hobbies,
         o.life_story, o.birth_month, o.birth_day, o.birth_year)
     or (gp.business_card_front, gp.business_card_back, gp.business_card_agreed_at)
        is distinct from
        (case when ps.guild_id = gp.guild_id then o.business_card_front end,
         case when ps.guild_id = gp.guild_id then o.business_card_back end,
         case when ps.guild_id = gp.guild_id then o.business_card_agreed_at end);
  if n_bad > 0 then
    raise exception '[0134] プロフィールの中身が移す前と一致しない行が % 行あります', n_bad;
  end if;

  -- 名刺は、全店あわせて、移す前と同じ枚数（消えたり増えたりしていない）
  if (select count(*) from sakaba.guild_profiles where business_card_front is not null or business_card_back is not null)
     <> (select count(*) from _old_profiles o join _primary_store ps on ps.user_id = o.user_id
         where o.business_card_front is not null or o.business_card_back is not null) then
    raise exception '[0134] 名刺の件数が移す前と一致しません';
  end if;

  -- GIAの店：タグ・連絡先・連絡先の1件ずつが、GIAに入っている人については移す前と同じ
  select count(*) into n_bad from (
    (select o.user_id, o.tag_id from _old_profile_tags o join sakaba.guild_members gm on gm.user_id = o.user_id and gm.guild_id = v_gia
     except select user_id, tag_id from sakaba.profile_tags where guild_id = v_gia)
    union all
    (select user_id, tag_id from sakaba.profile_tags where guild_id = v_gia
     except select o.user_id, o.tag_id from _old_profile_tags o)
  ) d;
  if n_bad > 0 then raise exception '[0134] GIAの店のタグが移す前と一致しません（% 件）', n_bad; end if;

  select count(*) into n_bad from (
    (select o.user_id, o.email, o.line_url, o.website_url, o.email_visibility, o.line_visibility, o.website_visibility
     from _old_profile_contacts o join sakaba.guild_members gm on gm.user_id = o.user_id and gm.guild_id = v_gia
     except select user_id, email, line_url, website_url, email_visibility, line_visibility, website_visibility
            from sakaba.profile_contacts where guild_id = v_gia)
    union all
    (select user_id, email, line_url, website_url, email_visibility, line_visibility, website_visibility
     from sakaba.profile_contacts where guild_id = v_gia
     except select o.user_id, o.email, o.line_url, o.website_url, o.email_visibility, o.line_visibility, o.website_visibility from _old_profile_contacts o)
  ) d;
  if n_bad > 0 then raise exception '[0134] GIAの店の連絡先が移す前と一致しません（% 件）', n_bad; end if;

  select count(*) into n_bad from (
    (select o.user_id, o.kind, o.label, o.value, o.visibility, o.sort_order
     from _old_profile_contact_items o join sakaba.guild_members gm on gm.user_id = o.user_id and gm.guild_id = v_gia
     except select user_id, kind, label, value, visibility, sort_order from sakaba.profile_contact_items where guild_id = v_gia)
    union all
    (select user_id, kind, label, value, visibility, sort_order from sakaba.profile_contact_items where guild_id = v_gia
     except select o.user_id, o.kind, o.label, o.value, o.visibility, o.sort_order from _old_profile_contact_items o)
  ) d;
  if n_bad > 0 then raise exception '[0134] GIAの店の連絡先の1件ずつが移す前と一致しません（% 件）', n_bad; end if;

  -- 共有URL：移す前の token が、今も同じ人の行（主の店）についている。設定も同じ
  select count(*) into n_bad
  from _old_profile_shares o
  join _primary_store ps on ps.user_id = o.user_id
  left join sakaba.profile_shares s on s.token = o.token
  where s.user_id is distinct from o.user_id or s.guild_id is distinct from ps.guild_id
     or (s.enabled, s.show_profile, s.show_personal, s.show_card, s.show_intros, s.show_intro_authors)
        is distinct from (o.enabled, o.show_profile, o.show_personal, o.show_card, o.show_intros, o.show_intro_authors);
  if n_bad > 0 then raise exception '[0134] 今の共有URLが移す前と同じ人・同じ設定で残っていません（% 件）', n_bad; end if;

  raise notice '[0134] 店ごとのプロフィール % 行・照合OK', n_profiles;
end $$;

notify pgrst, 'reload schema';

commit;
