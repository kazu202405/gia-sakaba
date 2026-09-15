-- ===================================================================
-- 0016: メンバー紹介リンクへの拡張（invitations テーブルを admin/member 両対応化）
-- 作成: 2026-05-11
--
-- 背景:
--   0015 で invitations は admin 専用の発行モデルで実装したが、
--   network_app 本来の主役は「メンバー同士の紹介」。
--   paid 会員が自分の紹介リンクを発行し、踏んでくれた人の applicants.referrer_id に
--   自動で紹介者の user_id が入るようにする。
--
-- 仕様（2026-05-11 ユーザー合意）:
--   1. paid 会員は自分の invitations を発行できる（self INSERT/SELECT/UPDATE）
--      - ただし seminar_id は NULL のみ（汎用紹介リンクのみ。セミナー指定は admin 専用）
--   2. event_attendees INSERT トリガで invitation.created_by を referrer_id に伝搬
--      - ただし invitation.seminar_id IS NULL の場合のみ（admin のセミナー招待では紹介者扱いしない）
--   3. validate_invite_code RPC を拡張して referrer_name も返す
--      - /join で「○○さんからのご紹介」バナーを出すため
--      - 個人情報のうち表示名のみ公開（メアド・notes は出さない）
-- ===================================================================


-- ============================================================
-- 1. event_attendees トリガ拡張：referrer_id 自動伝搬
-- ============================================================
-- CREATE OR REPLACE で 0015 の関数を上書き。
-- 元の用途（used_count 加算）は維持し、メンバー紹介の場合のみ referrer_id を埋める。
CREATE OR REPLACE FUNCTION public.bump_invitation_used_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by UUID;
  v_seminar_id UUID;
BEGIN
  IF NEW.invite_code IS NOT NULL AND length(trim(NEW.invite_code)) > 0 THEN
    UPDATE invitations
       SET used_count = used_count + 1,
           updated_at = NOW()
     WHERE code = NEW.invite_code
       AND is_active = TRUE
    RETURNING created_by, seminar_id
      INTO v_created_by, v_seminar_id;

    -- メンバー紹介リンク（seminar_id NULL）の場合のみ referrer_id を埋める。
    -- ・自分自身の招待で来た場合は埋めない
    -- ・既に referrer_id が手動入力されている場合は上書きしない
    -- ・admin のセミナー招待（seminar_id 値あり）は紹介ではないのでスキップ
    IF v_created_by IS NOT NULL
       AND v_created_by <> NEW.user_id
       AND v_seminar_id IS NULL
    THEN
      UPDATE applicants
         SET referrer_id = v_created_by,
             updated_at = NOW()
       WHERE id = NEW.user_id
         AND referrer_id IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================
-- 2. paid 会員向け self RLS（admin 専用ポリシーは 0015 で維持）
-- ============================================================
-- 読取り：自分が created_by の行のみ
DROP POLICY IF EXISTS invitations_member_self_read ON invitations;
CREATE POLICY invitations_member_self_read
  ON invitations
  FOR SELECT
  USING (created_by = auth.uid());

-- 作成：自分の created_by で、paid 会員で、seminar_id NULL（汎用のみ）
-- ※ admin は 0015 の invitations_admin_all で別経路（is_admin() true）から作る
DROP POLICY IF EXISTS invitations_member_self_insert ON invitations;
CREATE POLICY invitations_member_self_insert
  ON invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND seminar_id IS NULL
    AND EXISTS (
      SELECT 1 FROM applicants
       WHERE id = auth.uid() AND tier = 'paid'
    )
  );

-- 更新：自分の行のみ。seminar_id は触れない（NULL 強制で member の汎用属性を維持）
DROP POLICY IF EXISTS invitations_member_self_update ON invitations;
CREATE POLICY invitations_member_self_update
  ON invitations
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (
    created_by = auth.uid()
    AND seminar_id IS NULL
  );


-- ============================================================
-- 3. validate_invite_code 拡張：referrer_name も返す
-- ============================================================
-- RETURNS TABLE のシグネチャを変えるため、一度 DROP してから再作成する。
DROP FUNCTION IF EXISTS public.validate_invite_code(TEXT);

CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS TABLE (
  invitation_id UUID,
  seminar_id UUID,
  -- 紹介者の表示名（seminar_id IS NULL のメンバー紹介リンクの時のみ意味を持つ）
  -- /join で「○○さんからのご紹介」バナー表示用。
  referrer_name TEXT,
  is_valid BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_seminar UUID;
  v_created_by UUID;
  v_active BOOLEAN;
  v_expires TIMESTAMPTZ;
  v_max INTEGER;
  v_used INTEGER;
  v_ref_name TEXT;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    invitation_id := NULL; seminar_id := NULL; referrer_name := NULL;
    is_valid := FALSE; reason := 'not_found';
    RETURN NEXT; RETURN;
  END IF;

  SELECT i.id, i.seminar_id, i.created_by,
         i.is_active, i.expires_at, i.max_uses, i.used_count
    INTO v_id, v_seminar, v_created_by,
         v_active, v_expires, v_max, v_used
    FROM invitations i
   WHERE i.code = p_code
   LIMIT 1;

  IF v_id IS NULL THEN
    invitation_id := NULL; seminar_id := NULL; referrer_name := NULL;
    is_valid := FALSE; reason := 'not_found';
    RETURN NEXT; RETURN;
  END IF;

  -- 紹介者表示名は member referral（seminar_id NULL）の時だけ引く。
  -- nickname があれば nickname、無ければ name を返す。
  IF v_seminar IS NULL AND v_created_by IS NOT NULL THEN
    SELECT COALESCE(NULLIF(trim(a.nickname), ''), a.name)
      INTO v_ref_name
      FROM applicants a
     WHERE a.id = v_created_by
     LIMIT 1;
  END IF;

  invitation_id := v_id;
  seminar_id := v_seminar;
  referrer_name := v_ref_name;

  IF NOT v_active THEN
    is_valid := FALSE; reason := 'revoked'; RETURN NEXT; RETURN;
  END IF;

  IF v_expires IS NOT NULL AND v_expires < NOW() THEN
    is_valid := FALSE; reason := 'expired'; RETURN NEXT; RETURN;
  END IF;

  IF v_max IS NOT NULL AND v_used >= v_max THEN
    is_valid := FALSE; reason := 'max_uses_reached'; RETURN NEXT; RETURN;
  END IF;

  is_valid := TRUE; reason := 'ok';
  RETURN NEXT; RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO anon, authenticated;


-- ============================================================
-- 4. PostgREST schema cache reload
-- ============================================================
NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- ✅ 完了。
-- 動作確認:
--   -- A. RPC が拡張シグネチャで返るか
--   SELECT * FROM validate_invite_code('does-not-exist');
--   -- → (NULL, NULL, NULL, false, 'not_found')
--
--   -- B. paid 会員として（admin 以外で）invitations に INSERT できるか
--   --    （Supabase Authenticated として、tier='paid' の applicants 行を持つ user）
--   INSERT INTO invitations (code, created_by)
--     VALUES ('mref-aabbcc', auth.uid()) RETURNING *;
--
--   -- C. 別ユーザーがその code で /join → applicants.referrer_id が自動で埋まること
-- ===================================================================
