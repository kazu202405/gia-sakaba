-- 0057_ai_clone_person_merge_delete_fn.sql
--
-- 右腕AI から自然文で人物の「重複統合」「削除」を行うための関数。
-- 0040（山崎誠の使い切り統合）と同じリンク移動を、テナント/IDを引数にした
-- 再利用可能な関数として定義する。1トランザクションなので途中失敗で巻き戻る。
--
-- 移動/削除対象のリンク：
--   ai_clone_person_note / _photo / _projects / _conversation_logs /
--   _activity_logs / _expenses / _tasks / _decision_logs /
--   referred_by_person_id（紹介元FK） / ai_clone_decision_case.related_person_ids[] /
--   ai_clone_meeting_persons（旧）
--   ※ ai_clone_dated_reminder.person_id は ON DELETE SET NULL のため delete 時は自動。

-- --- 統合：remove のリンクを keep に寄せて remove を削除 ---------------------
create or replace function ai_clone_merge_person(
  p_tenant uuid,
  p_keep uuid,
  p_remove uuid
) returns void
language plpgsql
security definer
as $$
begin
  if p_keep = p_remove then
    raise exception '統合元と統合先が同じ人物です';
  end if;
  -- 両者が同テナントに存在することを確認（誤統合防止）
  if not exists (select 1 from ai_clone_person where id = p_keep and tenant_id = p_tenant) then
    raise exception '統合先の人物が見つかりません';
  end if;
  if not exists (select 1 from ai_clone_person where id = p_remove and tenant_id = p_tenant) then
    raise exception '統合元の人物が見つかりません';
  end if;

  -- 単純付け替え（複合PKなし）
  update ai_clone_person_note set person_id = p_keep where person_id = p_remove;
  update ai_clone_person_photo set person_id = p_keep where person_id = p_remove;

  -- 複合PKの各リンク：keep が未保有のものだけ付け替え→残りは削除
  update ai_clone_person_projects t set person_id = p_keep
    where t.person_id = p_remove and not exists (
      select 1 from ai_clone_person_projects k
      where k.person_id = p_keep and k.project_id = t.project_id);
  delete from ai_clone_person_projects where person_id = p_remove;

  update ai_clone_person_conversation_logs t set person_id = p_keep
    where t.person_id = p_remove and not exists (
      select 1 from ai_clone_person_conversation_logs k
      where k.person_id = p_keep and k.conversation_log_id = t.conversation_log_id);
  delete from ai_clone_person_conversation_logs where person_id = p_remove;

  update ai_clone_person_activity_logs t set person_id = p_keep
    where t.person_id = p_remove and not exists (
      select 1 from ai_clone_person_activity_logs k
      where k.person_id = p_keep and k.activity_log_id = t.activity_log_id);
  delete from ai_clone_person_activity_logs where person_id = p_remove;

  update ai_clone_person_expenses t set person_id = p_keep
    where t.person_id = p_remove and not exists (
      select 1 from ai_clone_person_expenses k
      where k.person_id = p_keep and k.expense_id = t.expense_id);
  delete from ai_clone_person_expenses where person_id = p_remove;

  update ai_clone_person_tasks t set person_id = p_keep
    where t.person_id = p_remove and not exists (
      select 1 from ai_clone_person_tasks k
      where k.person_id = p_keep and k.task_id = t.task_id);
  delete from ai_clone_person_tasks where person_id = p_remove;

  update ai_clone_person_decision_logs t set person_id = p_keep
    where t.person_id = p_remove and not exists (
      select 1 from ai_clone_person_decision_logs k
      where k.person_id = p_keep and k.decision_log_id = t.decision_log_id);
  delete from ai_clone_person_decision_logs where person_id = p_remove;

  -- 旧 meeting リンク（存在すれば）
  update ai_clone_meeting_persons t set person_id = p_keep
    where t.person_id = p_remove and not exists (
      select 1 from ai_clone_meeting_persons k
      where k.person_id = p_keep and k.meeting_id = t.meeting_id);
  delete from ai_clone_meeting_persons where person_id = p_remove;

  -- 紹介元FK：remove を紹介元にしている人物を keep に付け替え
  update ai_clone_person set referred_by_person_id = p_keep
    where tenant_id = p_tenant and referred_by_person_id = p_remove;

  -- 判断事例の関連人物配列：remove を keep に置換
  update ai_clone_decision_case
    set related_person_ids = array_replace(related_person_ids, p_remove, p_keep)
    where tenant_id = p_tenant and p_remove = any(related_person_ids);

  -- 統合元を削除
  delete from ai_clone_person where id = p_remove and tenant_id = p_tenant;
end $$;

-- --- 削除：人物とそのリンクを消す（dated_reminder は SET NULL で自動） ---------
create or replace function ai_clone_delete_person(
  p_tenant uuid,
  p_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from ai_clone_person where id = p_id and tenant_id = p_tenant) then
    raise exception '人物が見つかりません';
  end if;

  delete from ai_clone_person_note where person_id = p_id;
  delete from ai_clone_person_photo where person_id = p_id;
  delete from ai_clone_person_projects where person_id = p_id;
  delete from ai_clone_person_conversation_logs where person_id = p_id;
  delete from ai_clone_person_activity_logs where person_id = p_id;
  delete from ai_clone_person_expenses where person_id = p_id;
  delete from ai_clone_person_tasks where person_id = p_id;
  delete from ai_clone_person_decision_logs where person_id = p_id;
  delete from ai_clone_meeting_persons where person_id = p_id;

  -- 紹介元にしている人物は紹介元を空に
  update ai_clone_person set referred_by_person_id = null
    where tenant_id = p_tenant and referred_by_person_id = p_id;
  -- 判断事例の関連人物配列から除去
  update ai_clone_decision_case
    set related_person_ids = array_remove(related_person_ids, p_id)
    where tenant_id = p_tenant and p_id = any(related_person_ids);

  delete from ai_clone_person where id = p_id and tenant_id = p_tenant;
end $$;
