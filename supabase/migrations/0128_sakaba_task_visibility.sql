-- 表示開始の設定。0125適用後にSQL Editorで実行。
begin;
alter table sakaba.project_tasks add column if not exists show_before_days smallint
  check (show_before_days between 0 and 365);

-- 一覧の権限は既存RPCで判定し、見えるタスクの設定だけ返す。
create or replace function public.sakaba_list_task_visibility(p_guild_slug text default 'gia')
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, sakaba as $$
declare v_projects jsonb; v_result jsonb;
begin
  v_projects := public.sakaba_list_my_projects(p_guild_slug);
  select coalesce(jsonb_object_agg(t.id::text, t.show_before_days), '{}'::jsonb) into v_result
  from sakaba.project_tasks t
  where t.project_id in (select (p->>'id')::uuid from jsonb_array_elements(v_projects) p);
  return v_result;
end;
$$;

-- 既存の更新関数を残し、新しい画面だけが使うRPCを追加する。
create or replace function public.sakaba_update_project_task_visibility(
  p_task_id uuid, p_title text, p_due_date date,
  p_recurrence_kind text, p_recurrence_day int, p_show_before_days int
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
begin
  if p_show_before_days is not null and (p_show_before_days < 0 or p_show_before_days > 365) then
    raise exception 'invalid visibility days' using errcode = '22023';
  end if;
  if p_recurrence_kind is null and p_recurrence_day is not null then
    raise exception 'invalid recurrence' using errcode = '22023';
  end if;
  if p_recurrence_kind is not null and not coalesce(
    (p_recurrence_kind = 'weekly' and p_recurrence_day between 1 and 7)
    or (p_recurrence_kind = 'monthly' and p_recurrence_day between 1 and 31)
    or (p_recurrence_kind = 'month_end' and p_recurrence_day is null), false) then
    raise exception 'invalid recurrence' using errcode = '22023';
  end if;
  -- 完了による次回作成と同時実行されても、設定が食い違わないようにロック。
  perform 1 from sakaba.project_tasks t join sakaba.projects p on p.id = t.project_id
  where t.id = p_task_id and p.owner_id = auth.uid() and p.status = 'active'
    and sakaba.is_active_member(p.guild_id, auth.uid()) for update of t;
  if not found then raise exception 'task not found or access denied' using errcode = '42501'; end if;
  perform public.sakaba_update_project_task(p_task_id, p_title, p_due_date, p_recurrence_kind, p_recurrence_day);
  update sakaba.project_tasks set show_before_days = case when p_recurrence_kind is null then null else p_show_before_days end
  where id = p_task_id;
end;
$$;

-- 次回が作られるたびに設定を引き継ぐ（既存の完了・取り消し処理はそのまま）。
create or replace function sakaba.inherit_task_visibility()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
begin
  if new.recurrence_source_id is not null then
    select t.show_before_days into new.show_before_days from sakaba.project_tasks t
    where t.id = new.recurrence_source_id and t.project_id = new.project_id;
  end if;
  return new;
end;
$$;
drop trigger if exists project_tasks_inherit_visibility on sakaba.project_tasks;
create trigger project_tasks_inherit_visibility before insert on sakaba.project_tasks
for each row execute function sakaba.inherit_task_visibility();
revoke all on function sakaba.inherit_task_visibility() from public, anon, authenticated;
revoke all on function public.sakaba_list_task_visibility(text) from public, anon;
revoke all on function public.sakaba_update_project_task_visibility(uuid,text,date,text,int,int) from public, anon;
grant execute on function public.sakaba_list_task_visibility(text) to authenticated;
grant execute on function public.sakaba_update_project_task_visibility(uuid,text,date,text,int,int) to authenticated;
notify pgrst, 'reload schema';
commit;
