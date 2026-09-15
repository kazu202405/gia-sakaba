// テラこや 参加申込の自動再開ページ。
// LP の「参加を申し込む」が未ログイン時に /login?next=/members/app/terakoya/start へ送り、
// 登録/ログイン完了後にここへ戻ってくる。サーバー側でそのまま Checkout に進ませるため、
// ユーザーは再クリック不要で決済画面に到達する。

import { terakoyaCheckoutRedirect } from "@/components/salon/checkout-core";

// 認証状態に依存するため常に動的レンダリング
export const dynamic = "force-dynamic";

export default async function TerakoyaStartPage() {
  await terakoyaCheckoutRedirect();
  return null;
}
