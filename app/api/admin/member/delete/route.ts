// 管理者専用：会員の削除（レコード＋認証アカウント＋関連データ）。
//
// 動作:
//   1. 認証 + is_admin チェック（自分自身は削除不可）
//   2. service_role で以下を削除：
//      - 稼働中の Stripe サブスク（あれば解約。削除後に課金が残らないように）
//      - 他会員の referrer_id 参照を null 化（紹介リンク切れ防止）
//      - event_attendees（申込履歴）/ ai_clone_tenant_members（右腕AI紐付け）
//      - applicants 本体
//      - 認証アカウント（auth.users）
//   3. activity_log に delete を記録（監査用・失敗は無視）
//
// 方針（五島さん）:
//   退会（ステータス変更）とは別。削除は「レコードを消す」。認証ごと消すことで、
//   戻ってくる時は普通に新規登録し直すだけ（＝最小限）になり、会員番号も新規採番される。
//   ※ 半端な依存が FK で残っていた場合は applicants の削除でエラーになるので、
//     その時はエラー文の table を掃除対象に足して再実行する（掃除リストは拡張前提）。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: adminCheck, error: adminErr } = await supabase.rpc("is_admin");
  if (adminErr || adminCheck !== true) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { applicantId?: string }
    | null;
  const applicantId = body?.applicantId;

  if (!applicantId) {
    return NextResponse.json({ error: "applicantId が必要です" }, { status: 400 });
  }
  if (applicantId === user.id) {
    return NextResponse.json(
      { error: "自分自身は削除できません" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // ログ用 + Stripe 解約用に取得
  const { data: app } = await admin
    .from("applicants")
    .select("name, email, stripe_subscription_id")
    .eq("id", applicantId)
    .single();

  // 稼働中の Stripe サブスクがあれば解約（削除後の課金残りを防ぐ）
  if (app?.stripe_subscription_id) {
    try {
      const stripe = getStripeClient();
      await stripe.subscriptions.cancel(app.stripe_subscription_id);
    } catch (e) {
      console.warn("[admin/member/delete] Stripe 解約失敗:", e);
    }
  }

  // 依存データを掃除（FK で applicants 削除がブロックされないように）
  await admin.from("applicants").update({ referrer_id: null }).eq("referrer_id", applicantId);
  await admin.from("event_attendees").delete().eq("user_id", applicantId);
  await admin.from("ai_clone_tenant_members").delete().eq("user_id", applicantId);

  // applicants 本体
  const { error: delErr } = await admin
    .from("applicants")
    .delete()
    .eq("id", applicantId);
  if (delErr) {
    return NextResponse.json(
      { error: `会員レコードの削除に失敗：${delErr.message}` },
      { status: 500 },
    );
  }

  // 監査ログ（本人レコードは消えたので id と控えた名前だけ残す。失敗は無視）
  const { error: lErr } = await admin.from("activity_log").insert({
    actor_id: user.id,
    subject_type: "applicant",
    subject_id: applicantId,
    action: "delete",
    details: { name: app?.name ?? null, email: app?.email ?? null },
  });
  if (lErr) {
    console.warn("[admin/member/delete] activity_log 失敗:", lErr.message);
  }

  // 認証アカウント削除（再ログイン不可に。戻る時は新規登録＝最小限・番号再採番）
  const { error: authErr } = await admin.auth.admin.deleteUser(applicantId);
  if (authErr) {
    // レコードは消えたが認証が残った：warning で返す（Supabase Auth で手動削除を促す）
    console.warn("[admin/member/delete] 認証ユーザー削除失敗:", authErr.message);
    return NextResponse.json({
      ok: true,
      warning: `会員レコードは削除しましたが、認証アカウントの削除に失敗しました（${authErr.message}）。Supabase の Authentication から手動で削除してください。`,
    });
  }

  return NextResponse.json({ ok: true });
}
