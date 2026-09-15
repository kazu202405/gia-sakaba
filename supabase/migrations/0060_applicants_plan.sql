-- ===================================================================
-- 0060: applicants.plan（サロン¥990 / 本会員¥4,980 の区別）＋ member_profiles に plan 露出
-- 作成: 2026-06-20
--
-- 背景:
--   有料を2段に分ける。tier='paid' は「課金中」を表し、plan で値段帯を区別する。
--     plan='salon' = サロン会員 ¥990（コミュニティ自分軸：コーチ）
--     plan='pro'   = 本会員 ¥4,980（全部入り：右腕AIフル込み＋相性鑑定＋紹介リンク＋懇親会＋stock）
--   本会員(pro)は右腕AI(assistant)の購入と一体。決済完了時に webhook が
--   ai_clone_tenants を作りつつ applicants.plan='pro' を立てる（同セッションの webhook 改修）。
-- ===================================================================

ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS plan TEXT
    CHECK (plan IS NULL OR plan IN ('salon', 'pro'));

-- 既存の有料会員は現行サロン¥990 → 'salon' にバックフィル
UPDATE applicants SET plan = 'salon' WHERE tier = 'paid' AND plan IS NULL;

-- メンバー一覧/詳細でバッジ（サロン会員/本会員）を出し分けるため、view に plan を末尾追加。
-- （0059 の member_profiles を列追加して置換。security_invoker なし＝owner評価のまま）
CREATE OR REPLACE VIEW member_profiles AS
SELECT
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
  a.plan
FROM applicants a
WHERE auth.uid() IS NOT NULL;

GRANT SELECT ON member_profiles TO authenticated;

NOTIFY pgrst, 'reload schema';
