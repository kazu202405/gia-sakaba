// AI Clone の Hub 相互リンク用 Server Action 集約。
//
// 対応するリンクテーブル（migration 0013）:
//   人物 ⇄ 案件 / 会話ログ / 活動ログ / 経費 / タスク / 判断履歴
//   案件 ⇄ 人物 / サービス
//   サービス ⇄ 案件
//
// 注意:
//   リンクテーブル自体には RLS が無く tenant_id 列も無い。
//   ここで left/right 両方の所有テナントを明示的に検証してから insert する
//   （migration 0013 の RLS 方針メモ参照）。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

interface LinkConfig {
  slug: string;
  tenantId: string;
  leftId: string;
  rightId: string;
  leftTable: string;
  rightTable: string;
  linkTable: string;
  leftColumn: string;
  rightColumn: string;
  revalidate: string[]; // revalidate するパス（左右の詳細ページ）
}

// 共通 link/unlink 実装。両側のテナント所有を確認してから操作する。
async function doLink(cfg: LinkConfig): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  // 左右両方が同テナントに属することを確認（防御的二重チェック）
  const [leftRes, rightRes] = await Promise.all([
    supabase
      .from(cfg.leftTable)
      .select("id")
      .eq("id", cfg.leftId)
      .eq("tenant_id", cfg.tenantId)
      .maybeSingle(),
    supabase
      .from(cfg.rightTable)
      .select("id")
      .eq("id", cfg.rightId)
      .eq("tenant_id", cfg.tenantId)
      .maybeSingle(),
  ]);
  if (!leftRes.data || !rightRes.data) {
    return { ok: false, error: "対象が見つかりません" };
  }

  const { error } = await supabase.from(cfg.linkTable).insert({
    [cfg.leftColumn]: cfg.leftId,
    [cfg.rightColumn]: cfg.rightId,
  });

  // 既に紐付いていた場合（PK重複）は ok 扱い
  if (error && !/duplicate key|already exists/i.test(error.message)) {
    return { ok: false, error: `紐付けに失敗しました：${error.message}` };
  }

  for (const p of cfg.revalidate) revalidatePath(p);
  return { ok: true };
}

async function doUnlink(cfg: LinkConfig): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  // tenant 所有確認（unlink でも同じく防御）
  const [leftRes, rightRes] = await Promise.all([
    supabase
      .from(cfg.leftTable)
      .select("id")
      .eq("id", cfg.leftId)
      .eq("tenant_id", cfg.tenantId)
      .maybeSingle(),
    supabase
      .from(cfg.rightTable)
      .select("id")
      .eq("id", cfg.rightId)
      .eq("tenant_id", cfg.tenantId)
      .maybeSingle(),
  ]);
  if (!leftRes.data || !rightRes.data) {
    return { ok: false, error: "対象が見つかりません" };
  }

  const { error } = await supabase
    .from(cfg.linkTable)
    .delete()
    .eq(cfg.leftColumn, cfg.leftId)
    .eq(cfg.rightColumn, cfg.rightId);

  if (error) {
    return { ok: false, error: `解除に失敗しました：${error.message}` };
  }

  for (const p of cfg.revalidate) revalidatePath(p);
  return { ok: true };
}

// ============================================================
// 人物 ⇄ 案件
// ============================================================
export async function linkPersonProject(
  slug: string,
  tenantId: string,
  personId: string,
  projectId: string,
): Promise<Result> {
  return doLink({
    slug,
    tenantId,
    leftId: personId,
    rightId: projectId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_project",
    linkTable: "ai_clone_person_projects",
    leftColumn: "person_id",
    rightColumn: "project_id",
    revalidate: [
      `/clone/${slug}/people/${personId}`,
      `/clone/${slug}/projects/${projectId}`,
    ],
  });
}

export async function unlinkPersonProject(
  slug: string,
  tenantId: string,
  personId: string,
  projectId: string,
): Promise<Result> {
  return doUnlink({
    slug,
    tenantId,
    leftId: personId,
    rightId: projectId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_project",
    linkTable: "ai_clone_person_projects",
    leftColumn: "person_id",
    rightColumn: "project_id",
    revalidate: [
      `/clone/${slug}/people/${personId}`,
      `/clone/${slug}/projects/${projectId}`,
    ],
  });
}

