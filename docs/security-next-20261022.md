# Next.jsのセキュリティ更新（2026-10-22）

- ブランチ：`fix/next-security-20261022`。mainの`862aca6`から作成。
- Next.js 16.3.6 → 16.4.2、React/React DOM 19.2.3 → 19.2.9、eslint-config-nextは16.1.1 → 16.4.2。
- sharpは0.35.5、Axiosは1.18.0 → 1.20.0。follow-redirects/source-map-jsも修正版へ更新。
- 438テストと本番用ビルドが通過。本番DB・決済の接続情報をダミーへ置き換えた子プロセスで検証した。元の.envは変更していない。
- `npm audit --omit=dev` は全severity 0件。全依存のauditは開発ツールに27パッケージの指摘が残る（high16/moderate10/low1）。パッケージ数は独立した脆弱性の件数ではない。
- 酒場はgia-nextとは別のNext.jsアプリ。GIAの会員情報との連携は維持。
- 本番反映は未実施。push・デプロイなし。料金・Stripe・DB設定・既存の未追跡CLAUDE.mdは変更していない。
- 手元のNode.js更新、本番Nodeの確認、Supabase権限監査、侵害ログ調査は別途必要。

公式告知：https://nextjs.org/blog/nextjs-security-update-october-14-2026
安定版：https://github.com/vercel/next.js/releases/tag/v16.4.2
