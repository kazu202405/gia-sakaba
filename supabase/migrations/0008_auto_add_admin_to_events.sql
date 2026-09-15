-- ===================================================================
-- 0008: seminar 作成時に admin を自動で event_attendees に追加
-- 作成: 2026-05-01
--
-- 目的: admin（主催者）が自分のイベントの参加者リストに自然に出るように。
--       ユーザー側 mypage の「他のお申込者」に admin の名前が並ぶ。
--       「主催者」バッジは付けず、ただの参加者として扱う。
-- ===================================================================

CREATE OR REPLACE FUNCTION public.auto_add_admin_to_seminar()
RETURNS TRIGGER AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'global.information.academy@gmail.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO event_attendees (user_id, seminar_id, status, applied_at, approved_at, approved_by)
    VALUES (admin_user_id, NEW.id, 'approved', NOW(), NOW(), admin_user_id)
    ON CONFLICT (user_id, seminar_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_seminar_created_add_admin ON seminars;
CREATE TRIGGER on_seminar_created_add_admin
  AFTER INSERT ON seminars
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_admin_to_seminar();

-- 既存 seminars 用 backfill（5/26 含む）
INSERT INTO event_attendees (user_id, seminar_id, status, applied_at, approved_at, approved_by)
SELECT u.id, s.id, 'approved', NOW(), NOW(), u.id
FROM auth.users u
CROSS JOIN seminars s
WHERE u.email = 'global.information.academy@gmail.com'
ON CONFLICT (user_id, seminar_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
