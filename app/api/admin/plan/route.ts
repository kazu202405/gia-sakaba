// 管理者専用：会員の段（applicants.plan）を手動で付与・解除する。
//
// 想定ユースケース:
//   - デモ用アカウントに会員機能を見せる
//   - 知人へ無料で会員機能を開放する
//   - 決済トラブルの暫定対応
//
// ⚠️ Stripe の契約とは独立して動く。
//   課金中の人（stripe_subscription_id あり）の段をここで書き換えると、
//   Stripe 側の請求額とDBの段が食い違う。次に Stripe の webhook が飛んだ
//   時点で metadata.plan で上書きされ、ここでの変更は消える。
//   そのため課金中の人には確認を要求する（force フラグ）。
//   課金中の段を変えたいときは /upgrade の段変更（price 差し替え）を使う。
//
// 手動付与は plan だけを書き、tier と subscription_status は触らない。
// tier='paid' にすると紹介リンク等コーチ機能が誤って開く（migration 0076）。
// 株アプリ側の会員判定（gia_identity.is_paid_member）は plan を見るので、
// これだけで Company Note の会員機能が開く。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMembershipPlan } from "@/lib/membership/plans";

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
    | { applicantId?: string; plan?: string | null; reason?: string; force?: boolean }
    | null;

  const applicantId = body?.applicantId;
  // null / 空文字 = 段を外す（無料会員に戻す）
  const raw = body?.plan ?? null;
  const newPlan = raw && raw.length > 0 ? raw : null;

  if (!applicantId) {
    return NextResponse.json({ error: "applicantId が必要です" }, { status: 400 });
  }
  if (newPlan !== null && !isMembershipPlan(newPlan)) {
    return NextResponse.json(
      { error: "段は online / real / invite / premium のいずれかです" },
      { status: 400 },
    );
  }

  const { data: current, error: cErr } = await supabase
    .from("applicants")
    .select("plan, stripe_subscription_id, subscription_status")
    .eq("id", applicantId)
    .single();

  if (cErr || !current) {
    return NextResponse.json(
      { error: "該当する会員が見つかりません" },
      { status: 404 },
    );
  }

  const oldPlan = (current.plan as string | null) ?? null;
  if (oldPlan === newPlan) {
    return NextResponse.json({ ok: true, message: "変更なし" }, { status: 200 });
  }

  // 課金中の人は、ここで書き換えても次の webhook で上書きされる。
  // 気づかないまま「変えたのに戻っている」と悩むのを防ぐため、明示確認を要求する。
  if (current.stripe_subscription_id && !body?.force) {
    return NextResponse.json(
      {
        error: "stripe_subscription",
        message:
          "この会員は Stripe で課金中です。ここで段を書き換えても、次に Stripe から"
          + "通知が届いた時点で元に戻ります。課金中の段を変えるときは、ご本人に"
          + "/upgrade からプラン変更していただくのが正しい手順です。"
          + "それでも手動で書き換える場合は、もう一度実行してください。",
        needsConfirm: true,
      },
      { status: 409 },
    );
  }

  const { error: uErr } = await supabase
    .from("applicants")
    .update({ plan: newPlan })
    .eq("id", applicantId);

  if (uErr) {
    return NextResponse.json(
      { error: `段の更新に失敗：${uErr.message}` },
      { status: 500 },
    );
  }

  const { error: lErr } = await supabase.from("activity_log").insert({
    actor_id: user.id,
    subject_type: "applicant",
    subject_id: applicantId,
    action: "plan_manual_change",
    details: {
      old_plan: oldPlan,
      new_plan: newPlan,
      reason: body?.reason ?? null,
      had_stripe_subscription: !!current.stripe_subscription_id,
    },
  });
  if (lErr) {
    console.warn("[admin/plan] activity_log 書き込み失敗:", lErr.message, {
      applicantId,
      oldPlan,
      newPlan,
    });
  }

  return NextResponse.json({ ok: true, oldPlan, newPlan });
}
