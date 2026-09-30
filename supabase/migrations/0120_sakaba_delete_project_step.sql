-- 手順（列）の削除：その列に記録した日付・結果も一緒に消える（project_step_records は step への on delete cascade）
-- 手順を1つも無くすと「はじめる」画面に戻ってしまうので、最後の1つは消せない
create or replace function public.sakaba_delete_project_step(p_step_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, sakaba as $$
declare v_user_id uuid := auth.uid(); v_project_id uuid;
begin
  select s.project_id into v_project_id
  from sakaba.project_steps s
  join sakaba.projects p on p.id = s.project_id
  where s.id = p_step_id and p.owner_id = v_user_id
    and p.status = 'active' and sakaba.is_active_member(p.guild_id, v_user_id)
  for update of p;
  if v_project_id is null then raise exception 'step not found or access denied' using errcode = '42501'; end if;
  if (select count(*) from sakaba.project_steps where project_id = v_project_id) <= 1 then
    raise exception 'last step cannot be deleted' using errcode = '22023';
  end if;
  delete from sakaba.project_steps where id = p_step_id;
end;
$$;

revoke all on function public.sakaba_delete_project_step(uuid) from public;
grant execute on function public.sakaba_delete_project_step(uuid) to authenticated;

notify pgrst, 'reload schema';
