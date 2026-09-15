-- ===================================================================
-- 0018: applicants の特権カラムを user 自己書込から保護する BEFORE UPDATE トリガ
-- 作成: 2026-05-11
--
-- 背景:
--   既存 RLS `applicants_self_update` は「自分の行は UPDATE 可」だが
--   全カラム書込可能。フロントから直接 supabase クライアントを叩けば
--   user が tier='paid' に昇格できてしまう（穴）。
--
-- 設計:
--   Postgres は column-level GRANT と RLS の両立が扱いにくいため、
--   BEFORE UPDATE トリガで「特権カラムが変わった時、actor が許可されているか」
--   を判定する方式にする。
--
-- 許可ルール（actor 別）:
--   admin (is_admin() true)            : 全カラム可
--   service_role (auth.role()=service)  : 全カラム可（Stripe webhook / 管理 API 用）
--   自分 (auth.uid() = OLD.id)         : tier は tentative → registered の自動昇格のみ
--                                          stripe_* / referrer_id / admin_notes は全て不可
--   それ以外                            : RLS で先に弾かれるので到達しない
--
-- 守るカラム:
--   - tier                  : 'tentative' → 'paid' を user が直接やれるのが問題
--   - stripe_customer_id    : 偽課金状態の捏造を防ぐ
--   - stripe_subscription_id
--   - subscription_status
--   - referrer_id           : 任意の人を「紹介者」に詐称できるのを防ぐ（0016 の invitations トリガが正規ルート）
--   - admin_notes           : 主催者専有（0012 で追加）
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================


CREATE OR REPLACE FUNCTION public.guard_applicants_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_role TEXT;
BEGIN
  -- 他トリガの中から発火した UPDATE は信頼する（pg_trigger_depth > 1 で判定）。
  -- 具体例: 0016 の bump_invitation_used_count(SECURITY DEFINER) が
  --        invitations 経由で applicants.referrer_id を埋める時、本ガードに
  --        ブロックされないようにする。直接 user が叩いた UPDATE は depth=1
  --        なのでこの bypass には引っかからない。
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  v_actor_role := COALESCE(auth.role(), '');

  -- service_role（Stripe webhook / 管理 API）は全カラム書込可
  IF v_actor_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 主催者は全カラム書込可
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- ここから自分（authenticated）として行う UPDATE。
  -- RLS `applicants_self_update` を通っているので NEW.id = OLD.id = auth.uid() が成立。

  -- tier: tentative → registered の自動昇格のみ許可
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    IF NOT (OLD.tier = 'tentative' AND NEW.tier = 'registered') THEN
      RAISE EXCEPTION
        'permission denied: cannot change applicants.tier directly (% → %)',
        OLD.tier, NEW.tier
        USING ERRCODE = '42501', -- insufficient_privilege
              HINT = 'tier 変更は admin もしくは Stripe webhook 経由のみ可能です。';
    END IF;
  END IF;

  -- Stripe 関連カラム: user 自身は触れない
  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'permission denied: applicants.stripe_customer_id is read-only for users'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION 'permission denied: applicants.stripe_subscription_id is read-only for users'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    RAISE EXCEPTION 'permission denied: applicants.subscription_status is read-only for users'
      USING ERRCODE = '42501';
  END IF;

  -- referrer_id: user 自身は触れない（invitations 経由のみ：0016 トリガが SECURITY DEFINER で埋める）
  IF NEW.referrer_id IS DISTINCT FROM OLD.referrer_id THEN
    RAISE EXCEPTION 'permission denied: applicants.referrer_id is set automatically via invitations'
      USING ERRCODE = '42501';
  END IF;

  -- admin_notes: 主催者専有
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    RAISE EXCEPTION 'permission denied: applicants.admin_notes is admin-only'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS applicants_privileged_columns_guard ON applicants;
CREATE TRIGGER applicants_privileged_columns_guard
  BEFORE UPDATE ON applicants
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_applicants_privileged_columns();


-- PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- ✅ 完了。
--
-- 動作確認（Supabase Studio SQL Editor、各クエリは role 指定して実行）:
--   -- A. user として tier='paid' に直接書き換えようとして失敗すること
--   --   （Studio で SET ROLE authenticated; SELECT set_config('request.jwt.claims', '{"sub":"<user_id>","role":"authenticated"}', true); 後）
--   UPDATE applicants SET tier='paid' WHERE id = '<user_id>';
--   -- → ERROR: permission denied: cannot change applicants.tier directly
--
--   -- B. user として tentative → registered の自動昇格は通ること
--   --   （事前に tier='tentative' になっていること）
--   UPDATE applicants SET tier='registered' WHERE id = '<user_id>';
--   -- → 1 row updated
--
--   -- C. service_role なら何でも通ること
--   --   （SET ROLE service_role; 後）
--   UPDATE applicants SET tier='paid', stripe_customer_id='cus_test'
--    WHERE id = '<user_id>';
--   -- → 1 row updated
--
--   -- D. user として referrer_id を詐称しようとして失敗すること
--   UPDATE applicants SET referrer_id = '<other_user_id>' WHERE id = '<user_id>';
--   -- → ERROR: applicants.referrer_id is set automatically via invitations
--
-- 既存パスへの影響:
--   - /api/profile/save (user-context): tentative→registered のみ昇格 → 通る
--   - /api/stripe/webhook (service_role): すべて通る
--   - admin が /admin から tier 変更: is_admin() で通る
--   - 0016 トリガ（bump_invitation_used_count）: pg_trigger_depth() > 1 で bypass → 通る
--   - user が直接 referrer_id を書き換える試み: depth=1 で本ガードが走りブロック
-- ===================================================================
