-- ===================================================================
-- 0059: member_profiles ビュー（会員同士のプロフィール閲覧を可能にする）
-- 作成: 2026-06-20
--
-- 背景:
--   applicants の RLS は「自分の行のみ SELECT 可（applicants_self_read）＋
--   管理者は全件（applicants_admin_read_all）」だけで、会員同士が
--   互いのプロフィールを読む経路が無い。
--   そのため /members/app/members（一覧）と /members/app/profile/[id]（詳細）は
--   管理者（=主催者）でしか中身が見えず、一般会員は空になる。
--
--   コミュニティ転換に伴い「無料会員も人脈一覧・他会員のプロフィールを閲覧できる」
--   方針にしたため、会員間の読取り経路を用意する。
--
-- 方針（event_peers と同じ作法）:
--   security_invoker を付けない通常 VIEW として作る → view owner(postgres) 評価で
--   内部の applicants RLS をバイパスしつつ、WHERE auth.uid() IS NOT NULL で
--   「ログイン済み(authenticated)のみ」という境界を保つ。GRANT も authenticated 限定。
--
-- 機密カラムの除外:
--   email / stripe_customer_id / stripe_subscription_id / subscription_status /
--   admin_notes / referrer_name は view に含めない（会員に晒さない）。
--   公開するのは一覧カードとプロフィール詳細に表示する範囲のみ。
--
-- アプリ側の対応:
--   members/page.tsx・profile/[id]/page.tsx の applicants 直 SELECT を
--   member_profiles に向け直す（buildReferrerChain の紹介者辿りも含む）。
--   ストーリー/人柄/連絡先の「相互開示ゲート」はアプリ層で制御する
--   （RLS/view は列単位・閲覧者依存の制御ができないため。機密ではなく相互性の促し）。
-- ===================================================================

DROP VIEW IF EXISTS member_profiles;

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
  a.updated_at
FROM applicants a
WHERE auth.uid() IS NOT NULL;

GRANT SELECT ON member_profiles TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- ✅ 完了。
-- 確認:
--   1) 一般会員（tier='registered' 等、非admin）でログインし
--      /members/app/members に他会員が並ぶこと。
--   2) /members/app/profile/<他人id> で 基本情報 + サービス + 紹介チェーンが見え、
--      ストーリー/人柄/連絡先は自分が同項目を書くまでロック表示になること。
--   3) member_profiles に email / stripe_* / admin_notes が含まれないこと。
-- ===================================================================
