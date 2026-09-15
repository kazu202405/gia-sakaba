-- ===================================================================
-- 0075: 社長インタビュー公開ページ用の公開フラグ + 公開ビュー
-- 作成: 2026-07-08
--
-- 目的:
--   会員社長ごとに「ログイン不要で誰でも読める公開ページ」（/members/<id>）を
--   1URL 持たせる（紹介・採用支援の外向きの顔）。
--   詳細設計: contexts/projects/gia/network_app.md「社長インタビュー公開ページ」節。
--
-- 追加カラム（いずれも applicants）:
--   - profile_published boolean not null default false
--       公開 ON/OFF。**デフォルト非公開**。本人が公開を選んで初めて外に出る。
--   - name_public       boolean not null default false
--       実名（name）を公開面に出してよいか。**デフォルト非公開（opt-in）**。
--       OFF の間は公開ビューが name を NULL で返す（＝多層防御。アプリにバグが
--       あっても実名は漏れない）。表向きの呼称は nickname を使う。
--
-- 既存トリガとの関係（重要）:
--   0018 の guard_applicants_privileged_columns は tier / stripe_* / referrer_id /
--   admin_notes のみをブロックする。profile_published / name_public はブロック
--   対象外なので、本人（authenticated）が自分の行を直接／API 経由で UPDATE して
--   公開 ON/OFF を切り替えられる（＝本人が自分で公開できる）。追加対応は不要。
--
-- 公開ビュー public_member_profiles:
--   member_profiles（0059/0069・authenticated 限定）と同じ「通常ビュー＝owner 権限で
--   評価され applicants の RLS をバイパス」方式。ただし公開面なので:
--     * WHERE profile_published = true で published のみに限定
--     * GRANT SELECT を anon にも付与（ログイン不要で読める）
--     * 公開してよい列だけを射影（email / stripe_* / admin_notes / referrer_id /
--       tier / plan / favorites 等の相互開示ゲート項目・人柄系は含めない）
--     * name は name_public = true のときだけ実値、それ以外は NULL（CASE で焼き込む）
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor → 全コピペ → Run
-- ===================================================================

alter table applicants
  add column if not exists profile_published boolean not null default false;

alter table applicants
  add column if not exists name_public boolean not null default false;

-- 公開ページ用ビュー（anon 読み取り可・published のみ・公開列だけ）
create or replace view public_member_profiles as
select
  a.id,
  -- 実名は opt-in。name_public=false の間は絶対に返さない（多層防御）。
  case when a.name_public then a.name else null end as name,
  a.name_public,
  a.nickname,
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
  a.contact_line,
  a.contact_instagram,
  a.contact_website,
  a.member_no
from applicants a
where a.profile_published = true;

grant select on public_member_profiles to anon, authenticated;

notify pgrst, 'reload schema';

-- ===================================================================
-- ✅ 完了。
-- 確認:
--   1) 未ログイン（anon）で
--      SELECT * FROM public_member_profiles WHERE id = '<published_user_id>';
--      が 1 行返り、profile_published=false の会員は 0 行になること。
--   2) name_public=false の会員は name 列が NULL で返ること（nickname は返る）。
--   3) email / stripe_* / admin_notes / referrer_id / tier が列に無いこと。
--   4) 本人（authenticated）が自分の行で
--      UPDATE applicants SET profile_published=true, name_public=true WHERE id=auth.uid();
--      が通ること（0018 ガードにブロックされない）。
-- ===================================================================
