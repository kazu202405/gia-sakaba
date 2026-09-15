-- 0040_merge_yamazaki_makoto_dup.sql
--
-- 1 回限りのデータ修正。全角/半角スペースの不一致で重複作成された
-- 「山崎誠」を 1 レコードに統合する。
--
-- 前提：migration 0039（name_normalized）適用後に実行すること。
--
-- 安全策：
--   * goshima テナントに限定。
--   * name_normalized='山崎誠' が「ちょうど 2 件」でなければ RAISE EXCEPTION で中断
--     （同姓同名の別人を誤って統合しないため）。
--   * 古い方（created_at 最小）を残し、新しい方の全リンクを寄せてから削除。
--   * 全処理を 1 トランザクション。途中失敗で一切変更されない。
--
-- 移動対象のリンク：
--   ai_clone_person_note / _projects / _conversation_logs / _activity_logs /
--   _expenses / _tasks / _decision_logs / referred_by_person_id /
--   ai_clone_decision_case.related_person_ids[]

do $$
declare
  v_tenant_id uuid;
  v_keep_id uuid;
  v_remove_id uuid;
  v_keep_name text;
  v_remove_name text;
  v_count int;
begin
  select id into v_tenant_id from ai_clone_tenants where slug = 'goshima';
  if v_tenant_id is null then
    raise exception '[0040] goshima テナントが見つかりません';
  end if;

  select count(*) into v_count
  from ai_clone_person
  where tenant_id = v_tenant_id and name_normalized = '山崎誠';

  if v_count <> 2 then
    raise exception '[0040] 山崎誠 が % 件（2件想定）。誤統合防止のため中断します。', v_count;
  end if;

  -- 古い方を残す
  select id, name into v_keep_id, v_keep_name
  from ai_clone_person
  where tenant_id = v_tenant_id and name_normalized = '山崎誠'
  order by created_at asc
  limit 1;

  -- 新しい方を消す（リンクは keep へ移す）
  select id, name into v_remove_id, v_remove_name
  from ai_clone_person
  where tenant_id = v_tenant_id and name_normalized = '山崎誠'
  order by created_at desc
  limit 1;

  raise notice '[0040] keep=% (%), remove=% (%)',
    v_keep_name, v_keep_id, v_remove_name, v_remove_id;

  -- person_note（複合PKなし、person_id を付け替えるだけ）
  update ai_clone_person_note
  set person_id = v_keep_id
  where person_id = v_remove_id;

  -- 複合PKの各リンクテーブル：keep が未保有のものだけ付け替え→残りは削除
  update ai_clone_person_projects t set person_id = v_keep_id
  where t.person_id = v_remove_id
    and not exists (select 1 from ai_clone_person_projects k
                    where k.person_id = v_keep_id and k.project_id = t.project_id);
  delete from ai_clone_person_projects where person_id = v_remove_id;

  update ai_clone_person_conversation_logs t set person_id = v_keep_id
  where t.person_id = v_remove_id
    and not exists (select 1 from ai_clone_person_conversation_logs k
                    where k.person_id = v_keep_id and k.conversation_log_id = t.conversation_log_id);
  delete from ai_clone_person_conversation_logs where person_id = v_remove_id;

  update ai_clone_person_activity_logs t set person_id = v_keep_id
  where t.person_id = v_remove_id
    and not exists (select 1 from ai_clone_person_activity_logs k
                    where k.person_id = v_keep_id and k.activity_log_id = t.activity_log_id);
  delete from ai_clone_person_activity_logs where person_id = v_remove_id;

  update ai_clone_person_expenses t set person_id = v_keep_id
  where t.person_id = v_remove_id
    and not exists (select 1 from ai_clone_person_expenses k
                    where k.person_id = v_keep_id and k.expense_id = t.expense_id);
  delete from ai_clone_person_expenses where person_id = v_remove_id;

  update ai_clone_person_tasks t set person_id = v_keep_id
  where t.person_id = v_remove_id
    and not exists (select 1 from ai_clone_person_tasks k
                    where k.person_id = v_keep_id and k.task_id = t.task_id);
  delete from ai_clone_person_tasks where person_id = v_remove_id;

  update ai_clone_person_decision_logs t set person_id = v_keep_id
  where t.person_id = v_remove_id
    and not exists (select 1 from ai_clone_person_decision_logs k
                    where k.person_id = v_keep_id and k.decision_log_id = t.decision_log_id);
  delete from ai_clone_person_decision_logs where person_id = v_remove_id;

  -- 紹介元 FK（remove を紹介元にしている人物を keep に付け替え）
  update ai_clone_person
  set referred_by_person_id = v_keep_id
  where tenant_id = v_tenant_id and referred_by_person_id = v_remove_id;

  -- 判断事例の関連人物配列（remove を keep に置換。keep が既に居れば重複しうるが許容）
  update ai_clone_decision_case
  set related_person_ids = array_replace(related_person_ids, v_remove_id, v_keep_id)
  where tenant_id = v_tenant_id and v_remove_id = any(related_person_ids);

  -- 重複レコード削除
  delete from ai_clone_person where id = v_remove_id;

  raise notice '[0040] 統合完了。山崎誠 を 1 レコード（%）に集約しました。', v_keep_id;
end $$;
