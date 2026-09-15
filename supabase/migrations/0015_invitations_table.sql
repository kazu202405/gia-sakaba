-- ===================================================================
-- 0015: invitations テーブル新設
-- 作成: 2026-05-11
--
-- 目的:
--   admin の「招待コード」タブから「事前発行・割当・無効化」を可能にする。
--
-- 設計（2026-05-11 ユーザー合意）:
--   - Hybrid: 1人付け（max_uses=1, invited_name/email を埋める）も
--             共有リンク（max_uses=NULL or N, 名前なし）も同じテーブルで扱う
--   - seminar_id Optional: NULL=どのセミナーにも使える汎用 / 値あり=そのセミナー限定
--   - 既存 /join?invite=<seminars.slug> 流入とは namespace を共有する
--     （invitations.code が hit すればそちらを優先、無ければ seminars.slug に fallback）
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================


-- ============================================================
-- 1. invitations テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 招待URL に埋め込む文字列。8-12文字程度の英数小文字を想定（admin UI で生成）
  code TEXT UNIQUE NOT NULL,

  -- 任意：特定セミナーに紐付ける場合のみ
  seminar_id UUID REFERENCES seminars(id) ON DELETE SET NULL,

  -- 発行者（admin の auth.uid()）
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 主催者メモ：誰宛に出したか、用途
  invited_name TEXT,
  invited_email TEXT,
  notes TEXT,

  -- 利用回数の上限：NULL=無制限 / 1=一発 / N=N回まで
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0,

  -- 期限切れ（NULL=無期限）
  expires_at TIMESTAMPTZ,

  -- 手動取消（false にすれば既存リンクが無効化される）
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_seminar ON invitations(seminar_id);
CREATE INDEX IF NOT EXISTS idx_invitations_active_created
  ON invitations(is_active, created_at DESC);

-- updated_at トリガ（0001 で定義済の update_updated_at_column を使う）
DROP TRIGGER IF EXISTS invitations_updated_at ON invitations;
CREATE TRIGGER invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 2. RLS：主催者のみフル操作。一般ユーザーは行に直接触れない
--    （/join での検証は validate_invite_code() RPC 経由で行う）
-- ============================================================
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_admin_all ON invitations;
CREATE POLICY invitations_admin_all
  ON invitations
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================
-- 3. validate_invite_code(text) — 未ログイン含む anon 向けに
--    「このコードが今使えるか」だけを返す関数。個人情報は出さない。
-- ============================================================
-- 戻り値:
--   invitation_id : 該当行があれば UUID、無ければ NULL
--   seminar_id    : 紐づくセミナーがあれば UUID、無ければ NULL
--   is_valid      : 今この瞬間に使えるか
--   reason        : 'ok' / 'not_found' / 'revoked' / 'expired' / 'max_uses_reached'
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS TABLE (
  invitation_id UUID,
  seminar_id UUID,
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
  v_active BOOLEAN;
  v_expires TIMESTAMPTZ;
  v_max INTEGER;
  v_used INTEGER;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    invitation_id := NULL; seminar_id := NULL;
    is_valid := FALSE; reason := 'not_found';
    RETURN NEXT; RETURN;
  END IF;

  SELECT i.id, i.seminar_id, i.is_active, i.expires_at, i.max_uses, i.used_count
    INTO v_id, v_seminar, v_active, v_expires, v_max, v_used
    FROM invitations i
   WHERE i.code = p_code
   LIMIT 1;

  IF v_id IS NULL THEN
    invitation_id := NULL; seminar_id := NULL;
    is_valid := FALSE; reason := 'not_found';
    RETURN NEXT; RETURN;
  END IF;

  invitation_id := v_id;
  seminar_id := v_seminar;

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
-- 4. event_attendees INSERT トリガで invitations.used_count++
--    /join 申込時に invite_code が invitations.code と一致したら自動加算する。
--    一致しない（= seminars.slug fallback などの）場合は何もしない。
-- ============================================================
CREATE OR REPLACE FUNCTION public.bump_invitation_used_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NOT NULL AND length(trim(NEW.invite_code)) > 0 THEN
    UPDATE invitations
       SET used_count = used_count + 1,
           updated_at = NOW()
     WHERE code = NEW.invite_code
       AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_attendees_bump_invitation ON event_attendees;
CREATE TRIGGER event_attendees_bump_invitation
  AFTER INSERT ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.bump_invitation_used_count();


-- ============================================================
-- 5. PostgREST schema cache reload
-- ============================================================
NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- ✅ 完了。
-- 動作確認:
--   -- A. テーブルが見えるか
--   SELECT table_name FROM information_schema.tables
--    WHERE table_name = 'invitations';
--
--   -- B. anon でも RPC が呼べるか（service_role でなく anon を選択して実行）
--   SELECT * FROM validate_invite_code('does-not-exist');
--   -- → (NULL, NULL, false, 'not_found') が返ること
--
--   -- C. admin で 1件作って /join で踏む
--   INSERT INTO invitations (code, max_uses, notes)
--     VALUES ('test-12ab34', 3, 'テスト発行') RETURNING *;
--   -- ?invite=test-12ab34 で申込 → used_count が 1 になること
-- ===================================================================
