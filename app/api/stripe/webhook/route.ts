// Stripe Webhook ハンドラ。
//
// 対応イベント（サロン = applicants 軸）:
//   checkout.session.completed       → tier='paid' へ昇格、stripe_*_id 保存
//   customer.subscription.updated    → subscription_status 反映
//   customer.subscription.deleted    → tier='tentative' へ revert
//   invoice.payment_succeeded        → subscription_status='active' に確定
//   invoice.payment_failed           → subscription_status='past_due' に
//
// 対応イベント（AI Clone = ai_clone_tenants 軸）:
//   checkout.session.completed       → ai_clone_tenants + tenant_members(owner) 自動作成
//   customer.subscription.updated    → ai_clone_tenants.subscription_status 反映
//   customer.subscription.deleted    → ai_clone_tenants.status='terminated' / subscription_status='canceled'
//   invoice.payment_succeeded/failed → ai_clone_tenants.subscription_status 反映
//
// 分岐ルール:
//   session.metadata.purpose === 'ai-clone'  → AI Clone 処理
//   sub.metadata.purpose === 'ai-clone'       → AI Clone 処理
//   それ以外（applicant_id がある or 何もない）→ サロン処理（既存）
//
// セキュリティ:
//   - 必ず stripe-signature を検証
//   - service_role key で RLS を越えて UPDATE
//   - event.id を stripe_webhook_events.id に INSERT して冪等化
//
// 開発時のセットアップ:
//   stripe listen --forward-to localhost:3000/api/stripe/webhook
//   出力された whsec_xxx を STRIPE_WEBHOOK_SECRET に設定
//
// ルックアップ戦略:
//   subscription / invoice 系イベントは sub.metadata.applicant_id / user_id を最優先で使う。
//   無い場合は customer_id をフォールバックに使う（既存のレガシーな customer 用）。

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getStripeClient,
  getWebhookSecret,
  isMembershipPlan,
} from "@/lib/stripe/client";

// raw body で受け取る必要があるため Node.js runtime
export const runtime = "nodejs";

