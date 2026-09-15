-- ===================================================================
-- 0069: 有料会員の会員番号（member_no）
-- 作成: 2026-06-24
--
-- 仕様（五島さん）:
--   有料会員(tier='paid')だけに登録順の通し番号を付与（無料会員は null）。
--   一般会員(¥990)/本会員(¥4,980)は区別せず1本の連番。創設メンバー称号は無し。
--   プロフィール/会員一覧に「No.◯◯」バッジで表示する。
--
-- 方針:
--   tier='paid' になった瞬間にトリガーで自動採番（webhook/手動/管理いずれの経路でも）。
--   一度振った番号は不変（member_no が null の時だけ採番）。
-- ===================================================================

alter table applicants add column if not exists member_no integer;
create sequence if not exists applicants_member_no_seq;

-- 既存の有料会員を登録順（created_at 昇順）でバックフィル（未採番のみ）
with ranked as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from applicants
  where tier = 'paid' and member_no is null
)
update applicants a
set member_no = r.rn
from ranked r
where a.id = r.id;

-- シーケンスを現在の最大番号に合わせる（次は max+1。会員ゼロなら既定の 1 から）
do $$
declare mx integer;
begin
  select max(member_no) into mx from applicants;
  if mx is not null then
    perform setval('applicants_member_no_seq', mx, true);
  end if;
end $$;

-- 採番トリガー：tier='paid' かつ未採番なら次番号を振る
create or replace function assign_member_no()
returns trigger as $$
begin
  if new.tier = 'paid' and new.member_no is null then
    new.member_no := nextval('applicants_member_no_seq');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assign_member_no on applicants;
create trigger trg_assign_member_no
  before insert or update of tier on applicants
  for each row execute function assign_member_no();

-- member_profiles ビューに member_no を追加（一覧/詳細でバッジ表示するため）。
-- 0060 の定義に member_no を末尾追加して置換。
create or replace view member_profiles as
select
  a.id,
  a.name,
  a.name_furigana,
  a.nickname,
  a.tier,
  a.photo_url,
  a.role_title,
  a.job_title,
  a.headline,
  a.services_summary,
  a.genre,
  a.location,
  a.story_origin,
  a.story_turning_point,
  a.story_now,
  a.story_future,
  a.want_to_connect_with,
  a.status_message,
  a.favorites,
  a.current_hobby,
  a.school_days_self,
  a.personal_values,
  a.contact_line,
  a.contact_instagram,
  a.contact_website,
  a.referrer_id,
  a.updated_at,
  a.plan,
  a.member_no
from applicants a
where auth.uid() is not null;

grant select on member_profiles to authenticated;
notify pgrst, 'reload schema';
