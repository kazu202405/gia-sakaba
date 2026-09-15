// 紹介コーチの会話履歴リセット（4,980円＝owner テナントの Supabase 履歴を全消去）。
// 990円（端末ローカル保存）はクライアント側で消すので、このAPIは呼ばない。

import { createClient } from "@/lib/supabase/server";
import { resolveTenantForOwner } from "@/lib/ai-clone/supabase-db";
import { clearCoachHistory } from "@/lib/coach/coach-history";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await resolveTenantForOwner(user.id);
  if (!tenant) {
    // テナントが無い会員（端末ローカル保存）はサーバー側に消すものが無い
    return Response.json({ ok: true });
  }

  const ok = await clearCoachHistory(supabase, tenant.id);
  if (!ok) {
    return Response.json({ error: "削除に失敗しました" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
