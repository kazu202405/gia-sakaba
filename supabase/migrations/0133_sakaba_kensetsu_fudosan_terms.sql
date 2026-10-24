-- 建設・不動産の酒場の呼び名（guilds.terms）を、五島さんが決めた言葉に直す（2026-10-24）。
-- 0132 では仮の言葉（仲間・案件・探しもの・マスター）で入れていた。
--   メンバー／案件／チーム／管理者／プロフィール
-- ・GIAの酒場（slug gia）の呼び名は変えない
-- ・コード側の店設定（lib/guild/stores.ts）の terms と食い違わないよう、lib/guild/stores.test.ts がこのファイルを読んで照合する。
--   直すときは両方を一緒に
-- ・店の行が無い（0132 が未適用）ときは、黙って 0 行更新にせず止める

do $$
declare
  updated_count integer;
begin
  update sakaba.guilds
  set terms = '{"member":"メンバー","quest":"案件","party":"チーム","master":"管理者","status":"プロフィール"}'::jsonb
  where slug = 'kensetsu-fudosan';
  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'kensetsu-fudosan の店の行が見つかりません（0132 を先に適用してください）: % 行', updated_count;
  end if;
end;
$$;

notify pgrst, 'reload schema';
