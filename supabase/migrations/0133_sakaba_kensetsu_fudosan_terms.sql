-- 建設・不動産の酒場の呼び名（guilds.terms）を、五島さんが決めた言葉に直す（2026-10-24）。
-- 0132 では仮の言葉（仲間・案件・探しもの・マスター）で入れていた。
--   メンバー／案件／チーム／管理者／プロフィール
-- ・GIAの酒場（slug gia）の呼び名は変えない
-- ・コード側の店設定（lib/guild/stores.ts）の terms と食い違わないよう、lib/guild/stores.test.ts がこのファイルを読んで照合する。
--   直すときは両方を一緒に
-- ・SQL Editor で do $$ … $$ が通らなかったことがある（10-24・0132 の owner 付与）ので、1文の update にした。
--   返ってくる行が1行なら成功。0行なら店の行が無い（0132 を先に適用）

update sakaba.guilds
set terms = '{"member":"メンバー","quest":"案件","party":"チーム","master":"管理者","status":"プロフィール"}'::jsonb
where slug = 'kensetsu-fudosan'
returning slug, terms;

notify pgrst, 'reload schema';
