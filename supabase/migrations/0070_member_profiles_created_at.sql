-- ===================================================================
-- 0070: member_profiles ビューに created_at を追加
-- 作成: 2026-06-25
--
-- 会員一覧の並び順を「有料を上に → 有料は会員番号順 → 非有料は登録順」に
-- するため、非有料の登録順判定に created_at が必要。0069 の定義に列を1つ足す。
-- ===================================================================

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
  a.member_no,
  a.created_at
from applicants a
where auth.uid() is not null;

grant select on member_profiles to authenticated;
notify pgrst, 'reload schema';
