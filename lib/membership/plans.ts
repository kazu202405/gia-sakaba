// 会員の段の定義と、「この人はいま会員か」の判定。
//
// なぜ lib/stripe/client.ts から分けるか:
//   client.ts は Stripe の Node SDK を import している。会員判定はサイドバー
//   （クライアントコンポーネント）でも使うため、そこから client.ts を辿ると
//   Stripe SDK がブラウザ側のバンドルに入ってしまう。判定に必要なのは
//   文字列の比較だけなので、依存の無いこのファイルに置く。
//
// 段と金額の対応、env 名は lib/stripe/client.ts の MEMBERSHIP_PRICE_ENV。

export type MembershipPlan = "online" | "real" | "invite" | "premium";

export const MEMBERSHIP_PLANS: readonly MembershipPlan[] = [
  "online",
  "real",
  "invite",
  "premium",
];

/**
 * 募集導線に出してよい段。
 * invite / premium は表に出さず、URLを個別に渡して申し込んでもらう。
 */
export const PUBLIC_MEMBERSHIP_PLANS: readonly MembershipPlan[] = [
  "online",
  "real",
];

export function isMembershipPlan(value: unknown): value is MembershipPlan {
  return (
    typeof value === "string" &&
    (MEMBERSHIP_PLANS as readonly string[]).includes(value)
  );
}

/**
 * いま会員として扱うか。
 *
 * 判定を1箇所に集約する理由:
 *   以前は画面ごとに `tier === 'paid'` や `plan === 'terakoya'` を直接書いて
 *   いた。会員の段を online/real/invite/premium に変えたとき、これらが
 *   新しい値を知らないため「購入したのに会員として認識されない」状態に
 *   なっていた（サイドバー・紹介コーチ・設定画面）。
 *   新しい段を足すときは、この関数だけ直せば全画面に効くようにする。
 *
 * 過去の契約も会員として扱う:
 *   plan='terakoya' … 旧テラこや個人会員（¥11,000）
 *   tier='paid'     … 旧サロン本会員 / 旧本会員(pro)
 *   これらは現役の契約者がいる想定なので、締め出さない。
 */
export function isActiveMember(applicant: {
  plan?: string | null;
  tier?: string | null;
} | null | undefined): boolean {
  if (!applicant) return false;
  if (isMembershipPlan(applicant.plan)) return true;
  if (applicant.plan === "terakoya") return true; // 過去の契約
  if (applicant.tier === "paid") return true; // 過去の契約
  return false;
}
