# 酒場のプッシュ通知を有効にする手順

この機能は酒場ドメインだけのWeb Push。GIA本体、DEMO、メール・LINEには送らない。DB migration 0099は2026-09-25にユーザーが適用済み。送信鍵を用意するまでは本番へデプロイしない。

1. 本番Supabaseで `supabase/migrations/0099_sakaba_web_push.sql` を実行する（適用済み）。購読端末・通知の種類・送信重複防止を保存する。既存のおしらせやプロジェクトは削除しない。
2. ローカルで `npx web-push generate-vapid-keys` を実行する。秘密鍵はチャットやGitへ貼らない。VercelのProduction環境変数へ `PUSH_VAPID_PUBLIC_KEY`、`PUSH_VAPID_PRIVATE_KEY`、`PUSH_VAPID_SUBJECT`（`mailto:`で始まる管理用メールアドレス）を登録する。DEMOへは登録しない。
3. 別々の長いランダムな値を `CRON_SECRET` と `PUSH_DISPATCH_SECRET` としてVercelのProduction環境変数へ登録する。`CRON_SECRET` はVercel Cronが日次GETに自動付与し、`PUSH_DISPATCH_SECRET` はDB Webhookの認証ヘッダーに使う。秘密をGitやチャットへ貼らない。
4. Supabase Database Webhooksで `sakaba.notifications` の `INSERT` に1件作る。URLは `https://guild.gia2018.com/api/guild/push/dispatch`、POST、ヘッダーは `Content-Type: application/json` と `x-dispatch-secret: <PUSH_DISPATCH_SECRET>`。酒場以外の通知テーブルは対象にしない。受信側はWebhookの本文を信用せず、IDだけを受けてDBから通知候補を引き直す。
5. デプロイ後、マイページの「プッシュ通知」から実機で許可する。Android Chromeと、iOS 16.4以降でホーム画面に追加して開いた酒場で確認する。「この端末で表示テスト」は端末だけの確認なので、次の実配信テストも必要。通知を押した先の権限は従来の画面側で再判定される。
6. テスト用会員間でクエスト申込→通知、限定の集まり申込→マスター通知→承認→本人通知を試す。期限通知はVercel Cronの日次実行（UTC 00:00、日本時間の午前9時台）から1回だけ送る。対象は担当タスク、参加中のプロジェクト、関係するクエストの申込締切。

送信側はブラウザーが登録したPush endpointへ送る。端末の通知許可と酒場側の通知設定の両方が有効な場合だけ配信する。ロック画面には個人名・案件名・本文を出さず、一般的な文面にする。端末の登録を解除すると宛先は削除される。
