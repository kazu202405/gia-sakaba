# GIAの酒場 Stripe設定

## 商品

- Stripeはまずテストモードで作成する。
- 商品名: `GIAの酒場 有料会員`
- 料金: `480 JPY`
- 種類: 月額の継続課金
- 税: 480円を最終表示額にする場合は税込価格として設定する。
- 無料体験: なし
- アカウント共通の明細書表記は、他サービスでも使うため会社名または共通ブランド名にする。
- 酒場を識別する商品側の明細書表記は `GIA-SAKABA`。
- メタデータは `app=gia-sakaba`。

作成済みのテスト商品:

```text
Product ID: prod_VJP38xIms8DeKn
Price ID: price_1UImFgBRsf0enSjQwbxmCY0u
```

テスト用Webhook、Customer Portal、VercelのProduction環境変数も設定済み。秘密鍵とWebhook secretはVercelのSecretとして保存し、Gitには含めない。

テストモードと本番モードの商品・Price IDは別物。最初はテスト用だけ作成する。

## 環境変数

秘密鍵はチャットやGitへ貼らず、VercelのEnvironment Variablesへ直接登録する。

```text
STRIPE_MODE=test
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_PRICE_SAKABA_TEST=price_1UImFgBRsf0enSjQwbxmCY0u
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
```

本番開始時だけ次を追加して、最後に `STRIPE_MODE=live` へ変更する。

```text
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_PRICE_SAKABA_LIVE=price_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
```

## Webhook

既存の `/api/stripe/webhook` と同じStripeアカウント・同じVercelプロジェクトなら、重複するWebhookを増やさず既存エンドポイントを使う。未登録なら本番URLは次。

```text
https://guild.gia2018.com/api/stripe/webhook
```

必要なイベント:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Customer Portalでは、支払い方法の更新、請求履歴、サブスクリプションの解約を有効にする。

## 安全な公開順

1. migration 0097を適用する。（適用済み）
2. テスト商品、テストPrice、Webhook、Customer PortalをStripeで設定する。（設定済み）
3. Vercelへテスト用環境変数を登録する。（Productionへ設定済み）
4. コードを本番へデプロイし、テスト用一般会員でCheckoutを開いてStripeのテストカードで決済する。
5. `billing_status=active`、限定の集まり、プロジェクト上限、Portal、解約反映を確認する。
6. 本番商品と本番Webhookを設定する。
7. 本番キー登録後に `STRIPE_MODE=live` へ変更する。

owner/masterは `billing_status=exempt` のためStripe契約を作らない。