// service role を使う管理クライアント（webhook は server-to-server で RLS 越え）
function adminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service role が未設定。NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** subscription / invoice の metadata から applicant_id を引く */
async function applicantIdFromSubscription(
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<string | null> {
  if (sub.metadata?.applicant_id) return sub.metadata.applicant_id;
  return null;
}

async function applicantIdFromInvoice(
  stripe: Stripe,
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<string | null> {
  // 1. parent.subscription_details.subscription があれば（API v2024+ の subscription invoice）
  //    そこから subscription を retrieve して metadata.applicant_id を取る
  const subId =
    invoice.parent?.subscription_details?.subscription ?? null;
  const subIdStr =
    typeof subId === "string" ? subId : subId?.id ?? null;
  if (subIdStr) {
    try {
      const sub = await stripe.subscriptions.retrieve(subIdStr);
      if (sub.metadata?.applicant_id) return sub.metadata.applicant_id;
    } catch {
      // fall through to customer-based lookup
    }
  }
  // 2. フォールバック: invoice.customer から DB で applicant を引く
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;
  if (customerId) {
    return applicantIdFromCustomerId(supabase, customerId);
  }
  return null;
}

/** customer_id でも applicant を引けるフォールバック */
async function applicantIdFromCustomerId(
  supabase: SupabaseClient,
  customerId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("applicants")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// ─── AI Clone 用ヘルパー ────────────────────────────────────────

/** 衝突しない slug を生成（t-<8桁hex>）。5回リトライで失敗時は例外 */
async function generateUniqueCloneSlug(
  supabase: SupabaseClient,
): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const short = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const slug = `t-${short}`;
    const { data } = await supabase
      .from("ai_clone_tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  throw new Error("ユニークな AI Clone slug を生成できませんでした（5回試行）");
}

/**
 * subscription の metadata.purpose==='ai-clone' から ai_clone_tenants.id を引く。
 * 1. stripe_subscription_id 一致
 * 2. metadata.user_id で owner_user_id 一致
 * 3. stripe_customer_id 一致
 * の順でフォールバック。
 */
async function aiCloneTenantIdFromSubscription(
  supabase: SupabaseClient,
  sub: Stripe.Subscription,
): Promise<string | null> {
  // 1. subscription_id 一致
  const { data: bySubId } = await supabase
    .from("ai_clone_tenants")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (bySubId?.id) return bySubId.id as string;

  // 2. metadata.user_id で owner_user_id 一致
  const userId = sub.metadata?.user_id;
  if (userId) {
    const { data: byOwner } = await supabase
      .from("ai_clone_tenants")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (byOwner?.id) return byOwner.id as string;
  }

  // 3. customer_id 一致
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  if (customerId) {
    const { data: byCustomer } = await supabase
      .from("ai_clone_tenants")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (byCustomer?.id) return byCustomer.id as string;
  }

  return null;
}

/** invoice 経由で subscription を retrieve し、ai-clone tenant を引く */
async function aiCloneTenantIdFromInvoice(
  stripe: Stripe,
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const subId = invoice.parent?.subscription_details?.subscription ?? null;
  const subIdStr = typeof subId === "string" ? subId : subId?.id ?? null;
  if (!subIdStr) {
    // subscription なしの invoice（one-time）は AI Clone 範囲外
    return null;
  }
  try {
    const sub = await stripe.subscriptions.retrieve(subIdStr);
    if (sub.metadata?.purpose !== "ai-clone") return null;
    return aiCloneTenantIdFromSubscription(supabase, sub);
  } catch {
    return null;
  }
}

/**
 * 右腕AI（本会員¥4,980 assistant / ¥7,980 partner）購入者を、
 * コミュニティの本会員(plan='pro')にも昇格させる。
 * applicants.id === auth.users.id なので metadata.user_id でそのまま引ける。
 * 右腕AIテナントは既に作成済みなので、失敗しても致命にせずログのみ（後で照合可能）。
 */
async function grantCommunityPro(
  supabase: SupabaseClient,
  userId: string,
  customerId: string | null,
  subscriptionId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("applicants")
    .update({
      tier: "paid",
      plan: "pro",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: "active",
    })
    .eq("id", userId);
  if (error) {
    console.error("[stripe.webhook] grantCommunityPro failed", {
      userId,
      err: error.message,
    });
    return;
  }
  console.info("[stripe.webhook] applicant granted community pro (本会員)", {
    userId,
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "signature missing" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, getWebhookSecret());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[stripe.webhook] signature verification failed", { msg });
    return NextResponse.json(
      { error: `signature verification failed: ${msg}` },
      { status: 400 },
    );
  }

  const supabase = adminSupabase();

  // ─── 冪等性チェック ─────────────────────────────────────────────
  // event.id を PK に INSERT。duplicate key なら処理スキップ。
  const { error: insertErr } = await supabase
    .from("stripe_webhook_events")
    .insert({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });

  if (insertErr) {
    // 23505 = unique_violation（PostgreSQL）。再送なので何もせず 200 を返す。
    if (insertErr.code === "23505") {
      console.warn("[stripe.webhook] duplicate event, skipping", {
        id: event.id,
        type: event.type,
      });
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error("[stripe.webhook] failed to record event", {
      id: event.id,
      err: insertErr.message,
    });
    return NextResponse.json(
      { error: `failed to record event: ${insertErr.message}` },
      { status: 500 },
    );
  }

  try {
    switch (event.type) {
      // ─── 決済成功（初回） ───────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null);
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? null);

        // ─ AI Clone 用分岐：ai_clone_tenants + tenant_members(owner) 自動作成 ─
        if (session.metadata?.purpose === "ai-clone") {
          const userId = session.metadata?.user_id;
          const plan = session.metadata?.plan;
          if (!userId || !plan) {
            console.warn(
              "[stripe.webhook] ai-clone checkout missing user_id / plan metadata",
              { id: event.id },
            );
            break;
          }

          // 既に owner として tenant を持っていれば subscription 情報だけ更新（冪等性）
          const { data: existing } = await supabase
            .from("ai_clone_tenants")
            .select("id, slug")
            .eq("owner_user_id", userId)
            .maybeSingle();

          if (existing) {
            const { error: updErr } = await supabase
              .from("ai_clone_tenants")
              .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                subscription_status: "active",
                plan,
              })
              .eq("id", existing.id);
            if (updErr) throw updErr;
            console.info("[stripe.webhook] ai-clone tenant exists, subscription info updated", {
              tenantId: existing.id,
              slug: existing.slug,
            });
            // 本会員(pro)昇格も合わせて立てる（右腕AI購入＝コミュニティ本会員）
            await grantCommunityPro(supabase, userId, customerId, subscriptionId);
            break;
          }

          // 新規作成：slug を自動発行、表示名はメアドの prefix から仮で組む
          const slug = await generateUniqueCloneSlug(supabase);

          let defaultName = "新規テナント";
          try {
            const { data: userResp } = await supabase.auth.admin.getUserById(userId);
            const email = userResp?.user?.email ?? "";
            const prefix = email.split("@")[0];
            if (prefix && prefix.length > 0 && prefix.length <= 50) {
              defaultName = prefix;
            }
          } catch {
            // メアド取得失敗時は fallback の "新規テナント" のまま続行
          }

          const { data: createdTenant, error: tenantErr } = await supabase
            .from("ai_clone_tenants")
            .insert({
              name: defaultName,
              slug,
              owner_user_id: userId,
              plan,
              status: "active",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: "active",
            })
            .select("id, slug")
            .single();

          if (tenantErr || !createdTenant) {
            throw new Error(
              `ai_clone_tenants 作成失敗: ${tenantErr?.message ?? "unknown"}`,
            );
          }

          const { error: memberErr } = await supabase
            .from("ai_clone_tenant_members")
            .insert({
              tenant_id: createdTenant.id,
              user_id: userId,
              role: "owner",
            });

          if (memberErr) {
            // owner 登録に失敗したら tenant もロールバック
            await supabase
              .from("ai_clone_tenants")
              .delete()
              .eq("id", createdTenant.id);
            throw new Error(
              `ai_clone_tenant_members 登録失敗: ${memberErr.message}`,
            );
          }

          console.info("[stripe.webhook] ai-clone tenant provisioned", {
            tenantId: createdTenant.id,
            slug: createdTenant.slug,
            userId,
            plan,
            customerId,
            subscriptionId,
          });

          // 監査ログ（fire-and-forget。失敗してもメイン処理は通す）
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "ai_clone_tenant",
            subject_id: createdTenant.id,
            action: "tenant_provisioned",
            details: {
              stripe_event_id: event.id,
              customer_id: customerId,
              subscription_id: subscriptionId,
              plan,
              slug: createdTenant.slug,
              owner_user_id: userId,
            },
          });
          // 本会員(pro)昇格も合わせて立てる（右腕AI購入＝コミュニティ本会員）
          await grantCommunityPro(supabase, userId, customerId, subscriptionId);
          break;
        }

        // ─ テラこや 個人会員：会員を plan='terakoya' でタグ付け ─
        //   「決済前に会員登録」方式なので metadata.user_id が必ず入っている。
        //   tier は触らない（'paid' にすると紹介リンク等のコーチ機能が誤って開くため）。
        //   plan='terakoya' を見て mypage が紹介設計セクションを出し分ける。
        if (session.metadata?.purpose === "terakoya") {
          const userId = session.metadata?.user_id;
          if (!userId) {
            console.warn(
              "[stripe.webhook] terakoya checkout missing user_id metadata",
              { id: event.id },
            );
            break;
          }
          const { error } = await supabase
            .from("applicants")
            .update({
              plan: "terakoya",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: "active",
            })
            .eq("id", userId);
          if (error) throw error;
          console.info("[stripe.webhook] terakoya member tagged (plan=terakoya)", {
            userId,
            customerId,
            subscriptionId,
          });
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "applicant",
            subject_id: userId,
            action: "terakoya_subscription_created",
            details: {
              stripe_event_id: event.id,
              customer_id: customerId,
              subscription_id: subscriptionId,
            },
          });
          break;
        }

        // ─ 会員の段：applicants.plan に段をそのまま書く ─
        //   online / real / invite / premium を1分岐で受ける。
        //   tier は触らない（'paid' にすると紹介リンク等コーチ機能が誤って開く。
        //   migration 0076 のコメント参照）。
        if (session.metadata?.purpose === "membership") {
          const userId = session.metadata?.user_id;
          const plan = session.metadata?.plan;
          // plan を検証してから書く。未知の値を渡すと CHECK 制約違反で
          // 失敗し、Stripe が再送を繰り返す（原因が webhook 側だと気づきにくい）。
          if (!userId || !isMembershipPlan(plan)) {
            console.warn(
              "[stripe.webhook] membership checkout missing/invalid user_id or plan",
              { id: event.id, plan },
            );
            break;
          }

          const { error: mErr } = await supabase
            .from("applicants")
            .update({
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: "active",
            })
            .eq("id", userId);
          if (mErr) throw mErr;

          console.info("[stripe.webhook] membership granted", {
            userId,
            plan,
            customerId,
            subscriptionId,
          });
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "applicant",
            subject_id: userId,
            action: "membership_started",
            details: {
              stripe_event_id: event.id,
              plan,
              customer_id: customerId,
              subscription_id: subscriptionId,
            },
          });
          break;
        }

        // ─ 寺子屋 法人プラン：付与は運営が手動で行うため、ここでは記録のみ ─
        if (session.metadata?.purpose === "terakoya-corp") {
          console.info("[stripe.webhook] terakoya-corp checkout completed（手動付与対象）", {
            id: event.id,
            customerId,
            subscriptionId,
            customerEmail: session.customer_details?.email ?? null,
          });
          break;
        }

        // ─ サロン（既存）処理 ─
        const applicantId = session.metadata?.applicant_id;
        if (!applicantId) {
          console.warn("[stripe.webhook] checkout.session.completed without applicant_id", {
            id: event.id,
          });
          break;
        }

        const { error } = await supabase
          .from("applicants")
          .update({
            tier: "paid",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
          })
          .eq("id", applicantId);
        if (error) throw error;
        console.info("[stripe.webhook] applicant upgraded to paid", {
          applicantId,
          customerId,
          subscriptionId,
        });
        // 監査ログ：サブスク開始（fire-and-forget）
        void supabase.from("activity_log").insert({
          actor_id: null,
          subject_type: "applicant",
          subject_id: applicantId,
          action: "subscription_created",
          details: {
            stripe_event_id: event.id,
            customer_id: customerId,
            subscription_id: subscriptionId,
            tier_change: { from: "tentative", to: "paid" },
          },
        });
        break;
      }

      // ─── サブスク更新（status 変化を反映） ─────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        // ─ 会員の段：status と段の変更を applicants に反映 ─
        //   段の変更（online→real 等）は subscription の price を差し替えて行う。
        //   その際 metadata.plan も新しい段に更新するので、ここで拾って
        //   applicants.plan を追従させる。これが無いと、Stripe 上は
        //   リアル会員なのにDBはオンライン会員のまま、という食い違いが残る。
        if (sub.metadata?.purpose === "membership") {
          const userId = sub.metadata?.user_id;
          if (userId) {
            const patch: Record<string, unknown> = {
              subscription_status: sub.status,
              stripe_subscription_id: sub.id,
              stripe_customer_id:
                typeof sub.customer === "string"
                  ? sub.customer
                  : sub.customer.id,
            };
            // 未知の値は書かない（CHECK制約違反でStripeが再送を繰り返す）
            if (isMembershipPlan(sub.metadata?.plan)) {
              patch.plan = sub.metadata.plan;
            }
            const { error } = await supabase
              .from("applicants")
              .update(patch)
              .eq("id", userId);
            if (error) throw error;
            console.info("[stripe.webhook] membership subscription updated", {
              userId,
              plan: sub.metadata?.plan,
              status: sub.status,
            });
          }
          break;
        }

        // ─ テラこや 用分岐：status を applicants に反映 ─
        if (sub.metadata?.purpose === "terakoya") {
          const userId = sub.metadata?.user_id;
          if (userId) {
            const { error } = await supabase
              .from("applicants")
              .update({
                subscription_status: sub.status,
                stripe_subscription_id: sub.id,
                stripe_customer_id:
                  typeof sub.customer === "string"
                    ? sub.customer
                    : sub.customer.id,
              })
              .eq("id", userId);
            if (error) throw error;
          }
          break;
        }

        // ─ AI Clone 用分岐 ─
        if (sub.metadata?.purpose === "ai-clone") {
          const tenantId = await aiCloneTenantIdFromSubscription(supabase, sub);
          if (!tenantId) {
            console.warn(
              "[stripe.webhook] ai-clone subscription.updated could not resolve tenant",
              { id: event.id, subId: sub.id },
            );
            break;
          }
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          const { error } = await supabase
            .from("ai_clone_tenants")
            .update({
              subscription_status: sub.status,
              stripe_subscription_id: sub.id,
              stripe_customer_id: customerId,
            })
            .eq("id", tenantId);
          if (error) throw error;
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "ai_clone_tenant",
            subject_id: tenantId,
            action: "subscription_status_change",
            details: {
              stripe_event_id: event.id,
              new_status: sub.status,
              subscription_id: sub.id,
            },
          });
          break;
        }

        const applicantId =
          (await applicantIdFromSubscription(stripe, sub)) ??
          (await applicantIdFromCustomerId(
            supabase,
            typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          ));
        if (!applicantId) {
          console.warn("[stripe.webhook] subscription.updated could not resolve applicant", {
            id: event.id,
            subId: sub.id,
          });
          break;
        }
        const { error } = await supabase
          .from("applicants")
          .update({
            subscription_status: sub.status,
            stripe_subscription_id: sub.id,
            stripe_customer_id:
              typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          })
          .eq("id", applicantId);
        if (error) throw error;
        // 監査ログ：サブスク状態変化
        void supabase.from("activity_log").insert({
          actor_id: null,
          subject_type: "applicant",
          subject_id: applicantId,
          action: "subscription_status_change",
          details: {
            stripe_event_id: event.id,
            new_status: sub.status,
            subscription_id: sub.id,
          },
        });
        // ※ tier の自動 downgrade は今は行わない（past_due は猶予扱い）
        break;
      }

      // ─── サブスク解約（tier を tentative に戻す） ───────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        // ─ 会員の段：plan を外し subscription_status='canceled' ─
        //   tier は触らない（登録会員としては残す）。
        if (sub.metadata?.purpose === "membership") {
          const userId = sub.metadata?.user_id;
          if (userId) {
            const { error } = await supabase
              .from("applicants")
              .update({ plan: null, subscription_status: "canceled" })
              .eq("id", userId);
            if (error) throw error;
            console.info("[stripe.webhook] membership ended (subscription canceled)", {
              userId,
              subId: sub.id,
            });
          }
          break;
        }

        // ─ テラこや 用分岐：plan を外し subscription_status='canceled' ─
        if (sub.metadata?.purpose === "terakoya") {
          const userId = sub.metadata?.user_id;
          if (userId) {
            const { error } = await supabase
              .from("applicants")
              .update({ plan: null, subscription_status: "canceled" })
              .eq("id", userId);
            if (error) throw error;
            console.info(
              "[stripe.webhook] terakoya member untagged (subscription canceled)",
              { userId, subId: sub.id },
            );
          }
          break;
        }

        // ─ AI Clone 用分岐：tenant.status='terminated' + subscription_status='canceled' ─
        if (sub.metadata?.purpose === "ai-clone") {
          const tenantId = await aiCloneTenantIdFromSubscription(supabase, sub);
          if (!tenantId) {
            console.warn(
              "[stripe.webhook] ai-clone subscription.deleted could not resolve tenant",
              { id: event.id, subId: sub.id },
            );
            break;
          }
          const { error } = await supabase
            .from("ai_clone_tenants")
            .update({
              subscription_status: "canceled",
              status: "terminated",
            })
            .eq("id", tenantId);
          if (error) throw error;
          console.info("[stripe.webhook] ai-clone tenant terminated", {
            tenantId,
            subId: sub.id,
          });
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "ai_clone_tenant",
            subject_id: tenantId,
            action: "subscription_canceled",
            details: {
              stripe_event_id: event.id,
              subscription_id: sub.id,
            },
          });
          // 本会員(pro)も解除：コミュニティを無料会員(registered)に戻す
          const ownerUserId = sub.metadata?.user_id;
          if (ownerUserId) {
            const { error: downErr } = await supabase
              .from("applicants")
              .update({
                plan: null,
                tier: "registered",
                subscription_status: "canceled",
              })
              .eq("id", ownerUserId);
            if (downErr) {
              console.error("[stripe.webhook] community pro downgrade failed", {
                ownerUserId,
                err: downErr.message,
              });
            }
          }
          break;
        }

        const applicantId =
          (await applicantIdFromSubscription(stripe, sub)) ??
          (await applicantIdFromCustomerId(
            supabase,
            typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          ));
        if (!applicantId) {
          console.warn("[stripe.webhook] subscription.deleted could not resolve applicant", {
            id: event.id,
            subId: sub.id,
          });
          break;
        }
        const { error } = await supabase
          .from("applicants")
          .update({
            tier: "tentative",
            subscription_status: "canceled",
          })
          .eq("id", applicantId);
        if (error) throw error;
        console.info("[stripe.webhook] applicant downgraded to tentative", {
          applicantId,
          subId: sub.id,
        });
        // 監査ログ：サブスク解約
        void supabase.from("activity_log").insert({
          actor_id: null,
          subject_type: "applicant",
          subject_id: applicantId,
          action: "subscription_canceled",
          details: {
            stripe_event_id: event.id,
            subscription_id: sub.id,
            tier_change: { from: "paid", to: "tentative" },
          },
        });
        break;
      }

      // ─── 月次請求成功 ────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // ─ AI Clone 用分岐 ─
        const aiCloneTenantId = await aiCloneTenantIdFromInvoice(
          stripe,
          supabase,
          invoice,
        );
        if (aiCloneTenantId) {
          const { error } = await supabase
            .from("ai_clone_tenants")
            .update({ subscription_status: "active" })
            .eq("id", aiCloneTenantId);
          if (error) throw error;
          break;
        }

        const applicantId = await applicantIdFromInvoice(stripe, supabase, invoice);
        if (!applicantId) break;
        const { error } = await supabase
          .from("applicants")
          .update({ subscription_status: "active" })
          .eq("id", applicantId);
        if (error) throw error;
        break;
      }

      // ─── 月次請求失敗 ────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        // ─ AI Clone 用分岐 ─
        const aiCloneTenantId = await aiCloneTenantIdFromInvoice(
          stripe,
          supabase,
          invoice,
        );
        if (aiCloneTenantId) {
          const { error } = await supabase
            .from("ai_clone_tenants")
            .update({ subscription_status: "past_due" })
            .eq("id", aiCloneTenantId);
          if (error) throw error;
          console.warn("[stripe.webhook] ai-clone invoice.payment_failed", {
            tenantId: aiCloneTenantId,
            invoiceId: invoice.id,
          });
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "ai_clone_tenant",
            subject_id: aiCloneTenantId,
            action: "payment_failed",
            details: {
              stripe_event_id: event.id,
              invoice_id: invoice.id,
              amount_due: invoice.amount_due,
              currency: invoice.currency,
            },
          });
          break;
        }

        const applicantId = await applicantIdFromInvoice(stripe, supabase, invoice);
        if (!applicantId) break;
        const { error } = await supabase
          .from("applicants")
          .update({ subscription_status: "past_due" })
          .eq("id", applicantId);
        if (error) throw error;
        console.warn("[stripe.webhook] invoice.payment_failed", {
          applicantId,
          invoiceId: invoice.id,
        });
        // 監査ログ：請求失敗
        void supabase.from("activity_log").insert({
          actor_id: null,
          subject_type: "applicant",
          subject_id: applicantId,
          action: "payment_failed",
          details: {
            stripe_event_id: event.id,
            invoice_id: invoice.id,
            amount_due: invoice.amount_due,
            currency: invoice.currency,
          },
        });
        break;
      }

      default:
        // 他のイベントは無視
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[stripe.webhook] handler failed", {
      id: event.id,
      type: event.type,
      err: msg,
    });
    // 5xx を返すと Stripe は再送する。冪等テーブルが守るので OK。
    return NextResponse.json(
      { error: `handler failed: ${msg}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
