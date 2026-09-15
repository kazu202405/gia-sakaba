-- ===================================================================
-- 0071: applicants.plan に 'terakoya' を許可（テラこや 月額会員 ¥11,000 税込）
-- 作成: 2026-06-29
--
-- 背景:
--   テラこやコミュニティ（/members LP）の個人会員を表すため plan='terakoya' を使う。
--   0060 の CHECK 制約は ('salon','pro') のみを許可しており、webhook が
--   plan='terakoya' を UPDATE すると制約違反で失敗（→Stripe再送ループ）するため拡張する。
--   tier は触らない（'paid' にすると紹介リンク等コーチ機能が誤って開くため）。
--   plan='terakoya' は webhook（checkout.session.completed / purpose='terakoya'）で付与し、
--   解約時に NULL へ戻す。mypage はこの値を見て「紹介設計」セクションを出し分ける。
-- ===================================================================

ALTER TABLE applicants
  DROP CONSTRAINT IF EXISTS applicants_plan_check;

ALTER TABLE applicants
  ADD CONSTRAINT applicants_plan_check
    CHECK (plan IS NULL OR plan IN ('salon', 'pro', 'terakoya'));

NOTIFY pgrst, 'reload schema';
