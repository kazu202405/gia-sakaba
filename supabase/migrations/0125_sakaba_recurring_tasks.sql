-- くり返しタスク（2026-10-03）。
-- タスクに「くり返し」（毎週◯曜／毎月◯日／毎月末）を付けられる。
-- 「済」にした瞬間に、次の回のタスクを 1件だけ作る（タイトル・くり返し・担当は引き継ぎ、しめきりは次の日付、はじめる日は空）。
-- 「もどす」と、その回から作った次の回（まだ「まだ」のもの）を消す。二重に作らないよう、次の回は元のタスクの id を持つ（unique）。
-- 次のしめきりの決まり（lib/guild/recurrence.ts と同じ。直すときは両方）：
--   基準＝前の回のしめきり（無ければ済にした日。日本時間）
--   毎週◯曜＝基準より後で いちばん近い その曜日（基準がその曜日なら +7日）
--   毎月◯日＝翌月の◯日（その月に無い日は月末に寄せる）／毎月末＝翌月の末日
--   計算した日が きょうより前なら、きょう以降の最初の該当日まで進める（過去の分をためない）
-- 変える関数は、最新版（0081 / 0117）の本文を写して必要な行だけ足している。
-- 期限前日のプッシュ（sakaba_push_candidates）は due_date で拾うので触らない。

-- ---------- 1) 列 ----------

alter table sakaba.project_tasks
  add column if not exists recurrence_kind text,
  add column if not exists recurrence_day smallint,
  add column if not exists recurrence_source_id uuid references sakaba.project_tasks(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'project_tasks_recurrence_check') then
    alter table sakaba.project_tasks add constraint project_tasks_recurrence_check check (
      (recurrence_kind is null and recurrence_day is null)
      or (recurrence_kind = 'weekly' and recurrence_day between 1 and 7)   -- 1=月曜 … 7=日曜（isodow）
      or (recurrence_kind = 'monthly' and recurrence_day between 1 and 31)
      or (recurrence_kind = 'month_end' and recurrence_day is null)
    );
  end if;
end $$;

-- 1つの回から作る次の回は 1件だけ（二重に済にしても増えない）
create unique index if not exists project_tasks_recurrence_source_uidx
  on sakaba.project_tasks (recurrence_source_id)
  where recurrence_source_id is not null;

-- ---------- 2) 日付の計算 ----------

-- 基準日の「次の回」。p_today は日本時間のきょう。
create or replace function sakaba.recurrence_next_date(p_kind text, p_day int, p_base date, p_today date)
returns date
language plpgsql
immutable
as $$
declare
  v date;
  m date;
  v_last date;
begin
  if p_kind = 'weekly' then
    v := p_base + (((p_day - extract(isodow from p_base)::int + 6) % 7) + 1);
    if v < p_today then
      v := v + 7 * (((p_today - v) + 6) / 7);
    end if;
    return v;
  elsif p_kind in ('monthly', 'month_end') then
    m := (date_trunc('month', p_base::timestamp) + interval '1 month')::date;
    loop
      v_last := (m + interval '1 month' - interval '1 day')::date;
      if p_kind = 'month_end' then
        v := v_last;
      else
        v := least(m + (p_day - 1), v_last);
      end if;
      exit when v >= p_today;
      m := (m + interval '1 month')::date;
    end loop;
    return v;
  end if;
  raise exception 'invalid recurrence' using errcode = '22023';
end;
$$;

-- きょう以降で 最初の該当日（くり返しを付けたとき しめきりが空の場合に入れる日）
create or replace function sakaba.recurrence_first_date(p_kind text, p_day int, p_today date)
returns date
language sql
immutable
as $$
  select sakaba.recurrence_next_date(
    p_kind, p_day,
    case when p_kind = 'weekly' then p_today - 1
         else (date_trunc('month', p_today::timestamp)::date - 1) end,
    p_today);
$$;

revoke all on function sakaba.recurrence_next_date(text, int, date, date) from public;
revoke all on function sakaba.recurrence_first_date(text, int, date) from public;

-- ---------- 3) 一覧（0081 の本文に、くり返しの2列だけ足す） ----------

create or replace function public.sakaba_list_my_projects(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_result jsonb;
begin
  select id into v_guild_id from sakaba.guilds where lower(slug) = lower(btrim(p_guild_slug));
  if v_user_id is null or v_guild_id is null or not sakaba.is_active_member(v_guild_id, v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(project_json order by created_at desc), '[]'::jsonb) into v_result
  from (
    select p.created_at,
      jsonb_build_object(
        'id', p.id, 'owner_id', p.owner_id, 'title', p.title,
        'goal', p.goal, 'memo', p.memo, 'source_quest_id', p.source_quest_id,
        'status', p.status, 'start_date', p.start_date, 'due_date', p.due_date,
        'created_at', p.created_at, 'done_at', p.done_at,
        'member_ids', coalesce((
          select jsonb_agg(pm.user_id order by pm.joined_at)
          from sakaba.project_members pm where pm.project_id = p.id
        ), '[]'::jsonb),
        'tasks', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', t.id, 'project_id', t.project_id, 'title', t.title,
            'status', t.status, 'assignee_id', t.assignee_id,
            'start_date', t.start_date, 'due_date', t.due_date,
            'sort_order', t.sort_order, 'done_at', t.done_at,
            'recurrence_kind', t.recurrence_kind, 'recurrence_day', t.recurrence_day
          ) order by t.sort_order, t.created_at)
          from sakaba.project_tasks t where t.project_id = p.id
        ), '[]'::jsonb)
      ) as project_json
    from sakaba.projects p
    where p.guild_id = v_guild_id
      and (p.owner_id = v_user_id or exists (
        select 1 from sakaba.project_members pm
        where pm.project_id = p.id and pm.user_id = v_user_id
      ))
  ) visible_projects;
  return v_result;
