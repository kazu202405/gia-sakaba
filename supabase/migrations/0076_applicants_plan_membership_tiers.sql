-- ===================================================================
-- 0076: applicants.plan に会員3段 + 招待枠を許可
-- 作成: 2026-08-08
--
-- 背景:
--   会員の段を online / real / invite / premium の4つで表す。
--
--     online   ¥4,980   公開
--     real     ¥7,980   公開
--     invite   ¥11,000  非公開（URLを個別に渡す）
--     premium  ¥33,000  非公開（URLを個別に渡す）
--
--   これまで plan は ('salon','pro','terakoya') の3値だった。名前が価格や
--   商品の実態とずれており（例: ¥4,980 が AI_CLONE_ASSISTANT の枠で課金され、
--   ¥11,000 が terakoya という旧称）、取り違えの原因になっていたため、
--   段そのものを表す名前に付け替える。
--
--   既存値は消さない。'salon' 1件 / 'pro' 1件 が入っており、
--   これらは過去の契約を表すので、履歴として許可したまま残す。
--   新規の付与では使わない。
--
--   tier は触らない（'paid' にすると紹介リンク等コーチ機能が誤って開く）。
-- ===================================================================

ALTER TABLE applicants
  DROP CONSTRAINT IF EXISTS applicants_plan_check;

ALTER TABLE applicants
  ADD CONSTRAINT applicants_plan_check
    CHECK (
      plan IS NULL OR plan IN (
        -- 現行の会員（公開2段 + 非公開2段）
        'online', 'real', 'invite', 'premium',
        -- 過去の契約。新規では付与しない
        'salon', 'pro', 'terakoya'
      )
    );

COMMENT ON COLUMN applicants.plan IS
  '会員の段: online(4,980) / real(7,980) / invite(11,000) / premium(33,000)。'
  'invite と premium は非公開でURLを個別に渡す。'
  'salon / pro / terakoya は過去の契約で、新規では付与しない';

NOTIFY pgrst, 'reload schema';