// ============================================================
// 人物 ⇄ 会話ログ
// ============================================================
export async function linkPersonConversationLog(
  slug: string,
  tenantId: string,
  personId: string,
  logId: string,
): Promise<Result> {
  return doLink({
    slug,
    tenantId,
    leftId: personId,
    rightId: logId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_conversation_log",
    linkTable: "ai_clone_person_conversation_logs",
    leftColumn: "person_id",
    rightColumn: "conversation_log_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

export async function unlinkPersonConversationLog(
  slug: string,
  tenantId: string,
  personId: string,
  logId: string,
): Promise<Result> {
  return doUnlink({
    slug,
    tenantId,
    leftId: personId,
    rightId: logId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_conversation_log",
    linkTable: "ai_clone_person_conversation_logs",
    leftColumn: "person_id",
    rightColumn: "conversation_log_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

// ============================================================
// 人物 ⇄ 活動ログ
// ============================================================
export async function linkPersonActivityLog(
  slug: string,
  tenantId: string,
  personId: string,
  activityId: string,
): Promise<Result> {
  return doLink({
    slug,
    tenantId,
    leftId: personId,
    rightId: activityId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_activity_log",
    linkTable: "ai_clone_person_activity_logs",
    leftColumn: "person_id",
    rightColumn: "activity_log_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

export async function unlinkPersonActivityLog(
  slug: string,
  tenantId: string,
  personId: string,
  activityId: string,
): Promise<Result> {
  return doUnlink({
    slug,
    tenantId,
    leftId: personId,
    rightId: activityId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_activity_log",
    linkTable: "ai_clone_person_activity_logs",
    leftColumn: "person_id",
    rightColumn: "activity_log_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

// ============================================================
// 人物 ⇄ 経費
// ============================================================
export async function linkPersonExpense(
  slug: string,
  tenantId: string,
  personId: string,
  expenseId: string,
): Promise<Result> {
  return doLink({
    slug,
    tenantId,
    leftId: personId,
    rightId: expenseId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_expense",
    linkTable: "ai_clone_person_expenses",
    leftColumn: "person_id",
    rightColumn: "expense_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

export async function unlinkPersonExpense(
  slug: string,
  tenantId: string,
  personId: string,
  expenseId: string,
): Promise<Result> {
  return doUnlink({
    slug,
    tenantId,
    leftId: personId,
    rightId: expenseId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_expense",
    linkTable: "ai_clone_person_expenses",
    leftColumn: "person_id",
    rightColumn: "expense_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

// ============================================================
// 人物 ⇄ タスク
// ============================================================
export async function linkPersonTask(
  slug: string,
  tenantId: string,
  personId: string,
  taskId: string,
): Promise<Result> {
  return doLink({
    slug,
    tenantId,
    leftId: personId,
    rightId: taskId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_task",
    linkTable: "ai_clone_person_tasks",
    leftColumn: "person_id",
    rightColumn: "task_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

export async function unlinkPersonTask(
  slug: string,
  tenantId: string,
  personId: string,
  taskId: string,
): Promise<Result> {
  return doUnlink({
    slug,
    tenantId,
    leftId: personId,
    rightId: taskId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_task",
    linkTable: "ai_clone_person_tasks",
    leftColumn: "person_id",
    rightColumn: "task_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

// ============================================================
// 人物 ⇄ 判断履歴
// ============================================================
export async function linkPersonDecisionLog(
  slug: string,
  tenantId: string,
  personId: string,
  decisionId: string,
): Promise<Result> {
  return doLink({
    slug,
    tenantId,
    leftId: personId,
    rightId: decisionId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_decision_log",
    linkTable: "ai_clone_person_decision_logs",
    leftColumn: "person_id",
    rightColumn: "decision_log_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

export async function unlinkPersonDecisionLog(
  slug: string,
  tenantId: string,
  personId: string,
  decisionId: string,
): Promise<Result> {
  return doUnlink({
    slug,
    tenantId,
    leftId: personId,
    rightId: decisionId,
    leftTable: "ai_clone_person",
    rightTable: "ai_clone_decision_log",
    linkTable: "ai_clone_person_decision_logs",
    leftColumn: "person_id",
    rightColumn: "decision_log_id",
    revalidate: [`/clone/${slug}/people/${personId}`],
  });
}

// ============================================================
// 逆方向ラッパー（案件詳細から人物を bind するため、引数順を入れ替えただけ）
// ============================================================
export async function linkProjectPerson(
  slug: string,
  tenantId: string,
  projectId: string,
  personId: string,
): Promise<Result> {
  return linkPersonProject(slug, tenantId, personId, projectId);
}

export async function unlinkProjectPerson(
  slug: string,
  tenantId: string,
  projectId: string,
  personId: string,
): Promise<Result> {
  return unlinkPersonProject(slug, tenantId, personId, projectId);
}

// ============================================================
// サービス ⇄ 案件
// ============================================================
export async function linkServiceProject(
  slug: string,
  tenantId: string,
  serviceId: string,
  projectId: string,
): Promise<Result> {
  return doLink({
    slug,
    tenantId,
    leftId: serviceId,
    rightId: projectId,
    leftTable: "ai_clone_service",
    rightTable: "ai_clone_project",
    linkTable: "ai_clone_service_projects",
    leftColumn: "service_id",
    rightColumn: "project_id",
    revalidate: [
      `/clone/${slug}/services/${serviceId}`,
      `/clone/${slug}/projects/${projectId}`,
    ],
  });
}

export async function unlinkServiceProject(
  slug: string,
  tenantId: string,
  serviceId: string,
  projectId: string,
): Promise<Result> {
  return doUnlink({
    slug,
    tenantId,
    leftId: serviceId,
    rightId: projectId,
    leftTable: "ai_clone_service",
    rightTable: "ai_clone_project",
    linkTable: "ai_clone_service_projects",
    leftColumn: "service_id",
    rightColumn: "project_id",
    revalidate: [
      `/clone/${slug}/services/${serviceId}`,
      `/clone/${slug}/projects/${projectId}`,
    ],
  });
}

// 案件詳細からサービスを bind するための逆方向ラッパー
export async function linkProjectService(
  slug: string,
  tenantId: string,
  projectId: string,
  serviceId: string,
): Promise<Result> {
  return linkServiceProject(slug, tenantId, serviceId, projectId);
}

export async function unlinkProjectService(
  slug: string,
  tenantId: string,
  projectId: string,
  serviceId: string,
): Promise<Result> {
  return unlinkServiceProject(slug, tenantId, serviceId, projectId);
}
