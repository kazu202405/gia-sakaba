// Core OS 棚卸しの「適用」API：書き直し(rewrite)＝1フィールド更新／引退(retire)＝行削除。
// 安全装置：member認可＋allowlist(table/field)＋テナント所有を where 句で必ず縛る。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isEditableField,
  isDeletableTable,
  CORE_OS_EDITABLE,
  adminSupabaseForAudit,
} from "@/lib/ai-clone/coreos-audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let body: {
    slug?: string;
    action?: string;
    table?: string;
    id?: string;
    field?: string;
    value?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim();
  const action = (body.action ?? "").trim();
  const table = (body.table ?? "").trim();
  const id = (body.id ?? "").trim();
  const field = (body.field ?? "").trim();
  const value = typeof body.value === "string" ? body.value : "";

  if (!slug || !id || !CORE_OS_EDITABLE[table]) {
    return NextResponse.json({ error: "対象が不正です" }, { status: 400 });
  }

  // member 認可
  const { data: tenant } = await supabase
    .from("ai_clone_tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) {
    return NextResponse.json({ error: "テナントが見つかりません" }, { status: 404 });
  }
  const { data: member } = await supabase
    .from("ai_clone_tenant_members")
    .select("user_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const sb = adminSupabaseForAudit();
  if (!sb) {
    return NextResponse.json({ error: "サーバー設定が未完了です" }, { status: 503 });
  }

  if (action === "rewrite") {
    if (!isEditableField(table, field)) {
      return NextResponse.json({ error: "編集できない項目です" }, { status: 400 });
    }
    const { error } = await sb
      .from(table)
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", tenant.id); // ← テナント所有を必ず縛る
    if (error) {
      return NextResponse.json(
        { error: `保存に失敗しました：${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "retire") {
    if (!isDeletableTable(table)) {
      return NextResponse.json({ error: "削除できない項目です" }, { status: 400 });
    }
    const { error } = await sb
      .from(table)
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);
    if (error) {
      return NextResponse.json(
        { error: `削除に失敗しました：${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "不明な操作です" }, { status: 400 });
}
