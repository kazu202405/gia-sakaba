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

本番開始時だけ次を追加して、最後に `SAKABA_STRIPE_MODE=live` を設定する。共通GIA機能の `STRIPE_MODE=test` は変更しない。`STRIPE_SECRET_KEY_LIVE` には酒場専用の制限付きキー（`rk_live_...`）を使用できる。

```text
STRIPE_SECRET_KEY_LIVE=rk_live_...
STRIPE_PRICE_SAKABA_LIVE=price_1UJseSBRsf0enSjQ5I0tR7sO
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
```

## Webhook

同じ送信先・同じ署名シークレットを再利用できる場合だけ既存のWebhookを使う。GIA本体の送信先は別ドメインなので、酒場本番用に次の送信先を作成した。Webhookの署名シークレットは送信先ごとに異なる。

```text
https://guild.gia2018.com/api/stripe/webhook
```

本番送信先 ID: `we_1UJsq2BRsf0enSjQBBF2nQZC`（Stripe上の名称「GIAの酒場 本番」、上記5イベント、2026-09-26作成）。

本番商品 ID: `prod_VKXj9OtAn7TzSl`。月480円・税込・トライアルなし、商品メタデータ `service=gia-sakaba`。

本番キーはCheckout Sessions=書き込み、Customer Portal=書き込み、Subscriptions=読み取りの3権限だけの制限付きキーで作る。Stripeが発行時に本人確認メールを求める。キーや署名シークレットをチャット・Gitに載せない。

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
7. 本番キーとWebhook署名シークレットを登録し、再デプロイした後に `SAKABA_STRIPE_MODE=live` を設定して再デプロイする。`STRIPE_MODE` は変更しない。

2026-09-27時点: 本番商品・Price・Webhook送信先を作成し、酒場専用の制限付きキーとWebhook署名シークレットをVercelのProduction Secretへ登録済み。`SAKABA_STRIPE_MODE=live` で本番再デプロイがReadyになった。`STRIPE_MODE=test` は維持し、Company Noteを含む他サービスの決済設定は変更していない。一般会員のCheckoutには本物の480円の請求が発生する。本番でテストカードを使わない。実カード決済・Webhook反映・解約の一連の本番動作は未確認。

owner/masterは `billing_status=exempt` のためStripe契約を作らない。
