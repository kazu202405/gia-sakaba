// Stripe SDK の初期化ラッパー。
// サーバー側のみで使う（lib/openai/client.ts と同じ思想）。
//
// 環境変数（test / live 切替対応）:
//   STRIPE_MODE                        — "test" | "live"（未設定なら test ＝安全側・誤課金防止）
//   STRIPE_SECRET_KEY[_TEST|_LIVE]     — シークレットキー（sk_test_xxx / sk_live_xxx）
//   STRIPE_PRICE_ID_SALON[_TEST|_LIVE] — 「サロン本会員 月額990円」の Price ID
//   STRIPE_PRICE_ID_TERAKOYA[_TEST|_LIVE]      — 「テラこや 個人会員 月額10,000円」の Price ID
//   STRIPE_PRICE_ID_TERAKOYA_CORP[_TEST|_LIVE] — 「テラこや 法人プラン」の Price ID（現状未使用・予約）
//   STRIPE_PRICE_AI_CLONE_ASSISTANT[_TEST|_LIVE] — アシスタント 4,980円 の Price ID
//   STRIPE_PRICE_AI_CLONE_PARTNER[_TEST|_LIVE]   — パートナー 7,980円 の Price ID
//   STRIPE_WEBHOOK_SECRET[_TEST|_LIVE] — webhook 署名検証用（whsec_xxx）
//   NEXT_PUBLIC_SITE_URL               — リダイレクト先の origin（test/live 共通）
//
// 切替方法:
//   両モードの値を Vercel に *_TEST / *_LIVE で入れておけば、STRIPE_MODE を1つ
//   書き換えるだけで test↔live を切替（コード変更・再デプロイ不要、env 反映のみ）。
//   *_TEST / *_LIVE が無ければ従来の単一 env 名にフォールバック（後方互換）。

import Stripe from "stripe";

let cachedClient: Stripe | null = null;
let cachedMode: "test" | "live" | null = null;

/** 現在の Stripe モード（live 明示時のみ live、それ以外は test）。 */
export function getStripeMode(): "test" | "live" {
  return process.env.STRIPE_MODE === "live" ? "live" : "test";
}

/** モードに応じて base の *_TEST / *_LIVE を選ぶ。無ければ base（単一名）にフォールバック。 */
function pickModeEnv(base: string): string | undefined {
  const suffix = getStripeMode() === "live" ? "_LIVE" : "_TEST";
  const v = process.env[`${base}${suffix}`];
  if (v && v.trim().length > 0) return v;
  const fallback = process.env[base];
  return fallback && fallback.trim().length > 0 ? fallback : undefined;
}

export function getStripeClient(): Stripe {
  const mode = getStripeMode();
  // モードが切り替わった場合はキャッシュを作り直す（env 反映後の安全策）
  if (cachedClient && cachedMode === mode) return cachedClient;
  const key = pickModeEnv("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error(
      `STRIPE_SECRET_KEY_${mode.toUpperCase()}（または STRIPE_SECRET_KEY）が未設定です [mode=${mode}]。`,
    );
  }
  cachedClient = new Stripe(key, {
    // apiVersion を明示的に pin（SDK のデフォルトが将来変わって挙動が変化するのを防ぐ）。
    // バージョン文字列は SDK のtypeに合わせて型安全に保つため、SDK 同梱の DEFAULT を使う。
    // 明示文字列にすると stripe@22.x の型と不整合になりビルド失敗するため、ここでは省略。
    typescript: true,
  });
  cachedMode = mode;
  return cachedClient;
}

// ─────────────────────────────────────────────────────────────
// 会員の段
//
//   online   ¥4,980   公開
//   real     ¥7,980   公開
//   invite   ¥11,000  非公開（URLを個別に渡す）
//   premium  ¥33,000  非公開（URLを個別に渡す）
//
// 段の定義をここ1箇所に置く。以前は価格IDの変数名が商品の実態とずれており
// （¥4,980 が AI_CLONE_ASSISTANT、¥11,000 が TERAKOYA という旧称）、
// どの入口がいくら課金するのか読み取れず取り違えの温床になっていた。
// 名前・env・金額の対応をこの表だけ見れば分かる形にする。
// ─────────────────────────────────────────────────────────────

// 段の定義そのものは lib/membership/plans.ts に置いてある。
// あちらは Stripe SDK に依存しないので、クライアントコンポーネント
// （サイドバー等の会員判定）からも読める。ここでは env との対応だけを持つ。
export type { MembershipPlan } from "@/lib/membership/plans";
export {
  isMembershipPlan,
  PUBLIC_MEMBERSHIP_PLANS,
} from "@/lib/membership/plans";

import type { MembershipPlan } from "@/lib/membership/plans";

/** 段 → env のベース名。金額はコメントで併記（実値はStripe側が正）。 */
const MEMBERSHIP_PRICE_ENV: Record<MembershipPlan, string> = {
  online: "STRIPE_PRICE_ONLINE",   // ¥4,980
  real: "STRIPE_PRICE_REAL",       // ¥7,980
  invite: "STRIPE_PRICE_INVITE",   // ¥11,000（表に出さない）
  premium: "STRIPE_PRICE_PREMIUM", // ¥33,000（表に出さない）
};

/** 会員の段の Price ID を取得（未設定時は明示エラー） */
export function getMembershipPriceId(plan: MembershipPlan): string {
  const base = MEMBERSHIP_PRICE_ENV[plan];
  const id = pickModeEnv(base);
  if (!id) {
    throw new Error(
      `${base}_${getStripeMode().toUpperCase()}（または ${base}）が未設定です [plan=${plan}]。`,
    );
  }
  return id;
}

/** 寺子屋 法人プラン（¥9,980/月）の Price ID を取得（未設定時は明示エラー） */
export function getTerakoyaCorpPriceId(): string {
  const id = pickModeEnv("STRIPE_PRICE_ID_TERAKOYA_CORP");
  if (!id) {
    throw new Error(
      `STRIPE_PRICE_ID_TERAKOYA_CORP_${getStripeMode().toUpperCase()}（または STRIPE_PRICE_ID_TERAKOYA_CORP）が未設定です。`,
    );
  }
  return id;
}

export type AiClonePlan = "assistant" | "partner";

/** AI Clone（アシスタント / パートナー）の Price ID を取得（未設定時は明示エラー） */
export function getAiClonePriceId(plan: AiClonePlan): string {
  const base =
    plan === "assistant"
      ? "STRIPE_PRICE_AI_CLONE_ASSISTANT"
      : "STRIPE_PRICE_AI_CLONE_PARTNER";
  const id = pickModeEnv(base);
  if (!id) {
    throw new Error(
      `${base}_${getStripeMode().toUpperCase()}（または ${base}）が未設定です。`,
    );
  }
  return id;
}

/** Webhook 署名検証用の secret を取得 */
export function getWebhookSecret(): string {
  const s = pickModeEnv("STRIPE_WEBHOOK_SECRET");
  if (!s) {
    throw new Error(
      `STRIPE_WEBHOOK_SECRET_${getStripeMode().toUpperCase()}（または STRIPE_WEBHOOK_SECRET）が未設定です。`,
    );
  }
  return s;
}

/** site origin（リダイレクト URL 組立用） */
export function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
