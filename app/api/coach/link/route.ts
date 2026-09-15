// 紹介コーチ ⇄ 右腕AI 連携トグルの更新エンドポイント。
//
// POST { enabled: boolean }
//   ログインユーザーが owner のテナントの coach_link_enabled を更新する。
//   owner テナントが無い会員（990円・未課金）は 403。
//
// 認証: getUser() で本人確認。テナントは owner_user_id 一致のものだけ触れる
//       （resolveTenantForOwner が owner 一致で1件引くため、他人のテナントは触れない）。

import { createClient } from "@/lib/supabase/server";
import {
  resolveTenantForOwner,
  setCoachLinkEnabled,
} from "@/lib/ai-clone/supabase-db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { enabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return Response.json(
      { error: "enabled (boolean) が必要です" },
      { status: 400 },
    );
  }

  const tenant = await resolveTenantForOwner(user.id);
  if (!tenant) {
    return Response.json(
      { error: "連携できる右腕AI（テナント）がありません" },
      { status: 403 },
    );
  }

  const ok = await setCoachLinkEnabled(tenant.id, body.enabled);
  if (!ok) {
    return Response.json({ error: "更新に失敗しました" }, { status: 500 });
  }

  return Response.json({ ok: true, enabled: body.enabled });
}
