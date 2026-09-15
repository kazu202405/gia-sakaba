-- ===================================================================
-- network_app 初期スキーマ（v1）
-- 作成: 2026-05-01
-- 用途: GIA セミナー申込・参加管理 + 将来の人脈紹介プラットフォーム基盤
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
--
-- 構造:
--   auth.users（Supabase Auth が標準で持つ） ← パスワード等の認証情報
--          ↓ 1対1（id 共有）
--   applicants                ← ユーザーの追加情報（名前・紹介者など）
--          ↓ 1対多
--   event_attendees           ← 「誰が」「どのイベントに」「どんなステータスで」参加表明
--          ↑ 多対1
--   seminars                  ← イベント本体（5/26、6/8、毎月の会など）
-- ===================================================================


-- ============================================================
-- 1. seminars テーブル
-- ============================================================
CREATE TABLE seminars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,                       -- URL識別子（例: "vol-1-2026-05-26"）
  title TEXT NOT NULL,                             -- 表示タイトル
  date DATE NOT NULL,                              -- 開催日
  start_time TIME,                                 -- 開始時刻
  end_time TIME,                                   -- 終了時刻
  location TEXT,                                   -- 会場名 or "オンライン"
  description TEXT,                                -- 詳細説明
  capacity INTEGER,                                -- 定員（任意）
  line_group_url TEXT,                             -- 主催者LINEグループ招待URL
  event_type TEXT NOT NULL DEFAULT 'seminar'       -- イベント種別
    CHECK (event_type IN ('seminar', 'social', 'workshop', 'other')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,         -- 募集中フラグ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seminars_active_date ON seminars(is_active, date) WHERE is_active = TRUE;
CREATE INDEX idx_seminars_slug ON seminars(slug);


-- ============================================================
-- 2. applicants テーブル（auth.users の拡張プロフィール）
-- ============================================================
CREATE TABLE applicants (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本情報（仮登録時に必須）
  name TEXT NOT NULL,
  name_furigana TEXT,
  nickname TEXT,

  -- 紹介者情報
  referrer_name TEXT,                              -- 自由入力 or autocomplete確定値
  referrer_id UUID REFERENCES applicants(id) ON DELETE SET NULL,  -- 既存ユーザー紹介の場合

  -- ティア（仮登録 / 本登録 / 有料）
  tier TEXT NOT NULL DEFAULT 'tentative'
    CHECK (tier IN ('tentative', 'registered', 'paid')),

  -- 将来の本登録UI で入力される拡張カラム（一旦 NULL OK）
  -- 必要になったら ALTER TABLE で追加していけばよい
  job_title TEXT,
  role_title TEXT,
  headline TEXT,
  story_origin TEXT,
  story_turning_point TEXT,
  story_now TEXT,
  story_future TEXT,
  want_to_connect_with TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applicants_referrer ON applicants(referrer_id);
CREATE INDEX idx_applicants_tier ON applicants(tier);


-- ============================================================
-- 3. event_attendees テーブル（誰がどのイベントにどんな状態で）
-- ============================================================
CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

  invite_code TEXT,                                -- ?invite=xxx で来た時の値
  notes TEXT,                                      -- 申込時メッセージ等

  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- 同じユーザーが同じイベントに2回申込しないように
  UNIQUE(user_id, seminar_id)
);

CREATE INDEX idx_event_attendees_seminar_status ON event_attendees(seminar_id, status);
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id);


-- ============================================================
-- 4. updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seminars_updated_at
  BEFORE UPDATE ON seminars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER applicants_updated_at
  BEFORE UPDATE ON applicants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 5. signup 時に applicants に自動で行を作るトリガー
-- ============================================================
-- ユーザーが Supabase Auth で signUp すると自動で applicants に空行が作られる
-- フロント側は signUp 後に applicants を UPDATE して名前等を埋める
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO applicants (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 6. 管理者判定ヘルパー関数
-- ============================================================
-- 主催者メアドを allowlist で持つ。中期で role 列に切替予定
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.email() = 'global.information.academy@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================
-- 7. Row Level Security (RLS) ポリシー
-- ============================================================
-- ポリシーが無いと anonymous は何も見えない／触れない
-- 必ず ENABLE してからポリシーを書く

-- ----- seminars -----
ALTER TABLE seminars ENABLE ROW LEVEL SECURITY;

-- 募集中のセミナーは anyone（未ログイン含む）SELECT 可能（/join で一覧表示用）
CREATE POLICY "seminars_public_read_active" ON seminars
  FOR SELECT USING (is_active = TRUE);

-- 管理者は全部見えて全部触れる
CREATE POLICY "seminars_admin_all" ON seminars
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ----- applicants -----
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

-- 自分のレコードは自分で見える・更新できる
CREATE POLICY "applicants_self_read" ON applicants
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "applicants_self_update" ON applicants
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 自動 INSERT はトリガー経由で行われるので明示ポリシー不要だが、
-- フロントから直接 INSERT したい場合のために自分自身向けを許可
CREATE POLICY "applicants_self_insert" ON applicants
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 管理者は全 applicants を読める・更新できる
CREATE POLICY "applicants_admin_read_all" ON applicants
  FOR SELECT USING (is_admin());
CREATE POLICY "applicants_admin_update_all" ON applicants
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());


-- ----- event_attendees -----
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- 自分の参加情報は自分で見える
CREATE POLICY "event_attendees_self_read" ON event_attendees
  FOR SELECT USING (auth.uid() = user_id);

-- 自分の参加表明は自分で INSERT できる
CREATE POLICY "event_attendees_self_insert" ON event_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 自分でキャンセル（status を cancelled に）できる
CREATE POLICY "event_attendees_self_cancel" ON event_attendees
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 管理者は全部見えて全部触れる
CREATE POLICY "event_attendees_admin_all" ON event_attendees
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- ✅ スキーマ適用完了
-- ============================================================
-- 次のステップ:
--   1. Supabase Auth ダッシュボードで主催者メアドを signup
--      Email: global.information.academy@gmail.com
--      Password: 任意の強いパスワード
--   2. Authentication > Email Templates で必要なら確認メール無効化
--   3. 1件目の seminars データを INSERT（5/26 紹介獲得セミナー）
--   4. アプリケーション側で @supabase/supabase-js を install してクライアント実装