end;
$$;

-- ---------- 4) 済／もどす（0081 の本文から。次の回の作成と取り消しを足す） ----------

create or replace function public.sakaba_set_project_task_status(p_task_id uuid, p_status text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare
  v_user_id uuid := auth.uid();
  v_old text;
  v_task sakaba.project_tasks%rowtype;
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
begin
  if p_status not in ('todo', 'done') then
    raise exception 'invalid task status' using errcode = '22023';
  end if;
  -- 同じタスクの 2度押し・同時操作で 次の回が重ならないよう、行をつかんでから進める
  select t.status into v_old
  from sakaba.project_tasks t
  join sakaba.projects p on p.id = t.project_id
  where t.id = p_task_id and p.owner_id = v_user_id
    and p.status = 'active' and sakaba.is_active_member(p.guild_id, v_user_id)
  for update of t;
  if not found then raise exception 'task not found or access denied' using errcode = '42501'; end if;

  update sakaba.project_tasks t set status = p_status,
    done_at = case when p_status = 'done' then coalesce(t.done_at, now()) else null end,
    updated_at = now()
  where t.id = p_task_id
  returning t.* into v_task;

  if p_status = 'done' and v_old <> 'done' and v_task.recurrence_kind is not null then
    -- 次の回は 1件だけ（recurrence_source_id が unique。もう作ってあれば何もしない）
    insert into sakaba.project_tasks (
      project_id, title, assignee_id, start_date, due_date, sort_order,
      recurrence_kind, recurrence_day, recurrence_source_id
    )
    select v_task.project_id, v_task.title, v_task.assignee_id, null,
      sakaba.recurrence_next_date(
        v_task.recurrence_kind, v_task.recurrence_day::int,
        coalesce(v_task.due_date, v_today), v_today),
      coalesce((select max(t2.sort_order) + 1 from sakaba.project_tasks t2 where t2.project_id = v_task.project_id), 0),
      v_task.recurrence_kind, v_task.recurrence_day, v_task.id
    on conflict (recurrence_source_id) where recurrence_source_id is not null do nothing;
  elsif p_status = 'todo' and v_old = 'done' then
    -- もどしたら、その回から作った次の回を消す（まだ「まだ」のときだけ。済になっていたら残す）
    delete from sakaba.project_tasks n
    where n.recurrence_source_id = p_task_id and n.status = 'todo';
  end if;
end;
$$;

-- ---------- 5) なおす（0117 の本文から。くり返しの2つを足す） ----------

drop function if exists public.sakaba_update_project_task(uuid, text, date);

create or replace function public.sakaba_update_project_task(
  p_task_id uuid, p_title text, p_due_date date,
  p_recurrence_kind text default null, p_recurrence_day int default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_start date;
  v_due date := p_due_date;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 100 then
    raise exception 'invalid task fields' using errcode = '22023';
  end if;
  -- くり返しの種類と日にちの組み合わせ（表の制約 project_tasks_recurrence_check と同じ）
  if not (
    (p_recurrence_kind is null and p_recurrence_day is null)
    or (p_recurrence_kind = 'weekly' and p_recurrence_day between 1 and 7)
    or (p_recurrence_kind = 'monthly' and p_recurrence_day between 1 and 31)
    or (p_recurrence_kind = 'month_end' and p_recurrence_day is null)
  ) then
    raise exception 'invalid recurrence' using errcode = '22023';
  end if;

  select t.start_date into v_start
  from sakaba.project_tasks t
  join sakaba.projects p on p.id = t.project_id
  where t.id = p_task_id and p.owner_id = v_user_id
    and p.status = 'active' and sakaba.is_active_member(p.guild_id, v_user_id);
  if not found then
    raise exception 'task not found or access denied' using errcode = '42501';
  end if;
  -- くり返しを付けるのにしめきりが空なら、きょう以降の最初の該当日を入れる
  if p_recurrence_kind is not null and v_due is null then
    v_due := sakaba.recurrence_first_date(p_recurrence_kind, p_recurrence_day, (now() at time zone 'Asia/Tokyo')::date);
  end if;
  -- はじめる日より前のしめきりは入れられない（表の制約 project_tasks_date_order と同じ）
  if v_due is not null and v_start is not null and v_due < v_start then
    raise exception 'invalid task fields' using errcode = '22023';
  end if;

  update sakaba.project_tasks
  set title = btrim(p_title), due_date = v_due,
    recurrence_kind = p_recurrence_kind, recurrence_day = p_recurrence_day::smallint,
    updated_at = now()
  where id = p_task_id;
end;
$$;

revoke all on function public.sakaba_update_project_task(uuid, text, date, text, int) from public;
revoke all on function public.sakaba_update_project_task(uuid, text, date, text, int) from anon;
grant execute on function public.sakaba_update_project_task(uuid, text, date, text, int) to authenticated;

notify pgrst, 'reload schema';
