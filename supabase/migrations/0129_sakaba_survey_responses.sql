-- 0129: 酒場の事前アンケート（/guild/survey）の回答表と、ログインなしで送るRPC。
-- 仕様：contexts/projects/gia/sakaba_survey_spec.md
-- 本番のSQL Editorで流すのは五島さん（0128の次。0130は別の作業が使う）。
--
-- 守り
--  1. 表は直接読み書きさせない（RLSを有効にし、ポリシーなし。anon/authenticatedの権限も外す）。書き込みはRPC 1本だけ
--  2. 上書きの目印は名前ではなく回答ID（response_token）。初回は新しい行を作って token を返し、
--     同じ端末が token を付けて送り直したときだけ、その行を更新する（同名の別人は別の行に残る）
--  3. 全体で1分あたり30件まで（超えたら survey_rate_limited）
--  4. 見えない入力欄（p_trap）に何か入っていたら、保存せず成功と同じ返事を返す（機械による送信よけ）

begin;

create table if not exists sakaba.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_key text not null check (survey_key ~ '^[a-z0-9_]{1,40}$'),
  display_name text not null check (char_length(display_name) between 1 and 30),
  -- 月いくらまでなら入るか（月額の会費・円）。0＝入らない
  max_monthly_price_yen integer not null check (max_monthly_price_yen between 0 and 1000000),
  wish_text text not null default '' check (char_length(wish_text) <= 300),
  -- 送り直しの目印（推測できない乱数）。表は直接読めないので平文で持つ
  response_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists survey_responses_recent
  on sakaba.survey_responses (updated_at);

alter table sakaba.survey_responses enable row level security;
revoke all on sakaba.survey_responses from public, anon, authenticated;

create or replace function public.sakaba_submit_survey(
  p_survey_key text,
  p_display_name text,
  p_max_monthly_price_yen integer,
  p_wish_text text default '',
  p_trap text default '',
  p_response_token uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_name text := btrim(coalesce(p_display_name, ''));
  v_wish text := btrim(coalesce(p_wish_text, ''));
  v_recent integer;
  v_token uuid;
begin
  -- 機械による送信よけ：保存はしないが、見た目は成功と同じにする
  if btrim(coalesce(p_trap, '')) <> '' then
    return jsonb_build_object('ok', true);
  end if;

  if p_survey_key is null or p_survey_key !~ '^[a-z0-9_]{1,40}$'
     or char_length(v_name) not between 1 and 30
     or p_max_monthly_price_yen is null
     or p_max_monthly_price_yen not between 0 and 1000000
     or char_length(v_wish) > 300 then
    raise exception 'survey_invalid_input' using errcode = '22023';
  end if;

  -- 同時に来ても上限を数え間違えないよう、1本ずつ通す
  perform pg_advisory_xact_lock(hashtext('sakaba_submit_survey'));

  select count(*) into v_recent
  from sakaba.survey_responses
  where updated_at > now() - interval '1 minute';
  if v_recent >= 30 then
    raise exception 'survey_rate_limited' using errcode = '54000';
  end if;

  -- token が一致する行だけ更新する。一致しない・無いときは新しい行（token は常にサーバーが作る）
  if p_response_token is not null then
    update sakaba.survey_responses
       set display_name = v_name,
           max_monthly_price_yen = p_max_monthly_price_yen,
           wish_text = v_wish,
           updated_at = now()
     where response_token = p_response_token and survey_key = p_survey_key
    returning response_token into v_token;
  end if;

  if v_token is null then
    insert into sakaba.survey_responses (survey_key, display_name, max_monthly_price_yen, wish_text)
    values (p_survey_key, v_name, p_max_monthly_price_yen, v_wish)
    returning response_token into v_token;
  end if;

  return jsonb_build_object('ok', true, 'response_token', v_token);
end;
$$;

revoke all on function public.sakaba_submit_survey(text, text, integer, text, text, uuid) from public;
grant execute on function public.sakaba_submit_survey(text, text, integer, text, text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- ----------------------------------------------------------------------------
-- 数え方（SQL Editorで五島さん／秘書が実行。管理画面は作らない）
-- 「月いくらまで」で答えてもらうので、上の値段を選んだ人は下の値段でも入る人として数える。
-- 0（入らない）は数えない。lib/guild/survey.ts の countJoiners と同じ意味。
--
--   select p.price_yen,
--          count(r.id) filter (where r.max_monthly_price_yen >= p.price_yen) as joiners
--   from (values (3000), (5000), (10000), (15000)) as p(price_yen)
--   left join sakaba.survey_responses r
--     on r.survey_key = 'community_2026_10' and r.max_monthly_price_yen > 0
--   group by p.price_yen order by p.price_yen;
--
-- 回答を読む：
--   select display_name, max_monthly_price_yen, wish_text, created_at, updated_at
--   from sakaba.survey_responses where survey_key = 'community_2026_10' order by created_at;
-- ----------------------------------------------------------------------------
