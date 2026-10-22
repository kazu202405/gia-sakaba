-- 酒場の2店目「建設・不動産の酒場」の店の行を足す（2026-10-22 五島さん決定）。
-- 仕様：contexts/projects/gia/sakaba_multi_store_spec.md
--
-- ・ここで入れるのは店の行（slug・名前・呼び名 terms）だけ。
--   owner（五島さん）の付与は、本番の auth.users の id を見て別のSQLで行う（migration には入れない）
-- ・コード側の店設定（lib/guild/stores.ts）の slug・名前・terms と食い違わないよう、
--   lib/guild/stores.test.ts がこのファイルを読んで照合している。直すときは両方を一緒に
-- ・呼び名は仮。五島さんが実画面を見て直す前提（直すときは update で terms を差し替え、stores.ts も同じにする）
-- ・店を作る画面は作らない（2号店以降はこの形で行を足す）

insert into sakaba.guilds (id, slug, name, terms)
values (
  '00000000-0000-4000-8000-000000000002',
  'kensetsu-fudosan',
  '建設・不動産の酒場',
  '{"member":"仲間","quest":"案件・探しもの","party":"チーム","master":"マスター","status":"プロフィール"}'::jsonb
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
