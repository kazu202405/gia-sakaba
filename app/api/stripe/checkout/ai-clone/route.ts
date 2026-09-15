// AI Clone（アシスタント / パートナー）の Stripe Checkout Session を作成し、その URL を返す。
// クライアント側は受け取った url に window.location.href で遷移するだけ。
//
// 認証必須：ログイン済みユーザーが前提（未ログインなら 401）。
// 既に owner として tenant を持っているなら 400（重複サブスク防止）。
//
// success 時は `/upgrade/success?session_id=...&purpose=ai-clone` に戻る。
// cancel 時は `/services/ai` に戻る。
//
// webhook 側で session.metadata.purpose === 'ai-clone' を検知して
// ai_clone_tenants + ai_clone_tenant_members(owner) を自動作成する。

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AI_CLONE_SALES_ENABLED } from "@/lib/config/membership";
import {
  type AiClonePlan,
  getAiClonePriceId,
  getSiteOrigin,
  getStripeClient,
} from "@/lib/stripe/client";

function isAiClonePlan(v: unknown): v is AiClonePlan {
  return v === "assistant" || v === "partner";
}

export async function POST(req: NextRequest) {
  // 外販停止中。既存契約は動かすが、新規の購入は受け付けない。
  // 画面側の導線も閉じてあるが、URL直叩きでも決済が始まらないようにする。
  if (!AI_CLONE_SALES_ENABLED) {
    return NextResponse.json(
      { error: "現在このプランは新規のお申し込みを受け付けておりません。" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { plan?: unknown }
    | null;
  const plan = body?.plan;
  if (!isAiClonePlan(plan)) {
    return NextResponse.json(
      { error: "plan は assistant / partner のいずれかを指定してください" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ログインが必要です" },
      { status: 401 },
    );
  }

  // 既に owner として tenant を持っているかチェック（重複決済防止）
  const { data: existingTenant } = await supabase
    .from("ai_clone_tenants")
    .select("id, slug, status")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (existingTenant && existingTenant.status === "active") {
    return NextResponse.json(
      {
        error: "既に AI Clone のテナントをお持ちです",
        slug: existingTenant.slug,
      },
      { status: 400 },
    );
  }

  const stripe = getStripeClient();
  const priceId = getAiClonePriceId(plan);
  const origin = getSiteOrigin();

  // 連打や retry で重複 Session を作らないよう、決定的な Idempotency-Key を渡す。
  // user.id + plan + 当日日付（同じユーザーが同じ日に同じプランで何度叩いても同じ Session が返る）。
  const today = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `checkout:ai-clone:${plan}:${user.id}:${today}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      // webhook 側で誰の決済か / どのプランかを引けるよう metadata に載せる。
      // subscription_data 側にも同じ metadata を載せて、後続の subscription イベントでも引けるようにする。
      metadata: {
        purpose: "ai-clone",
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          purpose: "ai-clone",
          user_id: user.id,
          plan,
        },
      },
      success_url: `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}&purpose=ai-clone`,
      cancel_url: `${origin}/services/ai`,
      allow_promotion_codes: true,
      locale: "ja",
    },
    { idempotencyKey },
  );

  if (!session.url) {
    return NextResponse.json(
      { error: "Checkout Session の作成に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
