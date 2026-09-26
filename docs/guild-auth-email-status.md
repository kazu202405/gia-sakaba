# GIA認証・決済メールの引き継ぎ（2026-09-26）

## 方針

- 返信用メールボックスは作らない。認証メールの共通差出人は `GIA <no-reply@auth.gia2018.com>`。
- GIAの酒場だけでなく株アプリ等でもメール送信を使う。送信基盤はResendで共通化し、アプリごとの認証画面や文面は用途に合わせる。
- 株アプリが別Supabaseプロジェクトなら、SMTP設定はそのプロジェクトにも必要。APIキーはプロジェクトごとに分け、権限を送信のみ・対象ドメインのみとする。秘密をGitやチャットに記載しない。
- GIAの酒場・GIA本体・Company Noteは同じGIA Supabase Authプロジェクトを利用する。認証設定の変更はプロジェクト全体に影響するものとして扱う。Company Noteは株データ用に別のSupabaseプロジェクトも利用するが、ログインの正本はGIA Auth。

## 済んだこと

- Resend無料プランで `auth.gia2018.com` を追加し、Vercel DNSでDKIMと送信用SPF/MXを設定。Resendのドメイン表示は `verified`。受信機能はオフ。DMARCは任意で未設定。
- Resendで `GIA Supabase Auth SMTP` キーを作成。権限は **Sending access**、ドメインは **auth.gia2018.com** に限定。
- GIA Supabase（project ref `xwkblsgzomkovfqcyreu`）の Authentication → Emails → SMTP Settings に送信専用SMTPを設定。送信元は上記のGIA共通名義、ホストは `smtp.resend.com`、ポート465、ユーザー `resend`。キーはSupabaseに保存後、一時保持・画面表示を消去した。再読込でSMTP有効・ホスト・保存済みパスワードを確認。
- GIA SupabaseのRedirect URLsには `https://guild.gia2018.com/**` が既に登録済み。Site URLは `https://gia2018.com`。
- 酒場のログインからパスワード再設定メールを送る画面、メールから戻るコールバック、新しいパスワードの設定画面、招待登録の確認メールから招待状へ戻る導線を作成。`9bad756` を `main` にプッシュし、`https://guild.gia2018.com/guild/forgot-password` の本番表示を確認（2026-09-26）。
- 上記のコードはTypeScript、対象ファイルのESLint、既存テスト210件を通過（2026-09-26）。

## 未完了・判断が必要

1. **パスワード再設定の実配信**：本番フォームから既存アカウント宛に1通送信し、本人がメール到着とリンク先表示を確認（2026-09-26）。パスワード変更操作自体は未実施で、既存パスワードは変わっていない。
2. **再設定リンクの最後の確認**：画面公開・メール到着・リンク先表示は済み。本人が必要になった際に新しいパスワードの保存と再ログインを確認する。パスワード入力は本人が行う。
3. **初回登録の確認メール**：Supabaseの `Confirm email` は現在オフ。酒場の初回登録メールに使いたい。`gia-next` の `app/(form)/join/page.tsx` は `signUp` 後にセッションがある前提で紹介者RPC・参加申込INSERT・有料会員への遷移を実行するが、ユーザーによるとGIA本体の申込は現在使っていない。Company Noteの登録は管理APIで `email_confirm: true` のユーザーを作るため、この共通設定をオンにしてもCompany Noteから初回登録メールは送られない（ユーザーもそれを希望）。2026-09-26に管理画面で切り替えを試みたが、安全確認で保存が拒否されたため変更は**未実施**。画面上の未保存変更は取り消した。共通設定の影響を明示したユーザー承認を待ち、拒否の迂回はしない。
4. **ログイン時のメール**：ユーザーの選択により、まずは**初回登録の確認メールのみ**。毎回ログイン通知・新端末通知は実装しない。Supabase標準のSecurity notificationにはパスワード変更等があるが、毎回ログイン通知は標準テンプレートに含まれない。
5. **Stripe決済完了メール**：ユーザー承認のうえ、Gia2018のStripeダッシュボード「ビジネス → 送信メール」で「決済成功時」をオン、既定言語を日本語に変更（2026-09-26）。別タブから再読込して保存状態を確認。この設定はStripeアカウント共通。酒場とCompany Noteは同じStripeアカウントを使い、Company Noteの `membership_checkout.py` はGIAの会員価格でStripe Checkoutを作る。Stripe領収書を使い、アプリから同内容を二重送信しない。実際の受信は次回の**本番決済**で確認する。
6. **株アプリ（Company Note）**：パスワード再設定は既に `gia_identity.send_password_reset` → GIA Supabase Auth → 共通Resend SMTPを使う実装。`note.gia2018.com/**` は認証Redirect URLsに登録済み。本番フォームから指定の既存アカウント宛に1通送り、送信完了画面を確認（2026-09-26）。メール到着とリンク先は本人確認待ち。新規登録確認メールは追加しない方針。株データ用の別SupabaseへのSMTP設定は、この認証経路には不要。

## 秘密の扱い

Resend APIキーやSupabaseの管理キーはこの文書にもリポジトリにも保存しない。キーを再入力する必要があればResendで専用キーを再作成・旧キーを失効する。
