# 酒場のプッシュ通知を有効にする手順

この機能は酒場ドメインだけのWeb Push。GIA本体、DEMO、メール・LINEには送らない。DB migrationと送信鍵を用意するまでは本番へデプロイしない。

1. 本番Supabaseで `supabase/migrations/0099_sakaba_web_push.sql` を実行する。購読端末・通知の種類・送信重複防止を保存する。既存のおしらせやプロジェクトは削除しない。
2. ローカルで `npx web-push generate-vapid-keys` を実行する。秘密鍵はチャットやGitへ貼らない。VercelのProduction環境変数へ `PUSH_VAPID_PUBLIC_KEY`、`PUSH_VAPID_PRIVATE_KEY`、`PUSH_VAPID_SUBJECT`（`mailto:`で始まる管理用メールアドレス）を登録する。DEMOへは登録しない。
3. 十分長いランダムな `CRON_SECRET` をVercelのProduction環境変数へ登録する。同じ値をSupabase Vaultにも保存し、Supabase Cronから `https://guild.gia2018.com/api/guild/push/dispatch` に5分ごとにGETする。HTTPヘッダーは `Authorization: Bearer <CRON_SECRET>`。秘密をSQLファイルやCronジョブ定義へ直書きしない。Vercel HobbyのCronは1日1回までなので使わない。
4. デプロイ後、マイページの「プッシュ通知」から実機で許可する。Android Chromeと、iOS 16.4以降でホーム画面に追加して開いた酒場で確認する。通知を押した先の権限は従来の画面側で再判定される。
5. テスト用会員間でクエスト申込→通知、限定の集まり申込→マスター通知→承認→本人通知を試す。期限通知はJSTの前日9時以降に1回だけ送る。対象は担当タスク、参加中のプロジェクト、関係するクエストの申込締切。

送信側はブラウザーが登録したPush endpointへ送る。端末の通知許可と酒場側の通知設定の両方が有効な場合だけ配信する。ロック画面には個人名・案件名・本文を出さず、一般的な文面にする。端末の登録を解除すると宛先は削除される。
